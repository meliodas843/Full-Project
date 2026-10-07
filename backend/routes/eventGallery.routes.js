import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendEventGalleryEmails } from "../services/galleryEmail.js";

const router = express.Router();
const GALLERY_DIR = path.join(process.cwd(), "uploads", "events", "gallery");

fs.mkdirSync(GALLERY_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GALLERY_DIR),
  filename: (req, file, cb) => {
    const ext = path
      .extname(file.originalname || "")
      .toLowerCase()
      .slice(0, 10);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 200 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG and WEBP images are allowed"));
    }
    return cb(null, true);
  },
});

async function ensureGalleryTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_gallery_images (
      id BIGINT NOT NULL AUTO_INCREMENT,
      event_id BIGINT NOT NULL,
      image_url TEXT NOT NULL,
      original_name VARCHAR(255) NULL,
      uploaded_by_email VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_event_gallery_event_id (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_gallery_settings (
      event_id BIGINT NOT NULL,
      visibility ENUM('participants', 'public') NOT NULL DEFAULT 'participants',
      allow_download TINYINT(1) NOT NULL DEFAULT 1,
      notify_participants TINYINT(1) NOT NULL DEFAULT 1,
      watermark TINYINT(1) NOT NULL DEFAULT 0,
      participant_message VARCHAR(500) NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 0,
      published_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const additions = [
    [
      "participant_message",
      "ALTER TABLE event_gallery_settings ADD COLUMN participant_message VARCHAR(500) NULL AFTER watermark",
    ],
    [
      "is_published",
      "ALTER TABLE event_gallery_settings ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 0 AFTER participant_message",
    ],
    [
      "published_at",
      "ALTER TABLE event_gallery_settings ADD COLUMN published_at DATETIME NULL AFTER is_published",
    ],
  ];

  for (const [column, sql] of additions) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_gallery_settings' AND COLUMN_NAME = ?`,
      [column],
    );
    if (!Number(rows[0]?.total || 0)) await pool.query(sql);
  }
}

async function getEvent(eventId) {
  const [activeRows] = await pool.query(
    `SELECT id, title, description, image_url, start_time, end_time, created_by_email, visibility
     FROM events WHERE id = ? LIMIT 1`,
    [eventId],
  );
  if (activeRows.length)
    return { ...activeRows[0], id: Number(activeRows[0].id) };

  const [finishedRows] = await pool.query(
    `SELECT original_event_id AS id, title, description, image_url, start_time, end_time, created_by_email, visibility
     FROM finished_event WHERE original_event_id = ? LIMIT 1`,
    [eventId],
  );
  if (finishedRows.length)
    return { ...finishedRows[0], id: Number(finishedRows[0].id) };
  return null;
}

function canManageEvent(req, event) {
  const userEmail = String(req.user?.email || "")
    .trim()
    .toLowerCase();
  const creatorEmail = String(event?.created_by_email || "")
    .trim()
    .toLowerCase();
  return Boolean(userEmail && creatorEmail && userEmail === creatorEmail);
}

async function isParticipant(req, eventId, event) {
  if (canManageEvent(req, event)) return true;
  const userId = Number(req.user?.id);
  if (!Number.isFinite(userId)) return false;
  const [[row]] = await pool.query(
    `SELECT id FROM event_bookings WHERE event_id = ? AND user_id = ? LIMIT 1`,
    [eventId, userId],
  );
  return Boolean(row);
}

async function participantCount(eventId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) AS total FROM event_bookings WHERE event_id = ? AND user_id IS NOT NULL`,
    [eventId],
  );
  return Number(row?.total || 0);
}

async function getSettings(eventId) {
  await pool.query(
    `INSERT IGNORE INTO event_gallery_settings (event_id) VALUES (?)`,
    [eventId],
  );
  const [[row]] = await pool.query(
    `SELECT visibility, allow_download, notify_participants, watermark,
            participant_message, is_published, published_at
     FROM event_gallery_settings WHERE event_id = ? LIMIT 1`,
    [eventId],
  );
  return {
    visibility: row?.visibility === "public" ? "public" : "participants",
    allow_download: Boolean(row?.allow_download),
    notify_participants: Boolean(row?.notify_participants),
    watermark: Boolean(row?.watermark),
    participant_message: row?.participant_message || "",
    is_published: Boolean(row?.is_published),
    published_at: row?.published_at || null,
  };
}

async function getImages(eventId) {
  const [rows] = await pool.query(
    `SELECT id, event_id, image_url, original_name, uploaded_by_email, created_at
     FROM event_gallery_images WHERE event_id = ? ORDER BY id DESC`,
    [eventId],
  );
  return rows;
}

router.get("/:eventId", authMiddleware, async (req, res) => {
  try {
    await ensureGalleryTables();
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(eventId))
      return res.status(400).json({ message: "Invalid event id" });

    const event = await getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const settings = await getSettings(eventId);
    const canManage = canManageEvent(req, event);
    const participant = await isParticipant(req, eventId, event);

    if (!canManage && !settings.is_published) {
      return res
        .status(403)
        .json({ message: "Энэ цомог хараахан нийтлэгдээгүй байна." });
    }
    if (!canManage && settings.visibility === "participants" && !participant) {
      return res
        .status(403)
        .json({
          message:
            "Энэ зургийн цомгийг зөвхөн эвентэд бүртгүүлсэн оролцогчид харах боломжтой.",
        });
    }

    const images = await getImages(eventId);
    const count = await participantCount(eventId);

    return res.json({
      event: { ...event, participant_count: count },
      can_manage: canManage,
      is_participant: participant,
      settings,
      images,
    });
  } catch (err) {
    console.error("GET EVENT GALLERY ERROR:", err);
    return res.status(500).json({ message: "Failed to load event gallery" });
  }
});

router.patch("/:eventId/settings", authMiddleware, async (req, res) => {
  try {
    await ensureGalleryTables();
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(eventId))
      return res.status(400).json({ message: "Invalid event id" });

    const event = await getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!canManageEvent(req, event))
      return res.status(403).json({ message: "Not allowed" });

    const current = await getSettings(eventId);
    const visibility =
      req.body?.visibility === undefined
        ? current.visibility
        : req.body.visibility === "public"
          ? "public"
          : "participants";
    const allowDownload =
      req.body?.allow_download === undefined
        ? current.allow_download
        : Boolean(req.body.allow_download);
    const notifyParticipants =
      req.body?.notify_participants === undefined
        ? current.notify_participants
        : Boolean(req.body.notify_participants);
    const watermark =
      req.body?.watermark === undefined
        ? current.watermark
        : Boolean(req.body.watermark);
    const participantMessage =
      req.body?.participant_message === undefined
        ? current.participant_message
        : String(req.body.participant_message || "")
            .trim()
            .slice(0, 500);

    await pool.query(
      `INSERT INTO event_gallery_settings
       (event_id, visibility, allow_download, notify_participants, watermark, participant_message)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         visibility = VALUES(visibility),
         allow_download = VALUES(allow_download),
         notify_participants = VALUES(notify_participants),
         watermark = VALUES(watermark),
         participant_message = VALUES(participant_message)`,
      [
        eventId,
        visibility,
        allowDownload ? 1 : 0,
        notifyParticipants ? 1 : 0,
        watermark ? 1 : 0,
        participantMessage,
      ],
    );

    return res.json({
      message: "Settings saved",
      settings: await getSettings(eventId),
    });
  } catch (err) {
    console.error("SAVE EVENT GALLERY SETTINGS ERROR:", err);
    return res.status(500).json({ message: "Failed to save gallery settings" });
  }
});

router.post("/:eventId/publish", authMiddleware, async (req, res) => {
  try {
    await ensureGalleryTables();
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(eventId))
      return res.status(400).json({ message: "Invalid event id" });

    const event = await getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!canManageEvent(req, event))
      return res.status(403).json({ message: "Not allowed" });

    const images = await getImages(eventId);
    if (!images.length)
      return res.status(400).json({ message: "Нийтлэх зураг алга байна." });

    const settings = await getSettings(eventId);
    await pool.query(
      `UPDATE event_gallery_settings SET is_published = 1, published_at = NOW() WHERE event_id = ?`,
      [eventId],
    );

    let emailResults = [];
    if (settings.notify_participants) {
      emailResults = await sendEventGalleryEmails({
        eventId,
        eventName: event.title || "Event",
        imageCount: images.length,
      });
    }

    return res.json({
      message: "Gallery published",
      settings: await getSettings(eventId),
      image_count: images.length,
      participant_count: await participantCount(eventId),
      email_results: emailResults,
    });
  } catch (err) {
    console.error("PUBLISH EVENT GALLERY ERROR:", err);
    return res.status(500).json({ message: "Failed to publish gallery" });
  }
});

router.post(
  "/:eventId",
  authMiddleware,
  upload.array("images", 200),
  async (req, res) => {
    try {
      await ensureGalleryTables();
      const eventId = Number(req.params.eventId);
      if (!Number.isFinite(eventId))
        return res.status(400).json({ message: "Invalid event id" });

      const event = await getEvent(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canManageEvent(req, event))
        return res.status(403).json({ message: "Not allowed" });

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length)
        return res.status(400).json({ message: "No images selected" });

      const uploader = String(req.user?.email || "").trim() || null;
      for (const file of files) {
        await pool.query(
          `INSERT INTO event_gallery_images (event_id, image_url, original_name, uploaded_by_email)
         VALUES (?, ?, ?, ?)`,
          [
            eventId,
            `/uploads/events/gallery/${file.filename}`,
            file.originalname || null,
            uploader,
          ],
        );
      }

      await pool.query(
        `INSERT INTO event_gallery_settings (event_id, is_published)
       VALUES (?, 0)
       ON DUPLICATE KEY UPDATE is_published = 0, published_at = NULL`,
        [eventId],
      );

      return res.json({
        message: "Images uploaded",
        settings: await getSettings(eventId),
        images: await getImages(eventId),
      });
    } catch (err) {
      console.error("UPLOAD EVENT GALLERY ERROR:", err);
      return res.status(500).json({ message: "Failed to upload images" });
    }
  },
);

router.delete("/:eventId", authMiddleware, async (req, res) => {
  try {
    await ensureGalleryTables();
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(eventId))
      return res.status(400).json({ message: "Invalid event id" });

    const event = await getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!canManageEvent(req, event))
      return res.status(403).json({ message: "Not allowed" });

    const ids = Array.isArray(req.body?.image_ids)
      ? req.body.image_ids.map(Number).filter(Number.isFinite)
      : [];
    if (!ids.length)
      return res.status(400).json({ message: "No images selected" });

    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await pool.query(
      `SELECT id, image_url FROM event_gallery_images WHERE event_id = ? AND id IN (${placeholders})`,
      [eventId, ...ids],
    );
    await pool.query(
      `DELETE FROM event_gallery_images WHERE event_id = ? AND id IN (${placeholders})`,
      [eventId, ...ids],
    );

    for (const row of rows) {
      const relativePath = String(row.image_url || "").replace(/^\/+/, "");
      const absolutePath = path.join(process.cwd(), relativePath);
      if (absolutePath.startsWith(GALLERY_DIR) && fs.existsSync(absolutePath))
        fs.unlinkSync(absolutePath);
    }

    await pool.query(
      `UPDATE event_gallery_settings SET is_published = 0, published_at = NULL WHERE event_id = ?`,
      [eventId],
    );

    return res.json({
      message: "Images deleted",
      settings: await getSettings(eventId),
      images: await getImages(eventId),
    });
  } catch (err) {
    console.error("DELETE EVENT GALLERY ERROR:", err);
    return res.status(500).json({ message: "Failed to delete images" });
  }
});

export default router;
