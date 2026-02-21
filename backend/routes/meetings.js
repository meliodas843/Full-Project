import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { createZoomMeeting } from "../utils/zoom.js";

const router = express.Router();

const TZ = "Asia/Ulaanbaatar";

/* =========================
   Helpers
========================= */
function toDateTime(date, time) {
  // date: YYYY-MM-DD, time: HH:MM
  return `${date} ${time}:00`;
}

// Parse MySQL DATETIME or ISO-ish string safely -> Date
function parseDBDate(dt) {
  if (!dt) return null;
  const s = String(dt).trim();
  if (!s) return null;

  // "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
  const isoLike = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(isoLike);

  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Meeting end time rule:
// - if end_time exists: use it
// - else: start_time + 30 minutes
function getEndDate(m) {
  const start = parseDBDate(m.start_time);
  if (!start) return null;

  const end = parseDBDate(m.end_time);
  if (end) return end;

  // default 30 mins
  return new Date(start.getTime() + 30 * 60 * 1000);
}

function isEnded(m, now = new Date()) {
  const end = getEndDate(m);
  if (!end) return false; // if invalid time, do not treat as ended
  return end.getTime() < now.getTime();
}

// duration in minutes for Zoom
function durationMinutes(m) {
  const start = parseDBDate(m.start_time);
  const end = parseDBDate(m.end_time);
  if (!start) return 30;
  if (!end) return 30;
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  return Math.max(15, diff || 30);
}

/**
 * ✅ Cleanup ended meetings (consistent logic)
 * Hard delete ended meetings + cleanup notifications.
 *
 * Important: This uses JS Date (server timezone) but compares with DB times by parsing.
 * That means comparisons are consistent across the app.
 */
async function cleanupEndedMeetings(conn) {
  // Pull candidates (we only need minimal columns)
  const [rows] = await conn.query(`
    SELECT id, start_time, end_time
    FROM meetings
  `);

  const now = new Date();
  const toDeleteIds = [];

  for (const m of rows) {
    const end = getEndDate(m);
    if (!end) continue;
    if (end.getTime() < now.getTime()) {
      toDeleteIds.push(m.id);
    }
  }

  if (toDeleteIds.length > 0) {
    // delete notifications first to avoid orphans
    await conn.query(
      `DELETE FROM notifications
       WHERE type IN ('meeting_request','meeting_update')
         AND ref_id IN (${toDeleteIds.map(() => "?").join(",")})`,
      toDeleteIds
    );

    await conn.query(
      `DELETE FROM meetings
       WHERE id IN (${toDeleteIds.map(() => "?").join(",")})`,
      toDeleteIds
    );
  }

  // also cleanup any orphan notifications just in case
  await conn.query(`
    DELETE n FROM notifications n
    LEFT JOIN meetings m ON m.id = n.ref_id
    WHERE n.type IN ('meeting_request','meeting_update')
      AND m.id IS NULL
  `);
}

/* =========================
   CREATE MEETING
   POST /api/meetings
========================= */
router.post("/", authMiddleware, async (req, res) => {
  const { mode, company, eventId, title, date, startTime, endTime, reason, invitees } = req.body;

  if (!date || !startTime || !reason?.trim()) {
    return res.status(400).json({ message: "date, startTime, reason are required" });
  }

  const creatorId = req.user?.id;
  if (!creatorId) return res.status(401).json({ message: "Invalid token (no user id)" });

  const m = String(mode || "").toLowerCase();
  if (m !== "event" && m !== "company") {
    return res.status(400).json({ message: "mode must be 'event' or 'company'" });
  }

  if (m === "company" && !String(company || "").trim()) {
    return res.status(400).json({ message: "company is required" });
  }

  if (m === "event") {
    const evId = Number(eventId);
    if (!Number.isFinite(evId)) {
      return res.status(400).json({ message: "eventId is required in event mode" });
    }
  }

  const startDT = toDateTime(date, startTime);
  const endDT = endTime ? toDateTime(date, endTime) : null;

  const finalTitle =
    m === "company"
      ? String(company).trim()
      : String(title || "").trim() || "Event Meeting";

  const description = reason.trim();

  const inviteList = Array.isArray(invitees)
    ? invitees.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await cleanupEndedMeetings(conn);

    // No invitees -> personal accepted (no zoom)
    if (inviteList.length === 0) {
      const [result] = await conn.query(
        `INSERT INTO meetings
         (creator_user_id, recipient_user_id, title, description, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, 'accepted')`,
        [creatorId, creatorId, finalTitle, description, startDT, endDT]
      );

      await conn.commit();
      return res.status(201).json({ message: "Saved", meetingId: result.insertId });
    }

    // Find recipients by email
    const [rows] = await conn.query(
      `SELECT id, email FROM users WHERE LOWER(email) IN (${inviteList.map(() => "?").join(",")})`,
      inviteList
    );

    const foundByEmail = new Map(rows.map((r) => [String(r.email).toLowerCase(), r.id]));
    const missing = inviteList.filter((e) => !foundByEmail.has(e));
    if (missing.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Some invitee emails do not exist", missing });
    }

    const createdMeetingIds = [];

    for (const email of inviteList) {
      const recipientId = foundByEmail.get(email);

      const [ins] = await conn.query(
        `INSERT INTO meetings
         (creator_user_id, recipient_user_id, title, description, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [creatorId, recipientId, finalTitle, description, startDT, endDT]
      );

      const meetingId = ins.insertId;
      createdMeetingIds.push(meetingId);

      await conn.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_request', ?, 0)`,
        [recipientId, meetingId]
      );
    }

    await conn.commit();
    return res.status(201).json({ message: "Meeting request(s) sent", meetingIds: createdMeetingIds });
  } catch (err) {
    await conn.rollback();
    console.error("POST /api/meetings ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

/* =========================
   INBOX
   GET /api/meetings/inbox
========================= */
router.get("/inbox", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  const conn = await pool.getConnection();
  try {
    await cleanupEndedMeetings(conn);

    const [rows] = await conn.query(
      `
      SELECT m.*, cu.email AS creator_email, ru.email AS recipient_email
      FROM meetings m
      JOIN users cu ON cu.id = m.creator_user_id
      JOIN users ru ON ru.id = m.recipient_user_id
      WHERE m.recipient_user_id = ?
      ORDER BY m.created_at DESC
      `,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/meetings/inbox ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

/* =========================
   SENT
   GET /api/meetings/sent
========================= */
router.get("/sent", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  const conn = await pool.getConnection();
  try {
    await cleanupEndedMeetings(conn);

    const [rows] = await conn.query(
      `
      SELECT m.*, cu.email AS creator_email, ru.email AS recipient_email
      FROM meetings m
      JOIN users cu ON cu.id = m.creator_user_id
      JOIN users ru ON ru.id = m.recipient_user_id
      WHERE m.creator_user_id = ?
      ORDER BY m.created_at DESC
      `,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/meetings/sent ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

/* =========================
   ACCEPTED
   GET /api/meetings/accepted
========================= */
router.get("/accepted", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  const conn = await pool.getConnection();
  try {
    await cleanupEndedMeetings(conn);

    const [rows] = await conn.query(
      `
      SELECT m.*, cu.email AS creator_email, ru.email AS recipient_email
      FROM meetings m
      JOIN users cu ON cu.id = m.creator_user_id
      JOIN users ru ON ru.id = m.recipient_user_id
      WHERE (m.creator_user_id = ? OR m.recipient_user_id = ?)
        AND m.status = 'accepted'
      ORDER BY m.start_time ASC
      `,
      [userId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/meetings/accepted ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

/* =========================
   ACCEPT (creates Zoom meeting)
   PATCH /api/meetings/:id/accept
   ✅ DOES NOT redirect. Returns zoom_join_url only.
   ✅ If meeting ended -> 410 Gone
========================= */
router.patch("/:id/accept", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const meetingId = Number(req.params.id);

  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });
  if (!Number.isFinite(meetingId)) return res.status(400).json({ message: "Invalid meeting id" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await cleanupEndedMeetings(conn);

    const [[m]] = await conn.query(
      `SELECT * FROM meetings WHERE id=? AND recipient_user_id=?`,
      [meetingId, userId]
    );

    if (!m) {
      await conn.rollback();
      return res.status(404).json({ message: "Meeting not found (maybe ended and removed)" });
    }

    // Prevent accepting/joining ended
    if (isEnded(m)) {
      // delete it now
      await conn.query(`DELETE FROM notifications WHERE ref_id=?`, [meetingId]);
      await conn.query(`DELETE FROM meetings WHERE id=?`, [meetingId]);
      await conn.commit();
      return res.status(410).json({ message: "Meeting already ended and was removed" });
    }

    // If already accepted with zoom
    if (m.status === "accepted" && m.zoom_join_url) {
      await conn.commit();
      return res.json({
        message: "Already accepted",
        zoom_join_url: m.zoom_join_url,
        zoom_meeting_id: m.zoom_meeting_id || null,
      });
    }

    const start = parseDBDate(m.start_time);
    if (!start) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid start_time in DB" });
    }

    // Zoom wants ISO string; we also pass timezone in zoom.js
    const startISO = start.toISOString();
    const duration = durationMinutes(m);

    const zoom = await createZoomMeeting({
      topic: m.title || "Meeting",
      start_time: startISO,
      duration_min: duration,
      timezone: TZ, // optional if you want to pass it through
    });

    await conn.query(
      `UPDATE meetings
       SET status='accepted',
           zoom_meeting_id=?,
           zoom_join_url=?,
           zoom_start_url=?
       WHERE id=? AND recipient_user_id=?`,
      [String(zoom.id), zoom.join_url, zoom.start_url, meetingId, userId]
    );

    await conn.query(
      `UPDATE notifications
       SET is_read=1
       WHERE user_id=? AND ref_id=? AND type='meeting_request'`,
      [userId, meetingId]
    );

    if (m.creator_user_id) {
      await conn.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_update', ?, 0)`,
        [m.creator_user_id, meetingId]
      );
    }

    await conn.commit();
    return res.json({
      message: "Accepted",
      zoom_join_url: zoom.join_url, // ✅ frontend shows Join button
      zoom_meeting_id: String(zoom.id),
    });
  } catch (err) {
    await conn.rollback();
    console.error("PATCH accept ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

/* =========================
   DECLINE
========================= */
router.patch("/:id/decline", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const meetingId = Number(req.params.id);

  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await cleanupEndedMeetings(conn);

    const [result] = await conn.query(
      `UPDATE meetings
       SET status='declined'
       WHERE id=? AND recipient_user_id=?`,
      [meetingId, userId]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Meeting not found" });
    }

    await conn.query(
      `UPDATE notifications
       SET is_read=1
       WHERE user_id=? AND ref_id=? AND type='meeting_request'`,
      [userId, meetingId]
    );

    const [[row]] = await conn.query(`SELECT creator_user_id FROM meetings WHERE id=?`, [meetingId]);
    if (row?.creator_user_id) {
      await conn.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_update', ?, 0)`,
        [row.creator_user_id, meetingId]
      );
    }

    await conn.commit();
    res.json({ message: "Declined" });
  } catch (err) {
    await conn.rollback();
    console.error("PATCH decline ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

/* =========================
   EDIT (reschedule)
========================= */
router.patch("/:id/edit", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const meetingId = Number(req.params.id);
  const { date, startTime, endTime } = req.body;

  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });
  if (!date || !startTime) return res.status(400).json({ message: "date and startTime are required" });

  const startDT = toDateTime(date, startTime);
  const endDT = endTime ? toDateTime(date, endTime) : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await cleanupEndedMeetings(conn);

    const [result] = await conn.query(
      `UPDATE meetings
       SET start_time=?, end_time=?, status='pending',
           zoom_meeting_id=NULL, zoom_join_url=NULL, zoom_start_url=NULL
       WHERE id=? AND recipient_user_id=?`,
      [startDT, endDT, meetingId, userId]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Meeting not found" });
    }

    const [[row]] = await conn.query(`SELECT creator_user_id FROM meetings WHERE id=?`, [meetingId]);
    if (row?.creator_user_id) {
      await conn.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_update', ?, 0)`,
        [row.creator_user_id, meetingId]
      );
    }

    await conn.commit();
    res.json({ message: "Meeting rescheduled" });
  } catch (err) {
    await conn.rollback();
    console.error("PATCH edit ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
