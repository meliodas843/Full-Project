// routes/newsBodyImage.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const NEWS_UPLOAD_DIR = path.join(process.cwd(), "uploads", "news");
fs.mkdirSync(NEWS_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, NEWS_UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

// ✅ Upload image for BODY editor
router.post(
  "/body-image",
  authMiddleware,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const url = `/uploads/news/${req.file.filename}`;
    res.json({ url });
  }
);

export default router;
