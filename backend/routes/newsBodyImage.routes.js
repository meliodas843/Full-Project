// routes/newsBodyImage.routes.js
import express from "express";
import { imageExtension, isAllowedImage } from "../utils/uploadSafety.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
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
    const ext = imageExtension(file.mimetype);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!isAllowedImage(file.mimetype)) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/body-image",
  authMiddleware,
  roleMiddleware(["admin", "super_admin"]),
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
