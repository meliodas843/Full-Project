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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

/* =========================
   GET ALL NEWS
========================= */
router.get("/", async (req, res) => {
  try {
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
    console.error("GET NEWS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPLOAD BODY IMAGE
========================= */
router.post(
  "/body-image",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No image uploaded",
        });
      }

      return res.json({
        url: `/uploads/news/${req.file.filename}`,
      });
    } catch (err) {
      console.error("BODY IMAGE ERROR:", err);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/* =========================
   CREATE NEWS
========================= */
router.post(
  "/",
  authMiddleware,
  upload.single("cover"),
  async (req, res) => {
    try {
      const title = String(req.body.title || "").trim();
      const body = String(req.body.body || "").trim();

      if (!title || !body) {
        return res.status(400).json({
          message: "title and body are required",
        });
      }

      const creatorId = req.user?.id;

      if (!creatorId) {
        return res.status(401).json({
          message: "Invalid token",
        });
      }

      const image_url = req.file
        ? `/uploads/news/${req.file.filename}`
        : null;

      const [result] = await pool.query(
        `
        INSERT INTO news
        (
          title,
          body,
          image_url,
          created_by
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          title,
          body,
          image_url,
          creatorId,
        ]
      );

      return res.json({
        message: "News created",
        id: result.insertId,
        image_url,
      });
    } catch (err) {
      console.error("CREATE NEWS ERROR:", err);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/* =========================
   UPDATE NEWS
========================= */
router.put(
  "/:id",
  authMiddleware,
  upload.single("cover"),
  async (req, res) => {
    try {
      const id = req.params.id;

      const title = String(req.body.title || "").trim();
      const body = String(req.body.body || "").trim();

      if (!title || !body) {
        return res.status(400).json({
          message: "title and body are required",
        });
      }

      const [rows] = await pool.query(
        "SELECT * FROM news WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "News not found",
        });
      }

      const oldNews = rows[0];

      const image_url = req.file
        ? `/uploads/news/${req.file.filename}`
        : oldNews.image_url;

      await pool.query(
        `
        UPDATE news
        SET
          title = ?,
          body = ?,
          image_url = ?
        WHERE id = ?
        `,
        [
          title,
          body,
          image_url,
          id,
        ]
      );

      return res.json({
        message: "News updated successfully",
        id,
        image_url,
      });
    } catch (err) {
      console.error("UPDATE NEWS ERROR:", err);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/* =========================
   DELETE NEWS
========================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await pool.query(
      "SELECT * FROM news WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "News not found",
      });
    }

    await pool.query(
      "DELETE FROM news WHERE id = ?",
      [id]
    );

    return res.json({
      message: "News deleted successfully",
    });
  } catch (err) {
    console.error("DELETE NEWS ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;