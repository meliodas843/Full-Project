import express from "express";
import pool from "../db.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const router = express.Router();

/* =========================
   Helpers
========================= */
function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function mustHaveEnv(name) {
  return !!String(process.env[name] || "").trim();
}

/* =========================
   Nodemailer (Gmail)
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.RESET_EMAIL_USER,
    pass: process.env.RESET_EMAIL_PASS,
  },
});

/* =========================
   POST /api/password/forgot
   body: { email }
   ✅ only send if exists, else 404
========================= */
router.post("/forgot", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    if (!mustHaveEnv("FRONTEND_URL")) {
      return res.status(500).json({ message: "FRONTEND_URL is missing in .env" });
    }
    if (!mustHaveEnv("RESET_EMAIL_USER") || !mustHaveEnv("RESET_EMAIL_PASS")) {
      return res.status(500).json({
        message:
          "RESET_EMAIL_USER/RESET_EMAIL_PASS missing. Use Gmail App Password and restart server.",
      });
    }

    const [users] = await pool.query(
      "SELECT id, email FROM users WHERE LOWER(email)=? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "This email is not registered." });
    }

    const user = users[0];

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = addMinutes(new Date(), 30);

    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await transporter.sendMail({
      from: `"Your App" <${process.env.RESET_EMAIL_USER}>`,
      to: user.email,
      subject: "Reset your password",
      text: `Click to reset your password:\n${resetUrl}\n\nThis link expires in 30 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Password Reset</h2>
          <p>Click below to reset your password. This link expires in <b>30 minutes</b>.</p>
          <p>
            <a href="${resetUrl}"
              style="display:inline-block;background:#2563eb;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none">
              Reset Password
            </a>
          </p>
          <p>If it doesn’t work, copy and paste:</p>
          <p>${resetUrl}</p>
        </div>
      `,
    });

    return res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    console.error("POST /api/password/forgot error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /api/password/reset
   body: { token, newPassword }
========================= */
router.post("/reset", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (!token || !newPassword) {
    return res.status(400).json({ message: "token and newPassword required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const tokenHash = sha256(token);

    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used
       FROM password_resets
       WHERE token_hash=?
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const resetRow = rows[0];

    if (resetRow.used) {
      return res.status(400).json({ message: "Token already used" });
    }

    const exp = new Date(resetRow.expires_at).getTime();
    if (!Number.isFinite(exp) || exp < Date.now()) {
      return res.status(400).json({ message: "Token expired" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password=? WHERE id=?", [
      hashed,
      resetRow.user_id,
    ]);

    await pool.query("UPDATE password_resets SET used=1 WHERE id=?", [resetRow.id]);

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("POST /api/password/reset error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
