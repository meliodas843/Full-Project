import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const GALLERY_DIR = path.join(process.cwd(), "uploads", "events", "gallery");

fs.mkdirSync(GALLERY_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GALLERY_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 200,
  },
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
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getEvent(eventId) {
  const [activeRows] = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      image_url,
      start_time,
      end_time,
      created_by_email,
      visibility
    FROM events
    WHERE id = ?
    LIMIT 1
    `,
    [eventId],
  );

  if (activeRows.length) {
    return {
      ...activeRows[0],
      id: Number(activeRows[0].id),
    };
  }

  const [finishedRows] = await pool.query(
    `
    SELECT
      original_event_id AS id,
      title,
      description,
      image_url,
      start_time,
      end_time,
      created_by_email,
      visibility
    FROM finished_event
    WHERE original_event_id = ?
    LIMIT 1
    `,
    [eventId],
  );

  if (finishedRows.length) {
    return {
      ...finishedRows[0],
      id: Number(finishedRows[0].id),
    };
  }

  return null;
}

function canManageEvent(req, event) {
  const userEmail = String(req.user?.email || "").trim().toLowerCase();
  const creatorEmail = String(event?.created_by_email || "").trim().toLowerCase();

  return Boolean(userEmail && creatorEmail && userEmail === creatorEmail);
}

async function isParticipant(req, eventId, event) {
  if (canManageEvent(req, event)) return true;

  const userId = Number(req.user?.id);

  if (!Number.isFinite(userId)) return false;

  const [[row]] = await pool.query(
    `
    SELECT id
    FROM event_bookings
    WHERE event_id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId],
  );

  return Boolean(row);
}

async function getSettings(eventId) {
  await pool.query(
    `
    INSERT IGNORE INTO event_gallery_settings (event_id)
    VALUES (?)
    `,
    [eventId],
  );

  const [[row]] = await pool.query(
    `
    SELECT
      visibility,
      allow_download,
      notify_participants,
      watermark
    FROM event_gallery_settings
    WHERE event_id = ?
    LIMIT 1
    `,
    [eventId],
  );

  return {
    visibility: row?.visibility === "public" ? "public" : "participants",
    allow_download: Boolean(row?.allow_download),
    notify_participants: Boolean(row?.notify_participants),
    watermark: Boolean(row?.watermark),
  };
}

async function getImages(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      event_id,
      image_url,
      original_name,
      uploaded_by_email,
      created_at
    FROM event_gallery_images
    WHERE event_id = ?
    ORDER BY id DESC
    `,
    [eventId],
  );

  return rows;
}

async function notifyParticipants(eventId, uploaderId) {
  const [participants] = await pool.query(
    `
    SELECT DISTINCT user_id
    FROM event_bookings
    WHERE event_id = ?
      AND user_id IS NOT NULL
      AND user_id <> ?
    `,
    [eventId, Number(uploaderId) || 0],
  );

  for (const participant of participants) {
    try {
      await pool.query(
        `
        INSERT INTO notifications (user_id, type, ref_id, is_read)
        VALUES (?, 'event_gallery_update', ?, 0)
        `,
        [participant.user_id, eventId],
      );
    } catch (err) {
      console.error("EVENT GALLERY NOTIFICATION ERROR:", err.message);
    }
  }
}

router.get("/:eventId", authMiddleware, async (req, res) => {
  try {
    await ensureGalleryTables();

    const eventId = Number(req.params.eventId);

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await getEvent(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const settings = await getSettings(eventId);
    const canManage = canManageEvent(req, event);
    const participant = await isParticipant(req, eventId, event);

    if (settings.visibility === "participants" && !participant) {
      return res.status(403).json({
        message: "Энэ зургийн цомгийг зөвхөн эвентийн оролцогчид харах боломжтой.",
      });
    }

    const images = await getImages(eventId);

    return res.json({
      event,
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

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await getEvent(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!canManageEvent(req, event)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const visibility =
      req.body?.visibility === "public" ? "public" : "participants";

    const allowDownload =
      req.body?.allow_download === undefined
        ? true
        : Boolean(req.body.allow_download);

    const notifyParticipants =
      req.body?.notify_participants === undefined
        ? true
        : Boolean(req.body.notify_participants);

    const watermark = Boolean(req.body?.watermark);

    await pool.query(
      `
      INSERT INTO event_gallery_settings (
        event_id,
        visibility,
        allow_download,
        notify_participants,
        watermark
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        visibility = VALUES(visibility),
        allow_download = VALUES(allow_download),
        notify_participants = VALUES(notify_participants),
        watermark = VALUES(watermark)
      `,
      [
        eventId,
        visibility,
        allowDownload ? 1 : 0,
        notifyParticipants ? 1 : 0,
        watermark ? 1 : 0,
      ],
    );

    const settings = await getSettings(eventId);

    return res.json({
      message: "Settings saved",
      settings,
    });
  } catch (err) {
    console.error("SAVE EVENT GALLERY SETTINGS ERROR:", err);
    return res.status(500).json({ message: "Failed to save gallery settings" });
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

      if (!Number.isFinite(eventId)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const event = await getEvent(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!canManageEvent(req, event)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      const files = Array.isArray(req.files) ? req.files : [];

      if (!files.length) {
        return res.status(400).json({ message: "No images selected" });
      }

      const uploader = String(req.user?.email || "").trim() || null;

      for (const file of files) {
        await pool.query(
          `
          INSERT INTO event_gallery_images (
            event_id,
            image_url,
            original_name,
            uploaded_by_email
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            eventId,
            `/uploads/events/gallery/${file.filename}`,
            file.originalname || null,
            uploader,
          ],
        );
      }

      const settings = await getSettings(eventId);

      if (settings.notify_participants) {
        await notifyParticipants(eventId, req.user?.id);
      }

      const images = await getImages(eventId);

      return res.json({
        message: "Images uploaded",
        settings,
        images,
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

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await getEvent(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!canManageEvent(req, event)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const ids = Array.isArray(req.body?.image_ids)
      ? req.body.image_ids.map(Number).filter(Number.isFinite)
      : [];

    if (!ids.length) {
      return res.status(400).json({ message: "No images selected" });
    }

    const placeholders = ids.map(() => "?").join(",");

    const [rows] = await pool.query(
      `
      SELECT id, image_url
      FROM event_gallery_images
      WHERE event_id = ?
        AND id IN (${placeholders})
      `,
      [eventId, ...ids],
    );

    await pool.query(
      `
      DELETE FROM event_gallery_images
      WHERE event_id = ?
        AND id IN (${placeholders})
      `,
      [eventId, ...ids],
    );

    for (const row of rows) {
      const relativePath = String(row.image_url || "").replace(/^\/+/, "");
      const absolutePath = path.join(process.cwd(), relativePath);

      if (absolutePath.startsWith(GALLERY_DIR) && fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    const images = await getImages(eventId);

    return res.json({
      message: "Images deleted",
      images,
    });
  } catch (err) {
    console.error("DELETE EVENT GALLERY ERROR:", err);
    return res.status(500).json({ message: "Failed to delete images" });
  }
});

export default router;
