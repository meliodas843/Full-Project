import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads", "profile");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalExtension = path.extname(file.originalname || "").toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const extension = allowedExtensions.includes(originalExtension)
      ? originalExtension
      : ".jpg";

    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed"));
    }

    cb(null, true);
  },
});

function getUserId(req) {
  const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.user_id);
  return Number.isFinite(userId) ? userId : null;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

function normalizeInterests(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
      }
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseInterests(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function formatUser(user) {
  const interests = parseInterests(user.interests);
  const avatarUrl = user.avatar_url || "";

  return {
    id: user.id,
    email: user.email || "",
    company_name: user.company_name || "",
    company: user.company_name || "",
    organization: user.company_name || "",
    phone: user.phone || "",
    firstName: user.first_name || "",
    first_name: user.first_name || "",
    lastName: user.last_name || "",
    last_name: user.last_name || "",
    job_title: user.job_title || "",
    jobTitle: user.job_title || "",
    interests,
    professional_interests: interests,
    professionalInterests: interests,
    role: user.role || "",
    avatar_url: avatarUrl,
    avatar: avatarUrl,
    profile_image: avatarUrl,
    profile_image_url: avatarUrl,
    created_at: user.created_at || null,
  };
}

async function getUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      email,
      company_name,
      phone,
      first_name,
      last_name,
      job_title,
      interests,
      role,
      avatar_url,
      created_at
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

function uploadAvatar(req, res, next) {
  upload.single("avatar")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "Profile image must be smaller than 5MB"
            : err.message,
      });
    }

    if (err) {
      return res.status(400).json({ message: err.message });
    }

    next();
  });
}

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: formatUser(user) });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/me", authMiddleware, uploadAvatar, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const firstName = normalizeText(req.body?.firstName ?? req.body?.first_name);
    const lastName = normalizeText(req.body?.lastName ?? req.body?.last_name);
    const companyName = normalizeText(
      req.body?.company_name ?? req.body?.company ?? req.body?.organization
    );
    const phone = normalizePhone(req.body?.phone);
    const jobTitle = normalizeText(req.body?.job_title ?? req.body?.jobTitle);
    const interests = normalizeInterests(
      req.body?.interests ??
        req.body?.professional_interests ??
        req.body?.professionalInterests
    );

    if (!firstName) {
      return res.status(400).json({ message: "First name is required" });
    }

    if (!lastName) {
      return res.status(400).json({ message: "Last name is required" });
    }

    if (!companyName) {
      return res.status(400).json({ message: "Organization is required" });
    }

    if (!/^\d{8}$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must contain 8 digits" });
    }

    if (!jobTitle) {
      return res.status(400).json({ message: "Job title is required" });
    }

    if (!interests.length) {
      return res.status(400).json({
        message: "Select at least one professional interest",
      });
    }

    const existingUser = await getUser(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let avatarUrl = existingUser.avatar_url || "";

    if (req.file) {
      avatarUrl = `/uploads/profile/${req.file.filename}`;
    }

    await pool.query(
      `
      UPDATE users
      SET
        company_name = ?,
        phone = ?,
        first_name = ?,
        last_name = ?,
        job_title = ?,
        interests = ?,
        avatar_url = ?
      WHERE id = ?
      `,
      [
        companyName,
        phone,
        firstName,
        lastName,
        jobTitle,
        JSON.stringify(interests),
        avatarUrl,
        userId,
      ]
    );

    const updatedUser = await getUser(userId);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: formatUser(updatedUser),
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
