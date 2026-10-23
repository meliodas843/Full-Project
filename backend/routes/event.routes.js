import fs from "fs";
import { getEventAccess } from "../utils/eventAccess.js";
import { logAudit } from "../utils/audit.js";
import { feeApplies, feeReference, loadSettings, requirePublishFee } from "../utils/payments.js";
import { imageExtension, uploadError } from "../utils/uploadSafety.js";

import path from "path";

import express from "express";

import crypto from "node:crypto";

import { sendEventTicketEmail } from "../utils/eventTicketEmail.js";

import multer from "multer";

import pool from "../db.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const DEFAULT_EVENT_COVERS = [
  "/registra-default-images/event-covers/event-cover-data.svg",

  "/registra-default-images/event-covers/event-cover-general.svg",

  "/registra-default-images/event-covers/event-cover-security.svg",

  "/registra-default-images/event-covers/event-cover-ai.svg",

  "/registra-default-images/event-covers/event-cover-devops.svg",

  "/registra-default-images/event-covers/event-cover-cloud.svg",
];

function randomDefaultEventCover() {
  return DEFAULT_EVENT_COVERS[
    Math.floor(Math.random() * DEFAULT_EVENT_COVERS.length)
  ];
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "events");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function normalizeDateTime(dt) {
  if (!dt) return null;

  if (typeof dt !== "string") return dt;

  return dt.trim().replace("T", " ").slice(0, 19);
}

function newTicketCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const segment = () =>
    Array.from(
      { length: 3 },

      () => alphabet[crypto.randomInt(alphabet.length)],
    ).join("");

  return `${segment()}-${segment()}-${segment()}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dbDateTimeToLocalString(value) {
  if (!value) return value;

  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(
      value.getUTCDate(),
    )} ${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(
      value.getUTCSeconds(),
    )}`;
  }

  return String(value).trim().replace("T", " ").replace(/Z$/, "").slice(0, 19);
}

function normalizeEventDateFields(row) {
  if (!row || typeof row !== "object") return row;

  return {
    ...row,

    start_time: dbDateTimeToLocalString(row.start_time),

    end_time: dbDateTimeToLocalString(row.end_time),

    created_at: dbDateTimeToLocalString(row.created_at),

    archived_at: dbDateTimeToLocalString(row.archived_at),

    finished_at: dbDateTimeToLocalString(row.finished_at),

    original_created_at: dbDateTimeToLocalString(row.original_created_at),
  };
}

function normalizeEventRows(rows) {
  return Array.isArray(rows) ? rows.map(normalizeEventDateFields) : [];
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

// Runs from a 1-minute timer and from several list endpoints; skip repeat
// runs within 30 seconds so busy pages don't each start a locking transaction.
const ARCHIVE_MIN_INTERVAL_MS = 30 * 1000;
let lastArchiveRun = 0;

async function archiveExpiredEvents(conn = pool) {
  if (Date.now() - lastArchiveRun < ARCHIVE_MIN_INTERVAL_MS) return;

  lastArchiveRun = Date.now();

  const connection = await conn.getConnection();

  try {
    await connection.beginTransaction();

    const [expiredEvents] = await connection.query(`

      SELECT id

      FROM events

      WHERE archived = 0

        AND COALESCE(end_time, start_time) IS NOT NULL

        AND COALESCE(end_time, start_time) <= DATE_SUB(NOW(), INTERVAL 24 HOUR)

      FOR UPDATE

    `);

    if (!expiredEvents.length) {
      await connection.commit();

      return;
    }

    const eventIds = expiredEvents.map((event) => Number(event.id));

    const placeholders = eventIds.map(() => "?").join(",");

    await connection.query(
      `

      INSERT IGNORE INTO finished_event (

        original_event_id,

        title,

        description,

        image_url,

        start_time,

        end_time,

        created_by_email,

        max_participants,

        visibility,

        speaker,

        agenda,

        original_created_at,

        finished_at

      )

      SELECT

        e.id,

        e.title,

        e.description,

        e.image_url,

        e.start_time,

        e.end_time,

        e.created_by_email,

        e.max_participants,

        e.visibility,

        e.speaker,

        e.agenda,

        e.created_at,

        NOW()

      FROM events e

      WHERE e.id IN (${placeholders})

      `,

      eventIds,
    );

    await connection.query(
      `

      INSERT IGNORE INTO finished_event_participants (

        original_event_id,

        user_id,

        email,

        first_name,

        last_name,

        company_name,

        avatar_url,

        archived_at

      )

      SELECT DISTINCT

        e.id,

        u.id,

        u.email,

        u.first_name,

        u.last_name,

        u.company_name,

        u.avatar_url,

        NOW()

      FROM events e

      JOIN event_bookings eb ON eb.event_id = e.id

    JOIN users u ON u.id = eb.user_id

      WHERE e.id IN (${placeholders})
        AND LOWER(u.email) <> LOWER(e.created_by_email)

      `,

      eventIds,
    );

    // Keep the original rows: finished events are only flagged, never
    // deleted, so their bookings and every column stay in the database.
    await connection.query(
      `

      UPDATE events

      SET archived = 1,

          archived_at = COALESCE(archived_at, NOW())

      WHERE id IN (${placeholders})

      `,

      eventIds,
    );

    await connection.commit();

    logAudit(null, {
      type: "system",
      action: "Дууссан эвэнтүүдийг архивласан",
      target: `${eventIds.length} эвэнт`,
      details: { event_ids: eventIds.slice(0, 50) },
    });
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

let finishedEventSyncRunning = false;

async function runFinishedEventSync() {
  if (finishedEventSyncRunning) return;

  finishedEventSyncRunning = true;

  try {
    await archiveExpiredEvents(pool);
  } catch (error) {
    console.error("FINISHED EVENT SYNC ERROR:", error);
  } finally {
    finishedEventSyncRunning = false;
  }
}

setTimeout(runFinishedEventSync, 5000).unref?.();

setInterval(runFinishedEventSync, 60 * 1000).unref?.();

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
    const field = String(file.fieldname || "");

    const ext =
      field === "image" || field === "speaker_avatars"
        ? imageExtension(file.mimetype)
        : path.extname(file.originalname || "").slice(0, 10);

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, unique);
  },
});

const upload = multer({
  storage,

  limits: { fileSize: 50 * 1024 * 1024 },

  fileFilter: (req, file, cb) => {
    const field = String(file.fieldname || "");

    if (field === "image" || field === "speaker_avatars") {
      if (!isAllowedEventCreateMime(file.mimetype)) {
        return cb(uploadError("Only PNG, JPG, JPEG, WEBP images are allowed"));
      }

      return cb(null, true);
    }

    if (field === "files") {
      if (!isAllowedMime(file.mimetype)) {
        return cb(uploadError("File type not allowed"));
      }

      return cb(null, true);
    }

    return cb(uploadError(`Unexpected field: ${field}`));
  },
});

function safeJsonParse(value, fallback) {
  try {
    if (value == null || value === "") return fallback;

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getAuthUserId(req) {
  let userId = Number(req.user?.id);

  if (Number.isFinite(userId)) return userId;

  const email = String(req.user?.email || "")
    .trim()

    .toLowerCase();

  if (!email) return null;

  const [[u]] = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`,

    [email],
  );

  return u?.id ? Number(u.id) : null;
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

router.get(
  "/:id",

  (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return next("route");
    }

    next();
  },

  async (req, res, next) => {
    try {
      const eventId = Number(req.params.id);

      if (!Number.isSafeInteger(eventId) || eventId <= 0) {
        return res.status(400).json({
          message: "Эвентийн ID буруу байна.",
        });
      }

      const [rows] = await pool.query(
        `

      SELECT

        id,

        title,

        description,

        category,

        image_url,

        start_time,

        end_time,

        created_by_email,

        max_participants,

        visibility,

        archived,

        speaker,

        agenda

      FROM events

      WHERE id = ?

        AND archived = 0

        AND visibility = 'public'

        AND (status IS NULL OR status = 'published')

      LIMIT 1

      `,

        [eventId],
      );

      if (!rows.length) {
        return res.status(404).json({
          message: "Эвент олдсонгүй.",
        });
      }

      return res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `

      SELECT

        id,

        title,

        description,

        category,

        image_url,

        start_time,

        end_time,

        created_at,

        created_by_email,

        max_participants,

        visibility,

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

        AND visibility = 'public'

        AND (status IS NULL OR status = 'published')

      ORDER BY start_time DESC

      `,
    );

    return res.json(normalizeEventRows(rows));
  } catch (err) {
    console.error("GET /api/events error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

router.put("/:id", authMiddleware, (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },

    { name: "speaker_avatars", maxCount: 20 },
  ])(req, res, async (multerErr) => {
    if (multerErr) {
      console.error("UPDATE EVENT MULTER ERROR:", multerErr);

      return res.status(400).json({
        message: multerErr.message || "Upload error",
      });
    }

    try {
      const eventId = Number(req.params.id);

      const userEmail = String(req.user?.email || "")
        .trim()

        .toLowerCase();

      if (!Number.isFinite(eventId)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      if (!userEmail) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const [rows] = await pool.query(
        "SELECT * FROM events WHERE id = ? LIMIT 1",

        [eventId],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Event not found" });
      }

      const event = rows[0];

      if (isFinished(event.end_time)) {
        return res.status(400).json({
          message: "Дууссан эвэнтийг засах боломжгүй.",
        });
      }

      if (String(event.created_by_email || "").toLowerCase() !== userEmail) {
        return res.status(403).json({
          message: "Та зөвхөн өөрийн үүсгэсэн эвентийг засах боломжтой.",
        });
      }

      const {
        title,

        description,

        category,

        speaker,

        agenda,

        start_time,

        end_time,

        image_url,

        max_participants,

        visibility,
      } = req.body;

      if (!String(title || "").trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!String(start_time || "").trim()) {
        return res.status(400).json({ message: "start_time is required" });
      }

      const files = req.files || {};

      const imageFile = Array.isArray(files.image) ? files.image[0] : null;

      const avatarFiles = Array.isArray(files.speaker_avatars)
        ? files.speaker_avatars
        : [];

      const finalImageUrl = imageFile
        ? `/uploads/events/${imageFile.filename}`
        : String(image_url || "").trim() ||
          event.image_url ||
          randomDefaultEventCover();

      const finalAgenda = sanitizeAgenda(safeJsonParse(agenda, []));

      const finalSpeakers = buildSpeakerPayload(req, speaker, avatarFiles);

      await pool.query(
        `

        UPDATE events

        SET

          title = ?,

          description = ?,

          category = ?,

          speaker = ?,

          agenda = ?,

          start_time = ?,

          end_time = ?,

          image_url = ?,

          max_participants = ?,

          visibility = ?

        WHERE id = ?

        `,

        [
          String(title).trim(),

          String(description || "").trim() || null,

          String(category || "").trim() || null,

          JSON.stringify(finalSpeakers),

          JSON.stringify(finalAgenda),

          normalizeDateTime(start_time),

          normalizeDateTime(end_time) || null,

          finalImageUrl,

          Number(max_participants || 0),

          String(visibility || "").trim() === "private" ? "private" : "public",

          eventId,
        ],
      );

      const [updatedRows] = await pool.query(
        "SELECT * FROM events WHERE id = ? LIMIT 1",

        [eventId],
      );

      logAudit(req, { type: "update", action: "Эвэнт зассан", target: updatedRows[0]?.title, targetDetail: `#${eventId}` });
      return res.json({
        message: "Event updated successfully ✅",

        event: normalizeEventDateFields(updatedRows[0]),
      });
    } catch (err) {
      console.error("UPDATE EVENT ERROR:", err);

      return res.status(500).json({
        message: "Failed to update event",

        error: err.message,
      });
    }
  });
});

router.post("/", authMiddleware, (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },

    { name: "speaker_avatars", maxCount: 20 },
  ])(req, res, async (multerErr) => {
    if (multerErr) {
      console.error("CREATE EVENT MULTER ERROR:", multerErr);

      if (multerErr.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large" });
      }

      return res.status(400).json({
        message: multerErr.message || "Upload error",
      });
    }

    try {
      const {
        title,

        description,

        category,

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

      const creatorId = await getAuthUserId(req);

      if (!Number.isFinite(creatorId)) {
        return res.status(401).json({ message: "Invalid token user" });
      }

      const files = req.files || {};

      const imageFile = Array.isArray(files.image) ? files.image[0] : null;

      const avatarFiles = Array.isArray(files.speaker_avatars)
        ? files.speaker_avatars
        : [];

      let finalImageUrl =
        String(image_url || "").trim() || randomDefaultEventCover();

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

          category,

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

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

        `,

        [
          String(title).trim(),

          String(description || "").trim() || null,

          String(category || "").trim() || null,

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

      const eventId = result.insertId;

      // Publish fee: the event stays hidden (status 'pending_payment') until a
      // super admin confirms the organizer's bank transfer.
      const paymentSettings = await loadSettings();
      let payment = null;

      if (feeApplies(paymentSettings)) {
        const [[organization]] = await pool.query("SELECT id FROM organizations WHERE user_id = ? LIMIT 1", [
          req.user?.id,
        ]);
        await requirePublishFee(pool, {
          eventId,
          userId: req.user?.id,
          organizationId: organization?.id || null,
          settings: paymentSettings,
        });
        payment = { required: true, reference: feeReference(eventId), amount: paymentSettings.publishFee };
      }

      const [rows] = await pool.query(
        `

        SELECT

          id,

          title,

          description,

          category,

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

        WHERE id = ?

        LIMIT 1

        `,

        [eventId],
      );

      logAudit(req, { type: "create", action: "Эвэнт үүсгэсэн", target: rows[0]?.title, targetDetail: `#${eventId}` });
      return res.status(201).json({
        message: "Event created ✅",

        event: normalizeEventDateFields(rows[0]),

        payment,
      });
    } catch (err) {
      console.error("POST /api/events error:", err);

      return res.status(500).json({
        message: "Server error",

        error: err.message,

        sql: err.sqlMessage || null,
      });
    }
  });
});

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

      WHERE LOWER(e.created_by_email) = LOWER(?)

        AND e.archived = 0

      ORDER BY e.created_at DESC

      `,

      [userEmail],
    );

    return res.json(normalizeEventRows(rows));
  } catch (err) {
    console.error("GET /api/events/requests error:", err);

    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/requests/:id", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const userEmail = String(req.user?.email || "")
      .trim()

      .toLowerCase();

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    if (!userEmail) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const [rows] = await pool.query(
      `

      SELECT id, created_by_email

      FROM events

      WHERE id = ?

        AND LOWER(created_by_email) = ?

      LIMIT 1

      `,

      [eventId, userEmail],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Notification not found or not allowed",
      });
    }

    await pool.query(
      `

      UPDATE events

      SET archived = 1,

          archived_at = NOW()

      WHERE id = ?

        AND LOWER(created_by_email) = ?

      `,

      [eventId, userEmail],
    );

    return res.json({
      success: true,

      message: "Notification deleted",

      id: eventId,
    });
  } catch (err) {
    console.error("DELETE /api/events/requests/:id error:", err);

    return res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
});



async function getArchivedEventsForUser(
  userId,
  userEmail,
  onlyCreated = false,
) {

  const [rows] = await pool.query(
    `

    SELECT f.original_event_id AS id, f.title, f.description, f.image_url,

           f.start_time, f.end_time, f.original_created_at AS created_at,

           f.created_by_email, f.max_participants, f.visibility,

           f.speaker, f.agenda, f.finished_at AS archived_at,

           1 AS archived, 1 AS is_finished,

           (SELECT COUNT(*) FROM finished_event_participants fp2

            WHERE fp2.original_event_id = f.original_event_id) AS booked_count,

           CASE WHEN LOWER(f.created_by_email) = ? THEN 'created'

                ELSE 'joined' END AS relation_type

    FROM finished_event f

    WHERE f.deleted_at IS NULL

      AND (LOWER(f.created_by_email) = ?

       ${
         onlyCreated
           ? ""
           : `OR EXISTS (

          SELECT 1 FROM finished_event_participants fp

          WHERE fp.original_event_id = f.original_event_id AND fp.user_id = ?

       )`
       })

    ORDER BY f.end_time DESC

  `,
    onlyCreated ? [userEmail, userEmail] : [userEmail, userEmail, userId],
  );

  return normalizeEventRows(rows);
}

function mergeEventHistory(active, archived) {
  const seen = new Set();

  return [...active, ...archived]
    .filter((e) => {
      const id = Number(e.id);

      if (seen.has(id)) return false;

      seen.add(id);

      return true;
    })
    .sort((a, b) =>
      String(b.start_time || "").localeCompare(String(a.start_time || "")),
    );
}

router.get("/my-joined", authMiddleware, async (req, res) => {
  try {
    await archiveExpiredEvents(pool);

    const userId = await getAuthUserId(req);

    const userEmail = String(req.user?.email || "")
      .trim()

      .toLowerCase();

    if (!Number.isFinite(userId) || !userEmail) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const includeFinished =
      String(req.query.includeFinished || "1") !== "0" &&
      String(req.query.includeFinished || "true").toLowerCase() !== "false";

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

          WHEN LOWER(e.created_by_email) = ? THEN 'created'

          ELSE 'joined'

        END AS relation_type

      FROM events e

      LEFT JOIN event_bookings eb ON eb.event_id = e.id

      WHERE e.archived = 0

        AND (

          LOWER(e.created_by_email) = ?

          OR eb.user_id = ?

        )

        AND (

          COALESCE(e.end_time, e.start_time) > NOW()

          OR (

            ? = 1

            AND COALESCE(e.end_time, e.start_time) <= NOW()

          )

        )

      ORDER BY e.start_time DESC

      `,

      [userEmail, userEmail, userId, includeFinished ? 1 : 0],
    );

    const archived = includeFinished
      ? await getArchivedEventsForUser(userId, userEmail)
      : [];

    return res.json(mergeEventHistory(normalizeEventRows(rows), archived));
  } catch (err) {
    console.error("GET /api/events/my-joined error:", err);

    return res.status(500).json({
      message: "Server error",

      error: err.message,

      sql: err.sqlMessage || null,
    });
  }
});

router.get("/my-events", authMiddleware, async (req, res) => {
  try {
    await archiveExpiredEvents(pool);

    const userEmail = String(req.user?.email || "")
      .trim()

      .toLowerCase();

    if (!userEmail) {
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

        e.status,

        (SELECT f.status FROM publish_fees f WHERE f.event_id = e.id) AS fee_status,

        (

          SELECT COUNT(*)

          FROM event_bookings eb

          WHERE eb.event_id = e.id

        ) AS booked_count

      FROM events e

      WHERE LOWER(e.created_by_email) = ?

        AND e.archived = 0

      ORDER BY e.start_time DESC

      `,

      [userEmail],
    );

    const archived = await getArchivedEventsForUser(null, userEmail, true);

    return res.json(mergeEventHistory(normalizeEventRows(rows), archived));
  } catch (err) {
    console.error("GET /api/events/my-events error:", err);

    return res

      .status(500)

      .json({ message: "Server error", error: err.message });
  }
});

router.get("/my-bookings", authMiddleware, async (req, res) => {
  try {
    const userId = await getAuthUserId(req);

    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    const [rows] = await pool.query(
      `SELECT event_id FROM event_bookings WHERE user_id = ?`,

      [userId],
    );

    return res.json(rows.map((r) => Number(r.event_id)));
  } catch (err) {
    console.error("GET /api/events/my-bookings error:", err);

    return res

      .status(500)

      .json({ message: "Server error", error: err.message });
  }
});

router.post("/:id/book", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const userId = await getAuthUserId(req);

    if (!Number.isSafeInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    const [[event]] = await pool.query(
      `SELECT

         id,

         title,

         start_time,

         end_time,

         max_participants,

         archived,

         visibility,

         status,

         (SELECT COUNT(*)

          FROM event_bookings

          WHERE event_id = events.id) AS booked_count

       FROM events

       WHERE id = ?

       LIMIT 1`,

      [eventId],
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Events waiting for the publish fee aren't open for registration yet.
    if (event.status && event.status !== "published") {
      return res.status(400).json({ message: "Энэ эвэнт хараахан нийтлэгдээгүй байна." });
    }

    const [[existing]] = await pool.query(
      `SELECT user_id

       FROM event_bookings

       WHERE event_id = ? AND user_id = ?

       LIMIT 1`,

      [eventId, userId],
    );

    if (existing) {
      return res.json({
        message: "Already booked",

        already_booked: true,
      });
    }

    if (Number(event.archived) === 1) {
      return res.status(400).json({ message: "Event is archived" });
    }

    if (event.visibility !== "public") {
      return res.status(403).json({
        message: "This event requires an invitation",
      });
    }

    if (event.end_time && new Date(event.end_time).getTime() <= Date.now()) {
      return res.status(400).json({
        message: "Эвент дууссан байна.",
      });
    }

    const maxParticipants = Number(event.max_participants || 0);

    const bookedCount = Number(event.booked_count || 0);

    if (maxParticipants > 0 && bookedCount >= maxParticipants) {
      return res.status(400).json({ message: "Event is full" });
    }

    const [bookingResult] = await pool.query(
      `INSERT IGNORE INTO event_bookings (event_id, user_id)

       VALUES (?, ?)`,

      [eventId, userId],
    );

    if (bookingResult.affectedRows === 0) {
      return res.json({
        message: "Already booked",

        already_booked: true,
      });
    }

    let emailSent = false;

    try {
      const [[user]] = await pool.query(
        `SELECT email, first_name

         FROM users

         WHERE id = ?

         LIMIT 1`,

        [userId],
      );

      const ticketCode = newTicketCode();

      await pool.query(
        `INSERT INTO event_checkins

           (event_id, user_id, ticket_code)

         VALUES (?, ?, ?)

         ON DUPLICATE KEY UPDATE id = id`,

        [eventId, userId, ticketCode],
      );

      const [[ticket]] = await pool.query(
        `SELECT ticket_code

         FROM event_checkins

         WHERE event_id = ? AND user_id = ?

         LIMIT 1`,

        [eventId, userId],
      );

      if (!ticket?.ticket_code) {
        throw new Error("Ticket code not found");
      }

      if (user?.email) {
        await sendEventTicketEmail({
          to: user.email,

          firstName: user.first_name,

          eventId,

          eventTitle: event.title,

          startTime: event.start_time,

          endTime: event.end_time,

          ticketCode: ticket.ticket_code,
        });

        emailSent = true;
      }
    } catch (emailError) {
      console.error("EVENT TICKET EMAIL ERROR:", emailError);
    }

    logAudit(req, { type: "create", action: "Эвэнтэд бүртгүүлсэн", target: event.title, targetDetail: `#${eventId}` });
    return res.status(201).json({
      message: "Booked",

      already_booked: false,

      email_sent: emailSent,
    });
  } catch (error) {
    console.error("EVENT BOOKING ERROR:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

router.get("/:id/participants", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    // Names and emails are only for the creator and people who joined.
    // Others browsing a public event still get the count.
    const access = await getEventAccess(pool, eventId, req.user);

    if (!access.exists) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!access.isMember && !access.isPublic) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const visible = (list) => (access.isMember ? list : []);

    const [rows] = await pool.query(
      `

      SELECT DISTINCT

        u.id,

        u.email,

        u.first_name,

        u.last_name,

        u.company_name,

        u.avatar_url,

        TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS name

      FROM events e

      JOIN users u

        ON LOWER(u.email) = LOWER(e.created_by_email)

        OR u.id IN (

          SELECT eb.user_id

          FROM event_bookings eb

          WHERE eb.event_id = e.id

        )

      WHERE e.id = ?

      `,

      [eventId],
    );

    if (rows.length) {
      return res.json({
        participants: visible(rows),

        total_count: rows.length,
      });
    }


    const [archivedRows] = await pool.query(
      `

      SELECT

        user_id AS id,

        email,

        first_name,

        last_name,

        company_name,

        avatar_url,

        TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS name

      FROM finished_event_participants

      WHERE original_event_id = ?

      ORDER BY id ASC

      `,

      [eventId],
    );

    return res.json({
      participants: visible(archivedRows),

      total_count: archivedRows.length,
    });
  } catch (err) {
    return res

      .status(500)

      .json({ message: "Server error", error: err.message });
  }
});

router.post("/:id/join-request", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const userId = req.user?.id;

    const [[event]] = await pool.query(
      `

      SELECT id, title, created_by_email

      FROM events

      WHERE id = ?

      LIMIT 1

      `,

      [eventId],
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [[creator]] = await pool.query(
      `

      SELECT id

      FROM users

      WHERE LOWER(email) = LOWER(?)

      LIMIT 1

      `,

      [event.created_by_email],
    );

    if (!creator) {
      return res.status(400).json({
        message: "Event creator user not found by created_by_email",
      });
    }

    const creatorId = creator.id;

    if (Number(creatorId) === Number(userId)) {
      return res.status(400).json({
        message: "You cannot request your own event",
      });
    }

    const [[exists]] = await pool.query(
      `

      SELECT id

      FROM meetings

      WHERE event_id = ?

        AND creator_user_id = ?

        AND recipient_user_id = ?

        AND status = 'pending'

      LIMIT 1

      `,

      [eventId, userId, creatorId],
    );

    if (exists) {
      return res.status(400).json({
        message: "Request already sent",
      });
    }

    const [[sender]] = await pool.query(
      `

      SELECT email, first_name, last_name

      FROM users

      WHERE id = ?

      LIMIT 1

      `,

      [userId],
    );

    const senderName =
      `${sender?.first_name || ""} ${sender?.last_name || ""}`.trim() ||
      sender?.email ||
      "User";

    const [result] = await pool.query(
      `

      INSERT INTO meetings

        (

          creator_user_id,

          recipient_user_id,

          title,

          description,

          start_time,

          end_time,

          status,

          event_id,

          request_type

        )

      VALUES

        (?, ?, ?, ?, NOW(), NULL, 'pending', ?, 'event_join')

      `,

      [
        userId,

        creatorId,

        event.title || "Эвентэд нэгдэх хүсэлт",

        `${senderName} эвентэд нэгдэхийг хүсэж байна: ${event.title}`,

        eventId,
      ],
    );

    res.status(201).json({
      message: "Join request sent",

      meetingId: result.insertId,
    });
  } catch (err) {
    console.error("POST /api/events/:id/join-request ERROR:", err);

    res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
});

router.patch("/:id/accept", authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const requestId = Number(req.params.id);

    const currentUserId = await getAuthUserId(req);

    if (!Number.isFinite(requestId)) {
      await conn.rollback();

      return res.status(400).json({ message: "Invalid request id" });
    }

    if (!Number.isFinite(currentUserId)) {
      await conn.rollback();

      return res.status(401).json({ message: "Invalid token user" });
    }

    const [[meeting]] = await conn.query(
      `

      SELECT

        id,

        creator_user_id,

        recipient_user_id,

        event_id,

        status,

        request_type

      FROM meetings

      WHERE id = ?

      LIMIT 1

      FOR UPDATE

      `,

      [requestId],
    );

    if (!meeting) {
      await conn.rollback();

      return res.status(404).json({ message: "Request not found" });
    }

    if (String(meeting.request_type || "") !== "event_join") {
      await conn.rollback();

      return res.status(400).json({ message: "Invalid request type" });
    }

    if (String(meeting.status || "") !== "pending") {
      await conn.rollback();

      return res.status(400).json({
        message: "Request has already been processed",
      });
    }

    if (Number(meeting.recipient_user_id) !== Number(currentUserId)) {
      await conn.rollback();

      return res.status(403).json({
        message: "You are not allowed to accept this request",
      });
    }

    const eventId = Number(meeting.event_id);

    const participantUserId = Number(meeting.creator_user_id);

    if (!Number.isFinite(eventId) || !Number.isFinite(participantUserId)) {
      await conn.rollback();

      return res.status(400).json({
        message: "Invalid event request data",
      });
    }

    const [[event]] = await conn.query(
      `

      SELECT

        id,

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

      FOR UPDATE

      `,

      [eventId],
    );

    if (!event) {
      await conn.rollback();

      return res.status(404).json({ message: "Event not found" });
    }

    if (Number(event.archived) === 1) {
      await conn.rollback();

      return res.status(400).json({ message: "Event is archived" });
    }

    const maxParticipants = Number(event.max_participants || 0);

    const bookedCount = Number(event.booked_count || 0);

    if (maxParticipants > 0 && bookedCount >= maxParticipants) {
      const [[alreadyBooked]] = await conn.query(
        `

        SELECT 1

        FROM event_bookings

        WHERE event_id = ? AND user_id = ?

        LIMIT 1

        `,

        [eventId, participantUserId],
      );

      if (!alreadyBooked) {
        await conn.rollback();

        return res.status(400).json({ message: "Event is full" });
      }
    }

    await conn.query(
      `

      INSERT IGNORE INTO event_bookings (event_id, user_id)

      VALUES (?, ?)

      `,

      [eventId, participantUserId],
    );

    await conn.query(
      `

      UPDATE meetings

      SET status = 'accepted'

      WHERE id = ?

      `,

      [requestId],
    );

    await conn.commit();

    return res.json({
      success: true,

      message: "User added to event",

      event_id: eventId,

      user_id: participantUserId,
    });
  } catch (err) {
    await conn.rollback();

    console.error("ACCEPT REQUEST ERROR:", err);

    return res.status(500).json({
      message: "Server error",

      error: err.message,

      sql: err.sqlMessage || null,
    });
  } finally {
    conn.release();
  }
});

router.get("/finished", authMiddleware, async (req, res) => {
  try {
    await archiveExpiredEvents(pool);

    const userId = await getAuthUserId(req);

    const userEmail = String(req.user?.email || "")
      .trim()

      .toLowerCase();

    if (!Number.isFinite(userId) || !userEmail) {
      return res.status(401).json({ message: "Invalid token" });
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

          WHEN LOWER(e.created_by_email) = ? THEN 'created'

          ELSE 'joined'

        END AS relation_type

      FROM events e

      LEFT JOIN event_bookings eb ON eb.event_id = e.id

      WHERE e.archived = 0

        AND COALESCE(e.end_time, e.start_time) <= NOW()

        AND COALESCE(e.end_time, e.start_time) > DATE_SUB(NOW(), INTERVAL 24 HOUR)

        AND (

          LOWER(e.created_by_email) = ?

          OR eb.user_id = ?

        )

      ORDER BY COALESCE(e.end_time, e.start_time) DESC

      `,

      [userEmail, userEmail, userId],
    );

    const archived = await getArchivedEventsForUser(userId, userEmail);

    return res.json(mergeEventHistory(normalizeEventRows(rows), archived));
  } catch (err) {
    console.error("GET /api/events/finished error:", err);

    return res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const userEmail = String(req.user?.email || "")
      .trim()

      .toLowerCase();

    if (!Number.isSafeInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    if (!userEmail) {
      return res.status(401).json({
        message: "Нэвтрэх шаардлагатай.",
      });
    }

    // Deleting never removes rows: a live event is flagged archived, and a
    // finished event (copied to finished_event) is flagged deleted_at.

    const [[activeEvent]] = await pool.query(
      `SELECT id, title, created_by_email

       FROM events

       WHERE id = ?

       LIMIT 1`,

      [eventId],
    );

    const [[finishedEvent]] = await pool.query(
      `SELECT original_event_id, title, created_by_email

       FROM finished_event

       WHERE original_event_id = ?

       LIMIT 1`,

      [eventId],
    );

    const ownerEmail = String(
      activeEvent?.created_by_email || finishedEvent?.created_by_email || "",
    )
      .trim()

      .toLowerCase();

    if (!activeEvent && !finishedEvent) {
      return res.status(404).json({
        message: "Эвент олдсонгүй.",
      });
    }

    if (ownerEmail !== userEmail) {
      return res.status(403).json({
        message: "Та зөвхөн өөрийн эвентийг устгах боломжтой.",
      });
    }

    if (activeEvent) {
      await pool.query(
        `UPDATE events

         SET archived = 1,

             archived_at = COALESCE(archived_at, NOW())

         WHERE id = ?`,

        [eventId],
      );
    }

    if (finishedEvent) {
      await pool.query(
        `UPDATE finished_event

         SET deleted_at = COALESCE(deleted_at, NOW())

         WHERE original_event_id = ?`,

        [eventId],
      );
    }

    logAudit(req, {
      type: "delete",
      action: "Эвэнт устгасан",
      target: activeEvent?.title || finishedEvent?.title,
      targetDetail: `#${eventId}`,
    });

    return res.json({
      success: true,

      message: "Эвент амжилттай устгагдлаа.",

      id: eventId,
    });
  } catch (error) {
    console.error("DELETE EVENT ERROR:", error);

    return res.status(500).json({
      message: "Эвент устгахад алдаа гарлаа.",
    });
  }
});

export default router;
