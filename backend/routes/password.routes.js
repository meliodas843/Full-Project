import express from "express";
import pool from "../db.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const router = express.Router();

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function mustHaveEnv(name) {
  return !!String(process.env[name] || "").trim();
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.RESET_EMAIL_USER,
    pass: process.env.RESET_EMAIL_PASS,
  },
});

router.post("/forgot", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    if (!mustHaveEnv("FRONTEND_URL")) {
      return res.status(500).json({
        message: "FRONTEND_URL is missing in .env",
      });
    }

    if (!mustHaveEnv("RESET_EMAIL_USER") || !mustHaveEnv("RESET_EMAIL_PASS")) {
      return res.status(500).json({
        message:
          "RESET_EMAIL_USER/RESET_EMAIL_PASS missing. Use Gmail App Password and restart server.",
      });
    }

    const [users] = await pool.query(
      `
      SELECT
        id,
        email,
        first_name
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "This email is not registered.",
      });
    }

    const user = users[0];

    await pool.query(
      `
      UPDATE password_resets
      SET used = 1
      WHERE user_id = ?
        AND used = 0
      `,
      [user.id]
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = addMinutes(new Date(), 30);

    await pool.query(
      `
      INSERT INTO password_resets
      (
        user_id,
        token_hash,
        expires_at,
        used
      )
      VALUES (?, ?, ?, 0)
      `,
      [user.id, tokenHash, expiresAt]
    );

    const frontendUrl = String(process.env.FRONTEND_URL).replace(/\/+$/, "");
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      rawToken
    )}`;

    const name = String(user.first_name || "").trim() || "Хэрэглэгч";

    await transporter.sendMail({
      from: `"Registra" <${process.env.RESET_EMAIL_USER}>`,
      to: user.email,
      subject: "Registra нууц үг сэргээх",
      text:
        `Сайн байна уу, ${name}.\n\n` +
        `Доорх холбоосоор нууц үгээ шинэчилнэ үү:\n${resetUrl}\n\n` +
        `Энэ холбоос 30 минутын дараа хүчингүй болно.`,
      html: `
        <div style="margin:0;padding:0;background:#f5f6fb;font-family:Arial,Helvetica,sans-serif;color:#171927">
          <div style="max-width:620px;margin:0 auto;padding:32px 16px">
            <div style="font-size:22px;font-weight:800;color:#6847ef;margin-bottom:18px">
              REGISTRA
            </div>

            <div style="background:#ffffff;border:1px solid #e7e8ef;border-radius:16px;padding:30px">
              <div style="width:48px;height:48px;line-height:48px;text-align:center;background:#f0ebff;border-radius:12px;font-size:22px;margin-bottom:18px">
                🔒
              </div>

              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.3">
                Нууц үг сэргээх
              </h1>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#656b7c">
                Сайн байна уу, ${name}.
              </p>

              <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#656b7c">
                Таны Registra бүртгэлийн нууц үгийг сэргээх хүсэлт ирлээ.
                Доорх товчийг дарж шинэ нууц үгээ тохируулна уу.
              </p>

              <a
                href="${resetUrl}"
                style="display:inline-block;background:#6847ef;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;border-radius:9px"
              >
                Нууц үг сэргээх
              </a>

              <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#8e94a6">
                Энэ холбоос 30 минутын дараа хүчингүй болно.
              </p>

              <p style="margin:10px 0 0;font-size:12px;line-height:1.7;color:#8e94a6">
                Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу.
              </p>

              <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#9ca1af;word-break:break-all">
                ${resetUrl}
              </p>
            </div>
          </div>
        </div>
      `,
    });

    return res.json({
      message: "Reset link sent to your email.",
    });
  } catch (err) {
    console.error("POST /api/password/forgot error:", err);

    return res.status(500).json({
      message: "Server error",
      error: String(err.message || err),
    });
  }
});

router.post("/reset", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (!token || !newPassword) {
    return res.status(400).json({
      message: "token and newPassword required",
    });
  }

  const strongPassword =
    newPassword.length >= 10 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword);

  if (!strongPassword) {
    return res.status(400).json({
      message:
        "Password must be at least 10 characters and include uppercase, lowercase, number and symbol",
    });
  }

  try {
    const tokenHash = sha256(token);

    const [rows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        expires_at,
        used
      FROM password_resets
      WHERE token_hash = ?
      LIMIT 1
      `,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    const resetRow = rows[0];

    if (resetRow.used) {
      return res.status(400).json({
        message: "Token already used",
      });
    }

    const exp = new Date(resetRow.expires_at).getTime();

    if (!Number.isFinite(exp) || exp < Date.now()) {
      return res.status(400).json({
        message: "Token expired",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
        UPDATE users
        SET password = ?
        WHERE id = ?
        `,
        [hashed, resetRow.user_id]
      );

      await connection.query(
        `
        UPDATE password_resets
        SET used = 1
        WHERE id = ?
        `,
        [resetRow.id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json({
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("POST /api/password/reset error:", err);

    return res.status(500).json({
      message: "Server error",
      error: String(err.message || err),
    });
  }
});

export default router;
