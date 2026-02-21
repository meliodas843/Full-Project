import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

/* =========================
   Multer: EVENT COVER IMAGE (Create Event)
========================= */
const eventImageDir = path.join(process.cwd(), "uploads", "events");
if (!fs.existsSync(eventImageDir)) fs.mkdirSync(eventImageDir, { recursive: true });

const eventImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, eventImageDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadEventImage = multer({
  storage: eventImageStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/* =========================
   Multer: AFTER EVENT FILES
========================= */
const eventFilesDir = path.join(process.cwd(), "uploads", "event-files");
if (!fs.existsSync(eventFilesDir)) fs.mkdirSync(eventFilesDir, { recursive: true });

const eventFilesStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, eventFilesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadEventFiles = multer({
  storage: eventFilesStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB each
});

/* =========================
   Helpers
========================= */
function makeInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeDateTime(dt) {
  if (!dt) return null;
  if (typeof dt !== "string") return dt;
  if (dt.includes("T")) return dt;
  return dt.replace(" ", "T");
}

function toTime(dt) {
  if (!dt) return NaN;
  const t = new Date(normalizeDateTime(dt)).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function isFinished(end_time) {
  const t = toTime(end_time);
  return Number.isFinite(t) && t < Date.now();
}

function isValidDateTime(dt) {
  const t = toTime(dt);
  return Number.isFinite(t);
}

/**
 *  Archive old events:
 */
async function archiveOldEvents() {
  try {
    await pool.query(`
      UPDATE events
      SET archived = 1,
          archived_at = NOW()
      WHERE archived = 0
        AND COALESCE(end_time, start_time) < (NOW() - INTERVAL 1 DAY)
    `);
  } catch (e) {
    console.error("archiveOldEvents error:", e?.message || e);
  }
}

/* =========================
   GET /api/events/invite/:token
========================= */
router.get("/invite/:token", async (req, res) => {
  try {
    await archiveOldEvents();

    const token = String(req.params.token || "").trim();
    if (!token || token.length < 10) {
      return res.status(400).json({ message: "Invalid invite token" });
    }

    const [rows] = await pool.query(
      `SELECT 
         e.*,
         (SELECT COUNT(*) FROM event_bookings b WHERE b.event_id = e.id) AS booked_count
       FROM events e
       WHERE e.visibility = 'private'
         AND e.invite_token = ?
         AND e.archived = 0
         AND COALESCE(e.end_time, e.start_time) >= (NOW() - INTERVAL 1 DAY)
       LIMIT 1`,
      [token]
    );

    if (!rows.length) return res.status(404).json({ message: "Invite link not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/events/invite/:token error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events
========================= */
router.get("/", async (req, res) => {
  try {
    await archiveOldEvents();

    const [rows] = await pool.query(
      `SELECT 
         e.*,
         (SELECT COUNT(*) FROM event_bookings b WHERE b.event_id = e.id) AS booked_count
       FROM events e
       WHERE e.visibility = 'public'
         AND e.archived = 0
         AND COALESCE(e.end_time, e.start_time) >= (NOW() - INTERVAL 1 DAY)
       ORDER BY e.start_time ASC`
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events/my-bookings
========================= */
router.get("/my-bookings", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: "Invalid token (no user id)" });

    const [rows] = await pool.query(`SELECT event_id FROM event_bookings WHERE user_id = ?`, [userId]);
    return res.json(rows.map((r) => Number(r.event_id)));
  } catch (err) {
    console.error("GET /api/events/my-bookings error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events/my-joined
========================= */
router.get("/my-joined", authMiddleware, async (req, res) => {
  try {
    await archiveOldEvents();

    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: "Invalid token (no user id)" });

    const [eventsRows] = await pool.query(
      `SELECT 
         e.*,
         (SELECT COUNT(*) FROM event_bookings b WHERE b.event_id = e.id) AS booked_count
       FROM event_bookings b_me
       JOIN events e ON e.id = b_me.event_id
       WHERE b_me.user_id = ?
         AND e.archived = 0
         AND COALESCE(e.end_time, e.start_time) >= (NOW() - INTERVAL 1 DAY)
       ORDER BY e.start_time DESC`,
      [userId]
    );
    const [meetingRows] = await pool.query(
      `
      SELECT
        m.id,
        m.title,
        m.description,
        m.start_time,
        m.end_time,
        NULL AS image_url,
        'meeting' AS type
      FROM meetings m
      WHERE m.recipient_user_id = ?
        AND m.status = 'accepted'
        AND COALESCE(m.end_time, m.start_time) >= (NOW() - INTERVAL 1 DAY)
      ORDER BY m.start_time DESC
      `,
      [userId]
    );

    const normalizedMeetings = meetingRows.map((m) => ({
      ...m,
      booked_count: null,
      visibility: "private",
      archived: 0,
    }));

    return res.json([...normalizedMeetings, ...eventsRows]);
  } catch (err) {
    console.error("GET /api/events/my-joined error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events/my-history
========================= */
router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: "Invalid token (no user id)" });

    const [rows] = await pool.query(
      `SELECT 
         e.*,
         (SELECT COUNT(*) FROM event_bookings b WHERE b.event_id = e.id) AS booked_count
       FROM event_bookings b_me
       JOIN events e ON e.id = b_me.event_id
       WHERE b_me.user_id = ?
         AND e.archived = 1
       ORDER BY COALESCE(e.end_time, e.start_time) DESC`,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events/my-history error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
    REQUESTS: GET /api/events/requests
========================= */
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const myId = Number(req.user?.id);
    if (!Number.isFinite(myId)) return res.status(401).json({ message: "Invalid token" });

    const [rows] = await pool.query(
      `
      SELECT
        m.id,
        m.status,
        m.title,
        m.description,
        m.start_time,
        m.end_time,
        u.company_name AS from_company,
        u.email AS from_email
      FROM meetings m
      JOIN users u ON u.id = m.creator_user_id
      WHERE m.recipient_user_id = ?
      ORDER BY m.created_at DESC
      `,
      [myId]
    );

    return res.json({
      pending: rows.filter((x) => x.status === "pending"),
      accepted: rows.filter((x) => x.status === "accepted"),
    });
  } catch (err) {
    console.error("GET /api/events/requests error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
});

/* =========================
   REQUESTS: accept / decline
========================= */
router.post("/requests/:id/accept", authMiddleware, async (req, res) => {
  try {
    const myId = Number(req.user?.id);
    const reqId = Number(req.params.id);
    if (!Number.isFinite(myId)) return res.status(401).json({ message: "Invalid token" });
    if (!Number.isFinite(reqId)) return res.status(400).json({ message: "Invalid request id" });

    const [rows] = await pool.query(`SELECT id, recipient_user_id, status FROM meetings WHERE id=? LIMIT 1`, [reqId]);
    if (!rows.length) return res.status(404).json({ message: "Request not found" });

    const m = rows[0];
    if (Number(m.recipient_user_id) !== myId) return res.status(403).json({ message: "Not your request" });
    if (m.status !== "pending") return res.status(400).json({ message: "Request already handled" });

    await pool.query(`UPDATE meetings SET status='accepted' WHERE id=?`, [reqId]);
    return res.json({ message: "Accepted ✅" });
  } catch (err) {
    console.error("POST /api/events/requests/:id/accept error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
});

router.post("/requests/:id/decline", authMiddleware, async (req, res) => {
  try {
    const myId = Number(req.user?.id);
    const reqId = Number(req.params.id);
    if (!Number.isFinite(myId)) return res.status(401).json({ message: "Invalid token" });
    if (!Number.isFinite(reqId)) return res.status(400).json({ message: "Invalid request id" });

    const [rows] = await pool.query(`SELECT id, recipient_user_id, status FROM meetings WHERE id=? LIMIT 1`, [reqId]);
    if (!rows.length) return res.status(404).json({ message: "Request not found" });

    const m = rows[0];
    if (Number(m.recipient_user_id) !== myId) return res.status(403).json({ message: "Not your request" });
    if (m.status !== "pending") return res.status(400).json({ message: "Request already handled" });

    await pool.query(`UPDATE meetings SET status='declined' WHERE id=?`, [reqId]);
    return res.json({ message: "Declined ✅" });
  } catch (err) {
    console.error("POST /api/events/requests/:id/decline error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
});
/* =========================
    GET /api/events/my-events
========================= */
router.get("/my-events", authMiddleware, async (req, res) => {
  try {
    await archiveOldEvents();

    const myEmail = String(req.user?.email || "").trim();
    if (!myEmail) return res.status(401).json({ message: "Invalid token (no email)" });

    const [rows] = await pool.query(
      `SELECT 
         e.*,
         (SELECT COUNT(*) FROM event_bookings b WHERE b.event_id = e.id) AS booked_count
       FROM events e
       WHERE e.created_by_email = ?
         AND e.archived = 0
         AND COALESCE(e.end_time, e.start_time) >= (NOW() - INTERVAL 1 DAY)
       ORDER BY e.start_time DESC`,
      [myEmail]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events/my-events error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events/:id
========================= */
router.get("/:id", async (req, res) => {
  try {
    await archiveOldEvents();

    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: "Invalid event id" });

    const [rows] = await pool.query(
      `SELECT 
         e.*,
         (SELECT COUNT(*) FROM event_bookings b WHERE b.event_id = e.id) AS booked_count
       FROM events e
       WHERE e.id = ?
         AND e.archived = 0
         AND COALESCE(e.end_time, e.start_time) >= (NOW() - INTERVAL 1 DAY)
       LIMIT 1`,
      [eventId]
    );

    if (!rows.length) return res.status(404).json({ message: "Event not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/events/:id error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events/:id/participants
========================= */
router.get("/:id/participants", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const myUserId = Number(req.user?.id);

    if (!Number.isFinite(eventId)) return res.status(400).json({ message: "Invalid event id" });
    if (!Number.isFinite(myUserId)) return res.status(401).json({ message: "Invalid token" });

    const [meJoined] = await pool.query(
      `SELECT 1 FROM event_bookings WHERE event_id=? AND user_id=? LIMIT 1`,
      [eventId, myUserId]
    );
    if (!meJoined.length) return res.status(403).json({ message: "You didn't join this event" });

    const [cntRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM event_bookings WHERE event_id=?`, [eventId]);
    const total_count = Number(cntRows?.[0]?.cnt || 0);

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.company_name,
        CONCAT_WS(' ', u.first_name, u.last_name) AS full_name
      FROM event_bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.event_id = ?
      ORDER BY b.created_at DESC
      `,
      [eventId]
    );

    return res.json({
      total_count,
      participants: rows.map((r) => ({
        id: r.id,
        email: r.email,
        company_name: r.company_name || null,
        name: r.full_name?.trim() ? r.full_name.trim() : r.email,
      })),
    });
  } catch (err) {
    console.error("GET /api/events/:id/participants error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /api/events (create)
========================= */
router.post("/", authMiddleware, uploadEventImage.single("image"), async (req, res) => {
  try {
    const userEmail = String(req.user?.email || "").trim();
    const userId = Number(req.user?.id);

    if (!userEmail) return res.status(401).json({ message: "Invalid token (no email)" });
    if (!Number.isFinite(userId)) return res.status(401).json({ message: "Invalid token (no user id)" });

    const {
      title,
      description = "",
      start_time,
      end_time = null,
      image_url = "",
      max_participants = 0,
      visibility = "public",
    } = req.body;

    if (!title?.trim() || !start_time) return res.status(400).json({ message: "Title and start_time are required" });
    if (!isValidDateTime(start_time)) return res.status(400).json({ message: "start_time is not a valid datetime" });
    if (end_time && !isValidDateTime(end_time)) return res.status(400).json({ message: "end_time is not a valid datetime" });

    if (end_time) {
      const s = toTime(start_time);
      const e = toTime(end_time);
      if (Number.isFinite(s) && Number.isFinite(e) && e <= s) {
        return res.status(400).json({ message: "end_time must be after start_time" });
      }
    }

    const max = Number(max_participants);
    if (!Number.isFinite(max) || max < 0) return res.status(400).json({ message: "max_participants must be >= 0" });

    const vis = visibility === "private" ? "private" : "public";
    const invite_token = vis === "private" ? makeInviteToken() : null;

    const uploadedPath = req.file ? `/uploads/events/${req.file.filename}` : "";
    const finalImageUrl = uploadedPath || String(image_url || "").trim();

    const [result] = await pool.query(
      `INSERT INTO events
        (title, description, image_url, start_time, end_time, created_by_email, max_participants, visibility, invite_token, archived, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [title.trim(), String(description || "").trim(), finalImageUrl, start_time, end_time || null, userEmail, max, vis, invite_token]
    );

    const createdId = Number(result.insertId);

    // auto join creator
    try {
      await pool.query(`INSERT INTO event_bookings (event_id, user_id) VALUES (?, ?)`, [createdId, userId]);
    } catch (e) {
      if (e?.code !== "ER_DUP_ENTRY") throw e;
    }

    const [rows] = await pool.query(`SELECT * FROM events WHERE id = ? LIMIT 1`, [createdId]);

    return res.status(201).json({
      message: "Event created ✅",
      event: rows[0],
      invite_link: invite_token ? `/event/invite/${invite_token}` : null,
    });
  } catch (err) {
    console.error("POST /api/events error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /api/events/:id/book
========================= */
router.post("/:id/book", authMiddleware, async (req, res) => {
  try {
    await archiveOldEvents();

    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: "Invalid token (no user id)" });

    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: "Invalid event id" });

    const [evRows] = await pool.query(
      `SELECT id, end_time, max_participants, archived FROM events WHERE id = ? LIMIT 1`,
      [eventId]
    );
    if (!evRows.length) return res.status(404).json({ message: "Event not found" });

    const ev = evRows[0];
    if (Number(ev.archived) === 1) return res.status(400).json({ message: "This event is archived." });
    if (isFinished(ev.end_time)) return res.status(400).json({ message: "This event is already finished." });

    const max = Number(ev.max_participants) || 0;
    if (max > 0) {
      const [countRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM event_bookings WHERE event_id = ?`, [eventId]);
      const bookedCount = Number(countRows?.[0]?.cnt || 0);
      if (bookedCount >= max) return res.status(400).json({ message: "Event is full." });
    }

    try {
      await pool.query(`INSERT INTO event_bookings (event_id, user_id) VALUES (?, ?)`, [eventId, userId]);
    } catch (e) {
      if (e?.code === "ER_DUP_ENTRY") return res.status(200).json({ message: "Already booked ✅" });
      throw e;
    }

    return res.status(201).json({ message: "Booked ✅" });
  } catch (err) {
    console.error("POST /api/events/:id/book error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /api/events/:id/files
========================= */
router.get("/:id/files", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const myUserId = Number(req.user?.id);

    if (!Number.isFinite(eventId)) return res.status(400).json({ message: "Invalid event id" });
    if (!Number.isFinite(myUserId)) return res.status(401).json({ message: "Invalid token" });

    const [meJoined] = await pool.query(
      `SELECT 1 FROM event_bookings WHERE event_id=? AND user_id=? LIMIT 1`,
      [eventId, myUserId]
    );
    if (!meJoined.length) return res.status(403).json({ message: "You didn't join this event" });

    const [rows] = await pool.query(
      `SELECT
        id,
        event_id,
        uploaded_by_email,
        original_name,
        stored_name,
        mime_type,
        size_bytes,
        note,
        created_at
      FROM event_files
      WHERE event_id = ?
      ORDER BY id DESC`,
      [eventId]
    );

    const withUrl = rows.map((r) => ({
      ...r,
      url: `/uploads/event-files/${r.stored_name}`,
    }));

    return res.json(withUrl);
  } catch (err) {
    console.error("GET /api/events/:id/files error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
    POST /api/events/:id/files
========================= */
router.post("/:id/files", authMiddleware, uploadEventFiles.array("files", 20), async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const myUserId = Number(req.user?.id);
    const myEmail = String(req.user?.email || "").trim();
    const note = String(req.body?.note || "").trim() || null;

    if (!Number.isFinite(eventId)) return res.status(400).json({ message: "Invalid event id" });
    if (!Number.isFinite(myUserId)) return res.status(401).json({ message: "Invalid token" });
    if (!myEmail) return res.status(401).json({ message: "Invalid token (no email)" });

    const [meJoined] = await pool.query(
      `SELECT 1 FROM event_bookings WHERE event_id=? AND user_id=? LIMIT 1`,
      [eventId, myUserId]
    );
    if (!meJoined.length) return res.status(403).json({ message: "You didn't join this event" });

    const [evRows] = await pool.query(`SELECT end_time FROM events WHERE id=? LIMIT 1`, [eventId]);
    if (!evRows.length) return res.status(404).json({ message: "Event not found" });
    if (!isFinished(evRows[0].end_time)) {
      return res.status(400).json({ message: "Upload only after event finished." });
    }

    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No files uploaded" });
    //  Insert rows matching your DB schema
    const placeholders = req.files.map(() => `(?,?,?,?,?,?,?,NOW())`).join(",");
    const params = [];

    for (const f of req.files) {
      params.push(
        eventId,
        myEmail,
        f.originalname,
        f.filename,           
        f.mimetype || null,
        Number(f.size) || 0, 
        note                 
      );
    }

    await pool.query(
      `INSERT INTO event_files
        (event_id, uploaded_by_email, original_name, stored_name, mime_type, size_bytes, note, created_at)
       VALUES ${placeholders}`,
      params
    );

    return res.json({ message: "Files uploaded ✅", saved_note: note });
  } catch (err) {
    console.error("POST /api/events/:id/files error:", err.message);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
});

export default router;
