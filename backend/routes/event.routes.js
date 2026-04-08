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

function isAllowedEventCreateMime(mime) {
  const allowed = ["image/png", "image/jpeg", "image/webp"];
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
    const field = String(file.fieldname || "");

    if (field === "image" || field === "speaker_avatars") {
      if (!isAllowedEventCreateMime(file.mimetype)) {
        return cb(new Error("Only PNG, JPG, JPEG, WEBP images are allowed"));
      }
      return cb(null, true);
    }

    if (field === "files") {
      if (!isAllowedMime(file.mimetype)) {
        return cb(new Error("File type not allowed"));
      }
      return cb(null, true);
    }

    return cb(new Error(`Unexpected field: ${field}`));
  },
});

function makePublicUrl(req, storedName) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host");
  return `${proto}://${host}/uploads/events/${storedName}`;
}

function safeJsonParse(value, fallback) {
  try {
    if (value == null || value === "") return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sanitizeAgenda(rawAgenda) {
  const agenda = Array.isArray(rawAgenda) ? rawAgenda : [];
  return agenda
    .map((item) => ({
      text: String(item?.text || "").trim(),
      time: String(item?.time || "").trim(),
    }))
    .filter((item) => item.text || item.time);
}

function sanitizeSpeakers(rawSpeakers) {
  const speakers = Array.isArray(rawSpeakers) ? rawSpeakers : [];
  return speakers
    .map((sp) => ({
      name: String(sp?.name || "").trim(),
      organization: String(sp?.organization || "").trim(),
      topic: String(sp?.topic || "").trim(),
      avatar_url: String(sp?.avatar_url || "").trim(),
    }))
    .filter((sp) => sp.name || sp.organization || sp.topic || sp.avatar_url);
}

function buildSpeakerPayload(req, speakerValue, avatarFiles) {
  const parsed = safeJsonParse(speakerValue, []);
  const speakers = sanitizeSpeakers(parsed);
  let avatarIndex = 0;

  const finalSpeakers = speakers.map((sp) => {
    const nextAvatar = avatarFiles[avatarIndex];

    if (nextAvatar) {
      avatarIndex += 1;
      return {
        ...sp,
        avatar_url: `/uploads/events/${nextAvatar.filename}`,
      };
    }

    return sp;
  });

  return finalSpeakers;
}

/* =========================================================
   GET all events
========================================================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        image_url,
        start_time,
        end_time,
        created_at,
        created_by_email,
        max_participants,
        visibility,
        invite_token,
        archived,
        archived_at,
        speaker,
        agenda,
        (
          SELECT COUNT(*)
          FROM event_bookings eb
          WHERE eb.event_id = events.id
        ) AS booked_count
      FROM events
      WHERE archived = 0
      ORDER BY start_time DESC
      `,
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   POST create event
========================================================= */
router.post("/", authMiddleware, (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "speaker_avatars", maxCount: 20 },
  ])(req, res, async (multerErr) => {
    if (multerErr) {
      console.error("CREATE EVENT MULTER ERROR:", multerErr);

      if (multerErr.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File too large (max 20MB each)" });
      }

      if (multerErr.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          message:
            "Unexpected field. Use image for cover and speaker_avatars for speakers.",
        });
      }

      return res
        .status(400)
        .json({ message: multerErr.message || "Upload error" });
    }

    try {
      const {
        title,
        description,
        start_time,
        end_time,
        image_url,
        max_participants,
        visibility,
        speaker,
        agenda,
      } = req.body;

      if (!String(title || "").trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!String(start_time || "").trim()) {
        return res.status(400).json({ message: "start_time is required" });
      }

      const userEmail = req.user?.email;
      if (!userEmail) {
        return res.status(401).json({ message: "Invalid token (no email)" });
      }

      const files = req.files || {};
      const imageFile = Array.isArray(files.image) ? files.image[0] : null;
      const avatarFiles = Array.isArray(files.speaker_avatars)
        ? files.speaker_avatars
        : [];

      let finalImageUrl = String(image_url || "").trim() || null;
      if (imageFile) {
        finalImageUrl = `/uploads/events/${imageFile.filename}`;
      }

      const finalAgenda = sanitizeAgenda(safeJsonParse(agenda, []));
      const finalSpeakers = buildSpeakerPayload(req, speaker, avatarFiles);

      const finalVisibility =
        String(visibility || "").trim() === "private" ? "private" : "public";

      const inviteToken =
        finalVisibility === "private"
          ? `${Date.now().toString(36)}${Math.random()
              .toString(36)
              .slice(2, 12)}`
          : null;

      const [result] = await pool.query(
        `
        INSERT INTO events (
          title,
          description,
          image_url,
          start_time,
          end_time,
          created_by_email,
          max_participants,
          visibility,
          invite_token,
          speaker,
          agenda
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          String(title).trim(),
          String(description || "").trim() || null,
          finalImageUrl,
          normalizeDateTime(start_time),
          normalizeDateTime(end_time) || null,
          userEmail,
          Number(max_participants || 0),
          finalVisibility,
          inviteToken,
          JSON.stringify(finalSpeakers),
          JSON.stringify(finalAgenda),
        ],
      );

      const [rows] = await pool.query(
        `
        SELECT
          id,
          title,
          description,
          image_url,
          start_time,
          end_time,
          created_at,
          created_by_email,
          max_participants,
          visibility,
          invite_token,
          archived,
          archived_at,
          speaker,
          agenda
        FROM events
        WHERE id = ?
        LIMIT 1
        `,
        [result.insertId],
      );

      return res.status(201).json({
        message: "Event created ✅",
        event: rows[0],
      });
    } catch (err) {
      console.error("POST /api/events error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });
});

/* =========================================================
   GET my requests
   (events created by current user)
========================================================= */
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const userEmail = String(req.user?.email || "").trim();
    const userId = Number(req.user?.id);

    if (!userEmail || !Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.start_time,
        e.end_time,
        e.created_at,
        e.created_by_email,
        e.max_participants,
        e.visibility,
        e.invite_token,
        e.archived,
        e.archived_at,
        e.speaker,
        e.agenda,
        (
          SELECT COUNT(*)
          FROM event_bookings eb2
          WHERE eb2.event_id = e.id
        ) AS booked_count
      FROM events e
      WHERE e.created_by_email = ?
      ORDER BY e.created_at DESC
      `,
      [userEmail],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events/requests error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   GET my joined events
========================================================= */
router.get("/my-joined", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token (no user id)" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.start_time,
        e.end_time,
        e.created_at,
        e.created_by_email,
        e.max_participants,
        e.visibility,
        e.invite_token,
        e.archived,
        e.archived_at,
        e.speaker,
        e.agenda,
        (
          SELECT COUNT(*)
          FROM event_bookings eb2
          WHERE eb2.event_id = e.id
        ) AS booked_count
      FROM event_bookings eb
      JOIN events e ON e.id = eb.event_id
      WHERE eb.user_id = ? AND e.archived = 0
      ORDER BY e.start_time DESC
      `,
      [userId],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events/my-joined error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   GET my history
========================================================= */
router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const userEmail = String(req.user?.email || "").trim();

    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token (no user id)" });
    }

    if (!userEmail) {
      return res.status(401).json({ message: "Invalid token (no email)" });
    }

    const [rows] = await pool.query(
      `
      SELECT DISTINCT
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.start_time,
        e.end_time,
        e.created_at,
        e.created_by_email,
        e.max_participants,
        e.visibility,
        e.invite_token,
        e.archived,
        e.archived_at,
        e.speaker,
        e.agenda,
        (
          SELECT COUNT(*)
          FROM event_bookings eb2
          WHERE eb2.event_id = e.id
        ) AS booked_count,
        CASE
          WHEN e.created_by_email = ? THEN 'created'
          ELSE 'joined'
        END AS relation_type
      FROM events e
      LEFT JOIN event_bookings eb ON eb.event_id = e.id
      WHERE
        (
          eb.user_id = ?
          OR e.created_by_email = ?
        )
        AND e.end_time IS NOT NULL
        AND e.end_time < NOW()
      ORDER BY e.end_time DESC, e.start_time DESC
      `,
      [userEmail, userId, userEmail],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/events/my-history error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   GET my booked ids
========================================================= */
router.get("/my-bookings", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token (no user id)" });
    }

    const [rows] = await pool.query(
      `SELECT event_id FROM event_bookings WHERE user_id = ?`,
      [userId],
    );

    return res.json(
      rows.map((r) => Number(r.event_id)).filter(Number.isFinite),
    );
  } catch (err) {
    console.error("GET /api/events/my-bookings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   POST book event
========================================================= */
router.post("/:id/book", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const userId = Number(req.user?.id);

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token (no user id)" });
    }

    const [eventRows] = await pool.query(
      `
      SELECT
        id,
        title,
        max_participants,
        archived,
        (
          SELECT COUNT(*)
          FROM event_bookings eb
          WHERE eb.event_id = events.id
        ) AS booked_count
      FROM events
      WHERE id = ?
      LIMIT 1
      `,
      [eventId],
    );

    if (!eventRows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    const ev = eventRows[0];
    if (Number(ev.archived) === 1) {
      return res.status(400).json({ message: "Event is archived" });
    }

    const [alreadyRows] = await pool.query(
      `SELECT 1 FROM event_bookings WHERE event_id = ? AND user_id = ? LIMIT 1`,
      [eventId, userId],
    );

    if (alreadyRows.length) {
      return res.status(400).json({ message: "Already booked" });
    }

    const maxParticipants = Number(ev.max_participants || 0);
    const bookedCount = Number(ev.booked_count || 0);

    if (maxParticipants > 0 && bookedCount >= maxParticipants) {
      return res.status(400).json({ message: "Event is full" });
    }

    await pool.query(
      `INSERT INTO event_bookings (event_id, user_id) VALUES (?, ?)`,
      [eventId, userId],
    );

    return res.status(201).json({ message: "Booked ✅" });
  } catch (err) {
    console.error("POST /api/events/:id/book error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
   GET event participants
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
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS name,
        u.email,
        u.avatar_url
      FROM event_bookings eb
      JOIN users u ON u.id = eb.user_id
      WHERE eb.event_id = ?
      ORDER BY u.first_name ASC, u.last_name ASC
      `,
      [eventId],
    );

    return res.json({
      total_count: rows.length,
      participants: rows,
    });
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
