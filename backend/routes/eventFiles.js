import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "events");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function normalizeDateTime(dt) {
  if (!dt) return null;
  if (typeof dt !== "string") return dt;
  if (dt.includes("T")) return dt;
  return dt.replace(" ", "T");
}

function toMs(dt) {
  if (!dt) return NaN;
  const t = new Date(normalizeDateTime(dt)).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function isFinished(end_time) {
  if (!end_time) return false;
  const endMs = toMs(end_time);
  return Number.isFinite(endMs) && endMs < Date.now();
}

function isAllowedMime(mime) {
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  return allowed.includes(mime);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").slice(0, 10);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isAllowedMime(file.mimetype)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

function makePublicUrl(req, storedName) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host");
  return `${proto}://${host}/uploads/events/${storedName}`;
}

/* =========================================================
   NEW: GET event participants
   Returns booked users with profile info
========================================================= */
router.get("/:id/participants", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const [eventRows] = await pool.query(
      `SELECT id FROM events WHERE id = ? LIMIT 1`,
      [eventId],
    );

    if (!eventRows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url AS profile_image
      FROM event_bookings eb
      JOIN users u ON u.id = eb.user_id
      WHERE eb.event_id = ?
      ORDER BY u.first_name ASC, u.last_name ASC
      `,
      [eventId],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events/:id/participants error:", err);
    return res.status(500).json({
      message: "Server error",
      error: String(err.message || err),
    });
  }
});

/* =========================================================
   GET event files
========================================================= */
router.get("/:id/files", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const [rows] = await pool.query(
      `SELECT id, event_id, uploaded_by_email, original_name, stored_name, mime_type, size_bytes, note, created_at
       FROM event_files
       WHERE event_id = ?
       ORDER BY created_at DESC`,
      [eventId],
    );

    const files = rows.map((f) => ({
      ...f,
      url: makePublicUrl(req, f.stored_name),
    }));

    return res.json(files);
  } catch (err) {
    console.error("GET /api/events/:id/files error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   POST upload files to finished event
========================================================= */
router.post("/:id/files", authMiddleware, (req, res) => {
  upload.array("files", 10)(req, res, async (multerErr) => {
    if (multerErr) {
      console.error("MULTER ERROR:", multerErr);

      if (multerErr.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File too large (max 20MB each)" });
      }

      if (multerErr.code === "LIMIT_UNEXPECTED_FILE") {
        return res
          .status(400)
          .json({ message: "Unexpected field. Use form-data key: files" });
      }

      return res
        .status(400)
        .json({ message: multerErr.message || "Upload error" });
    }

    try {
      const eventId = Number(req.params.id);
      if (!Number.isFinite(eventId)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const userEmail = req.user?.email;
      const userId = Number(req.user?.id);

      if (!userEmail) {
        return res.status(401).json({ message: "Invalid token (no email)" });
      }

      if (!Number.isFinite(userId)) {
        return res.status(401).json({ message: "Invalid token (no user id)" });
      }

      const [evRows] = await pool.query(
        `SELECT id, end_time, created_by_email
         FROM events
         WHERE id = ?
         LIMIT 1`,
        [eventId],
      );

      if (!evRows.length) {
        return res.status(404).json({ message: "Event not found" });
      }

      const ev = evRows[0];

      if (!ev.end_time) {
        return res.status(400).json({
          message: "Event has no end_time, cannot upload as 'finished'.",
        });
      }

      if (!isFinished(ev.end_time)) {
        return res.status(400).json({
          message: "You can upload files only after the event is finished.",
        });
      }

      const isCreator =
        String(ev.created_by_email || "").toLowerCase() ===
        String(userEmail).toLowerCase();

      const [bookRows] = await pool.query(
        `SELECT 1 FROM event_bookings WHERE event_id = ? AND user_id = ? LIMIT 1`,
        [eventId, userId],
      );

      const isBooked = bookRows.length > 0;

      if (!isCreator && !isBooked) {
        return res.status(403).json({
          message: "Only event creator or booked users can upload files.",
        });
      }

      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const note = String(req.body?.note || "").slice(0, 255) || null;

      const inserted = [];

      for (const f of files) {
        const { originalname, filename, mimetype, size } = f;

        const [result] = await pool.query(
          `INSERT INTO event_files
           (event_id, uploaded_by_email, original_name, stored_name, mime_type, size_bytes, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [eventId, userEmail, originalname, filename, mimetype, size, note],
        );

        inserted.push({
          id: result.insertId,
          event_id: eventId,
          uploaded_by_email: userEmail,
          original_name: originalname,
          stored_name: filename,
          mime_type: mimetype,
          size_bytes: size,
          note,
          url: makePublicUrl(req, filename),
        });
      }

      return res.status(201).json({
        message: "Files uploaded ✅",
        files: inserted,
      });
    } catch (err) {
      console.error("POST /api/events/:id/files error:", err);

      if (String(err.message || "").includes("File type not allowed")) {
        return res.status(400).json({ message: "File type not allowed" });
      }

      return res.status(500).json({ message: "Server error" });
    }
  });
});

/* =========================================================
   DELETE event file
========================================================= */
router.delete("/:eventId/files/:fileId", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const fileId = Number(req.params.fileId);

    if (!Number.isFinite(eventId) || !Number.isFinite(fileId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ message: "Invalid token (no email)" });
    }

    const [evRows] = await pool.query(
      `SELECT id, created_by_email FROM events WHERE id = ? LIMIT 1`,
      [eventId],
    );

    if (!evRows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [fileRows] = await pool.query(
      `SELECT id, event_id, uploaded_by_email, stored_name
       FROM event_files
       WHERE id = ? AND event_id = ?
       LIMIT 1`,
      [fileId, eventId],
    );

    if (!fileRows.length) {
      return res.status(404).json({ message: "File not found" });
    }

    const ev = evRows[0];
    const file = fileRows[0];

    const isCreator =
      String(ev.created_by_email || "").toLowerCase() ===
      String(userEmail).toLowerCase();

    const isUploader =
      String(file.uploaded_by_email || "").toLowerCase() ===
      String(userEmail).toLowerCase();

    if (!isCreator && !isUploader) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete this file" });
    }

    await pool.query(`DELETE FROM event_files WHERE id = ? AND event_id = ?`, [
      fileId,
      eventId,
    ]);

    const diskPath = path.join(UPLOAD_DIR, file.stored_name);
    fs.promises.unlink(diskPath).catch(() => {});

    return res.json({ message: "File deleted ✅" });
  } catch (err) {
    console.error("DELETE file error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
