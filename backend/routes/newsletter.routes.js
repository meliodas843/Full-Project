// Public newsletter sign-up from the news pages.

import express from "express";
import pool from "../db.js";
import { logAudit } from "../utils/audit.js";
import { newsletterLimiter } from "../utils/security.js";

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.post("/", newsletterLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(email) || email.length > 255) {
      return res.status(400).json({ message: "И-мэйл хаяг буруу байна." });
    }

    // Same answer whether or not the address was already subscribed.
    const [result] = await pool.query("INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)", [email]);

    if (result.affectedRows) {
      logAudit(req, { type: "create", action: "Мэдээллийн товхимолд бүртгүүлсэн", target: email, user: { email } });
    }

    return res.json({ message: "Бүртгэл амжилттай." });
  } catch (error) {
    next(error);
  }
});

export default router;
