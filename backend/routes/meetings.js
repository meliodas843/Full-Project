import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function toDateTime(date, time) {
  return `${date} ${time}:00`;
}

/* =========================
   CREATE MEETING
   POST /api/meetings
========================= */
router.post("/", authMiddleware, async (req, res) => {
  const { company, date, startTime, endTime, reason, invitees } = req.body;

  if (!company || !date || !startTime) {
    return res.status(400).json({ message: "company, date, startTime are required" });
  }

  const creatorId = req.user?.id;
  if (!creatorId) return res.status(401).json({ message: "Invalid token (no user id)" });

  const startDT = toDateTime(date, startTime);
  const endDT = endTime ? toDateTime(date, endTime) : null;

  const title = company.trim();
  const description = reason?.trim() || null;

  const inviteList = Array.isArray(invitees)
    ? invitees.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // If no invitees -> personal accepted entry
    if (inviteList.length === 0) {
      const [result] = await conn.query(
        `INSERT INTO meetings
         (creator_user_id, recipient_user_id, title, description, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, 'accepted')`,
        [creatorId, creatorId, title, description, startDT, endDT]
      );

      await conn.commit();
      return res.status(201).json({ message: "Saved (personal meeting)", meetingId: result.insertId });
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

    // Create one meeting per recipient (status = pending)
    for (const email of inviteList) {
      const recipientId = foundByEmail.get(email);

      const [ins] = await conn.query(
        `INSERT INTO meetings
         (creator_user_id, recipient_user_id, title, description, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [creatorId, recipientId, title, description, startDT, endDT]
      );

      const meetingId = ins.insertId;
      createdMeetingIds.push(meetingId);

      // Notify recipient
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
   INBOX (recipient)
   GET /api/meetings/inbox
   - only requests sent TO me
========================= */
router.get("/inbox", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  try {
    const [rows] = await pool.query(
      `
      SELECT
        m.*,
        cu.email AS creator_email,
        ru.email AS recipient_email
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
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   SENT (creator)
   GET /api/meetings/sent
   - requests I sent to others
========================= */
router.get("/sent", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  try {
    const [rows] = await pool.query(
      `
      SELECT
        m.*,
        cu.email AS creator_email,
        ru.email AS recipient_email
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
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ACCEPTED (My Meetings)
   GET /api/meetings/accepted
   - accepted meetings where I am creator OR recipient
========================= */
router.get("/accepted", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  try {
    const [rows] = await pool.query(
      `
      SELECT
        m.*,
        cu.email AS creator_email,
        ru.email AS recipient_email
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
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ACCEPT
   PATCH /api/meetings/:id/accept
========================= */
router.patch("/:id/accept", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const meetingId = Number(req.params.id);
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  try {
    // Only recipient can accept
    const [result] = await pool.query(
      `UPDATE meetings
       SET status='accepted'
       WHERE id=? AND recipient_user_id=?`,
      [meetingId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Meeting not found" });

    // Mark recipient notification read
    await pool.query(
      `UPDATE notifications
       SET is_read=1
       WHERE user_id=? AND ref_id=? AND type='meeting_request'`,
      [userId, meetingId]
    );

    // Notify creator that meeting updated (recommended)
    const [[row]] = await pool.query(`SELECT creator_user_id FROM meetings WHERE id=?`, [meetingId]);
    if (row?.creator_user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_update', ?, 0)`,
        [row.creator_user_id, meetingId]
      );
    }

    res.json({ message: "Accepted" });
  } catch (err) {
    console.error("PATCH accept ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DECLINE
   PATCH /api/meetings/:id/decline
========================= */
router.patch("/:id/decline", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const meetingId = Number(req.params.id);
  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });

  try {
    const [result] = await pool.query(
      `UPDATE meetings
       SET status='declined'
       WHERE id=? AND recipient_user_id=?`,
      [meetingId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Meeting not found" });

    await pool.query(
      `UPDATE notifications
       SET is_read=1
       WHERE user_id=? AND ref_id=? AND type='meeting_request'`,
      [userId, meetingId]
    );

    const [[row]] = await pool.query(`SELECT creator_user_id FROM meetings WHERE id=?`, [meetingId]);
    if (row?.creator_user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_update', ?, 0)`,
        [row.creator_user_id, meetingId]
      );
    }

    res.json({ message: "Declined" });
  } catch (err) {
    console.error("PATCH decline ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   EDIT (reschedule)
   PATCH /api/meetings/:id/edit
   - recipient proposes new date/time -> status becomes pending
========================= */
router.patch("/:id/edit", authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const meetingId = Number(req.params.id);
  const { date, startTime, endTime } = req.body;

  if (!userId) return res.status(401).json({ message: "Invalid token (no user id)" });
  if (!date || !startTime) return res.status(400).json({ message: "date and startTime are required" });

  const startDT = `${date} ${startTime}:00`;
  const endDT = endTime ? `${date} ${endTime}:00` : null;

  try {
    const [result] = await pool.query(
      `
      UPDATE meetings
      SET start_time=?, end_time=?, status='pending'
      WHERE id=? AND recipient_user_id=?
      `,
      [startDT, endDT, meetingId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Meeting not found" });

    const [[row]] = await pool.query(`SELECT creator_user_id FROM meetings WHERE id=?`, [meetingId]);
    if (row?.creator_user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, ref_id, is_read)
         VALUES (?, 'meeting_update', ?, 0)`,
        [row.creator_user_id, meetingId]
      );
    }

    res.json({ message: "Meeting rescheduled" });
  } catch (err) {
    console.error("PATCH edit ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
