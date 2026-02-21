import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   Upload setup
========================= */
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "news");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    // allow only images
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

/* =========================
   GET /api/news
========================= */
router.get("/", async (req, res) => {
  try {
    // 🔁 Change 'users' to 'all_users' if that's your user table
    const [rows] = await pool.query(`
      SELECT 
        n.id,
        n.title,
        n.body,
        n.image_url,
        n.created_by,
        n.created_at,
        u.email AS author_email
      FROM news n
      LEFT JOIN users u ON u.id = n.created_by
      ORDER BY n.created_at DESC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/news ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /api/news/body-image ✅ NEW
   Upload image for Quill editor and return { url }
========================= */
router.post("/body-image", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    // Quill will insert this into <img src="...">
    const url = `/uploads/news/${req.file.filename}`;
    return res.json({ url });
  } catch (err) {
    console.error("POST /api/news/body-image ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /api/news (Super Admin)
   ✅ accepts:
   - title (text)
   - body  (HTML from Quill)
   - cover (optional cover image)
========================= */
router.post("/", authMiddleware, upload.single("cover"), async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim(); // ✅ HTML

    if (!title || !body) {
      return res.status(400).json({ message: "title and body are required" });
    }

    const creatorId = req.user?.id;
    if (!creatorId) {
      return res.status(401).json({ message: "Invalid token (no user id)" });
    }

    // cover image url (optional)
    const image_url = req.file ? `/uploads/news/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO news (title, body, image_url, created_by)
       VALUES (?, ?, ?, ?)`,
      [title, body, image_url, creatorId]
    );

    return res.json({
      message: "News created",
      id: result.insertId,
      image_url,
    });
  } catch (err) {
    console.error("POST /api/news ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
