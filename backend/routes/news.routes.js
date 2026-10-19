import fs from "fs";
import { imageExtension, isAllowedImage, uploadError } from "../utils/uploadSafety.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import path from "path";
import express from "express";
import multer from "multer";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAudit } from "../utils/audit.js";
import { readNewsFields, toSqlDateTime } from "../utils/news.js";

const router = express.Router();

const adminOnly = [authMiddleware, roleMiddleware(["admin", "super_admin"])];

/* =========================
   Upload setup
========================= */
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "news");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = imageExtension(file.mimetype);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImage(file.mimetype)) {
      return cb(uploadError("Only images allowed"));
    }
    cb(null, true);
  },
});

// Visible to the public: published, or scheduled and its time has come.
export const NEWS_IS_VISIBLE = `
  n.status IN ('published', 'scheduled')
  AND (n.publish_at IS NULL OR n.publish_at <= NOW())
`;

/* =========================
   GET ALL NEWS (public)
========================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        n.id,
        n.title,
        n.slug,
        n.body,
        n.summary,
        n.category,
        n.image_url,
        n.author_name,
        n.views,
        n.is_featured,
        n.is_pinned,
        n.created_by,
        COALESCE(n.publish_at, n.created_at) AS created_at,
        u.email AS author_email
      FROM news n
      LEFT JOIN users u ON u.id = n.created_by
      WHERE ${NEWS_IS_VISIBLE}
      ORDER BY n.is_pinned DESC, COALESCE(n.publish_at, n.created_at) DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error("GET NEWS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   COUNT A VIEW (public)
========================= */
router.post("/:id/view", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid news id" });
  }

  try {
    await pool.query(`UPDATE news n SET n.views = n.views + 1 WHERE n.id = ? AND ${NEWS_IS_VISIBLE}`, [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("NEWS VIEW ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPLOAD BODY IMAGE
========================= */
router.post("/body-image", ...adminOnly, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  return res.json({ url: `/uploads/news/${req.file.filename}` });
});

/* =========================
   CREATE NEWS
========================= */
router.post("/", ...adminOnly, upload.single("cover"), async (req, res) => {
  try {
    const fields = readNewsFields(req.body);

    if (fields.error) return res.status(400).json({ message: fields.error });

    const creatorId = Number(req.user?.id);

    if (!Number.isSafeInteger(creatorId)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const image_url = req.file ? `/uploads/news/${req.file.filename}` : null;

    const [result] = await pool.query(
      `
      INSERT INTO news
        (title, body, image_url, created_by, status, publish_at, slug, summary,
         category, author_name, is_featured, is_pinned, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        fields.title,
        fields.body,
        image_url,
        creatorId,
        fields.status,
        toSqlDateTime(fields.publishAt),
        fields.slug,
        fields.summary,
        fields.category,
        fields.authorName,
        fields.isFeatured,
        fields.isPinned,
      ],
    );

    logAudit(req, {
      type: "create",
      action: {
        draft: "Мэдээ ноорог хадгалсан",
        scheduled: "Мэдээ товлосон",
        published: "Мэдээ нийтэлсэн",
      }[fields.status],
      target: fields.title,
      targetDetail: `#${result.insertId}`,
    });

    return res.json({ message: "News created", id: result.insertId, image_url });
  } catch (err) {
    console.error("CREATE NEWS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE NEWS
========================= */
router.put("/:id", ...adminOnly, upload.single("cover"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = readNewsFields(req.body);

    if (fields.error) return res.status(400).json({ message: fields.error });

    const [[oldNews]] = await pool.query("SELECT id, image_url FROM news WHERE id = ?", [id]);

    if (!oldNews) return res.status(404).json({ message: "News not found" });

    const image_url = req.file
      ? `/uploads/news/${req.file.filename}`
      : req.body.remove_cover === "1"
        ? null
        : oldNews.image_url;

    await pool.query(
      `
      UPDATE news
      SET title = ?, body = ?, image_url = ?, status = ?, publish_at = ?, slug = ?,
          summary = ?, category = ?, author_name = ?, is_featured = ?, is_pinned = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        fields.title,
        fields.body,
        image_url,
        fields.status,
        toSqlDateTime(fields.publishAt),
        fields.slug,
        fields.summary,
        fields.category,
        fields.authorName,
        fields.isFeatured,
        fields.isPinned,
        id,
      ],
    );

    logAudit(req, { type: "update", action: "Мэдээ зассан", target: fields.title, targetDetail: `#${id}` });

    return res.json({ message: "News updated successfully", id, image_url });
  } catch (err) {
    console.error("UPDATE NEWS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DELETE NEWS
========================= */
router.delete("/:id", ...adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[news]] = await pool.query("SELECT id, title FROM news WHERE id = ?", [id]);

    if (!news) return res.status(404).json({ message: "News not found" });

    await pool.query("DELETE FROM news WHERE id = ?", [id]);

    logAudit(req, { type: "delete", action: "Мэдээ устгасан", target: news.title, targetDetail: `#${id}` });

    return res.json({ message: "News deleted successfully" });
  } catch (err) {
    console.error("DELETE NEWS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
