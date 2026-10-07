import express from "express";

import crypto from "crypto";

import pool from "../db.js";

import authMiddleware from "../middleware/authMiddleware.js";

import { sendMail, getFrontendUrl } from "../services/mailer.js";

import {
  galleryPublishedEmail,
  passwordResetCodeEmail,
} from "../templates/emailTemplates.js";

const router = express.Router();

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()

    .toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getEvent(eventId) {
  const [rows] = await pool.query(
    `

    SELECT

      id,

      title,

      description,

      category,

      image_url,

      start_time,

      end_time,

      created_by_email

    FROM events

    WHERE id = ?

    LIMIT 1

    `,

    [eventId],
  );

  return rows[0] || null;
}

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    `

    SELECT

      id,

      email,

      first_name,

      last_name,

      company_name,

      phone

    FROM users

    WHERE LOWER(email) = ?

    LIMIT 1

    `,

    [email],
  );

  return rows[0] || null;
}

async function canManageEvent(event, req) {
  const userEmail = normalizeEmail(req.user?.email);

  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin" || role === "super_admin") {
    return true;
  }

  return normalizeEmail(event?.created_by_email) === userEmail;
}

router.get("/user-lookup", authMiddleware, async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);

    if (!email || !validEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required",

        registered: false,

        user: null,
      });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.json({
        registered: false,

        user: null,
      });
    }

    return res.json({
      registered: true,

      user: {
        id: user.id,

        email: user.email,

        first_name: user.first_name,

        last_name: user.last_name,

        company_name: user.company_name,

        phone: user.phone,

        registered: true,
      },
    });
  } catch (err) {
    console.error("GET /api/email/user-lookup error:", err);

    return res.status(500).json({
      message: "Server error",

      registered: false,

      user: null,

      error: String(err.message || err),
    });
  }
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absoluteUrl(value, frontendUrl) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${String(frontendUrl || "").replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
}

function formatInviteDate(value) {
  if (!value) return "Огноо тодорхойгүй";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat("mn-MN", {
      timeZone: "Asia/Ulaanbaatar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(date);
  } catch {
    return String(value);
  }
}

function formatInviteTime(start, end) {
  const fmt = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("mn-MN", {
        timeZone: "Asia/Ulaanbaatar",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    } catch {
      return "";
    }
  };

  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || "Цаг тодорхойгүй";
}

function eventInviteEmail({
  firstName,
  lastName,
  email,
  companyName,
  event,
  eventUrl,
  frontendUrl,
  registered = true,
  signupUrl = "",
}) {
  const recipientName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    (registered ? "Хэрэглэгч" : "Зочин");

  const eventName = event?.title || "Registra эвент";
  const description =
    String(event?.description || "").trim() ||
    "Таныг энэхүү арга хэмжээнд хүрэлцэн ирэхийг урьж байна.";

  const imageUrl = absoluteUrl(event?.image_url, frontendUrl);
  const organizer = event?.created_by_email || "Registra";
  const primaryUrl = registered ? eventUrl : signupUrl;
  const dateText = formatInviteDate(event?.start_time);
  const timeText = formatInviteTime(event?.start_time, event?.end_time);

  const safe = {
    recipientName: escapeHtml(recipientName),
    firstName: escapeHtml(firstName || recipientName),
    email: escapeHtml(email),
    companyName: escapeHtml(companyName || "—"),
    eventName: escapeHtml(eventName),
    description: escapeHtml(description),
    organizer: escapeHtml(organizer),
    category: escapeHtml(event?.category || "Эвент"),
    dateText: escapeHtml(dateText),
    timeText: escapeHtml(timeText),
    imageUrl: escapeHtml(imageUrl),
    primaryUrl: escapeHtml(primaryUrl),
    eventUrl: escapeHtml(eventUrl),
  };

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safe.eventName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fb;font-family:Arial,Helvetica,sans-serif;color:#171725;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f6fb;">
    <tr>
      <td align="center" style="padding:28px 14px 36px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;">
          <tr>
            <td style="padding:0 8px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <img src="cid:registra-logo" alt="REGISTRA" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;">
                  </td>
                  <td align="right" style="font-size:12px;color:#9295a5;">
                    Хөтөч дээр харах
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border:1px solid #e7e7ef;border-radius:18px;padding:30px 30px 26px;">
              <div style="display:inline-block;background:#f0ebff;color:#6c4df6;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:700;margin-bottom:20px;">
                ✉ Хувийн урилга
              </div>

              <div style="font-size:26px;line-height:1.25;font-weight:800;color:#171725;margin:0 0 8px;">
                ${safe.firstName}, ${safe.eventName}-д урьж байна
              </div>

              <div style="font-size:16px;line-height:1.65;color:#666978;margin-bottom:20px;">
                <strong style="color:#30313b;">${safe.organizer}</strong> таныг доорх эвэнтэд урьлаа.
                ${
                  registered
                    ? "Таны Registra бүртгэл бэлэн тул эвэнтийн дэлгэрэнгүйг шууд харах боломжтой."
                    : "Registra-д бүртгүүлээд урилгаа үргэлжлүүлнэ үү."
                }
              </div>

              <div style="border-left:4px solid #6c4df6;background:#fafaff;border-radius:0 10px 10px 0;padding:14px 16px;margin:0 0 22px;font-size:13px;line-height:1.6;color:#666978;font-style:italic;">
                “${safe.description}”
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e6ee;border-radius:14px;overflow:hidden;margin-bottom:18px;">
                ${
                  safe.imageUrl
                    ? `
                <tr>
                  <td style="padding:0;background:#11152d;">
                    <img src="${safe.imageUrl}" alt="${safe.eventName}" width="618" style="display:block;width:100%;max-width:618px;height:auto;border:0;">
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:18px 20px;background:#ffffff;">
                    <div style="font-size:20px;font-weight:800;color:#171725;margin-bottom:14px;">${safe.eventName}</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="50%" style="padding:5px 8px 5px 0;font-size:13px;color:#686b7a;">📅 ${safe.dateText}</td>
                        <td width="50%" style="padding:5px 0 5px 8px;font-size:13px;color:#686b7a;">🕘 ${safe.timeText}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:5px 8px 5px 0;font-size:13px;color:#686b7a;">🏷 ${safe.category}</td>
                        <td width="50%" style="padding:5px 0 5px 8px;font-size:13px;color:#686b7a;">👤 ${safe.organizer}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e6ee;border-radius:14px;margin-bottom:22px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:13px;font-weight:800;color:#777a88;letter-spacing:.3px;margin-bottom:14px;">
                      БҮРТГЭЛИЙН МЭДЭЭЛЭЛ
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="34%" style="padding:5px 0;font-size:13px;color:#8b8e9b;">Нэр</td>
                        <td style="padding:5px 0;font-size:13px;color:#333540;font-weight:700;">${safe.recipientName}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#8b8e9b;">Имэйл</td>
                        <td style="padding:5px 0;font-size:13px;color:#333540;font-weight:700;">${safe.email}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#8b8e9b;">Байгууллага</td>
                        <td style="padding:5px 0;font-size:13px;color:#333540;font-weight:700;">${safe.companyName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:9px;background:#6c4df6;">
                    <a href="${safe.primaryUrl}" target="_blank" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">
                      ${registered ? "✓ Урилга хүлээн авах" : "Registra-д бүртгүүлэх"}
                    </a>
                  </td>
                  <td width="10"></td>
                  <td style="border:1px solid #dedee7;border-radius:9px;background:#ffffff;">
                    <a href="${safe.eventUrl}" target="_blank" style="display:inline-block;padding:13px 20px;color:#3c3d48;text-decoration:none;font-size:14px;font-weight:700;">
                      Эвэнт харах
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 20px 0;font-size:13px;line-height:1.6;color:#8a8d9c;">
              ${
                registered
                  ? `Та Registra-д <strong>${safe.email}</strong> хаягаар бүртгэлтэй учир энэ урилгыг хүлээн авлаа.`
                  : `Энэ урилгыг <strong>${safe.email}</strong> хаягт илгээлээ.`
              }
              <div style="margin-top:14px;font-size:11px;color:#aaaabd;">
                © 2026 Registra · Улаанбаатар
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

router.post("/event-invite", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.body?.event_id);

    const email = normalizeEmail(req.body?.email);

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({
        message: "Valid event_id is required",
      });
    }

    if (!email || !validEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required",
      });
    }

    const event = await getEvent(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const allowed = await canManageEvent(event, req);

    if (!allowed) {
      return res.status(403).json({
        message: "You are not allowed to send invitations for this event",
      });
    }

    const user = await getUserByEmail(email);

    const frontendUrl = getFrontendUrl();

    if (user) {
      const eventUrl = `${frontendUrl}/events/${event.id}`;

      await sendMail({
        to: user.email,

        subject: `${user.first_name || ""}, ${event.title} арга хэмжээнд таныг урьж байна`,

        text:
          `Сайн байна уу, ${user.first_name || "Хэрэглэгч"}.\n\n` +
          `Таныг "${event.title}" арга хэмжээнд урьж байна.\n\n` +
          `${eventUrl}`,

        html: eventInviteEmail({
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          companyName: user.company_name,
          event,
          eventUrl,
          frontendUrl,
          registered: true,
        }),
      });

      return res.json({
        message: "Invitation email sent",

        registered: true,

        email: user.email,
      });
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");

    const signupUrl =
      `${frontendUrl}/signup` +
      `?invite=${encodeURIComponent(inviteToken)}` +
      `&email=${encodeURIComponent(email)}` +
      `&event=${event.id}`;

    await sendMail({
      to: email,

      subject: `${event.title} арга хэмжээнд таныг урьж байна`,

      text:
        `"${event.title}" арга хэмжээнд таныг урьж байна.\n\n` +
        `Registra бүртгэл үүсгэж урилгаа хүлээн авна уу:\n` +
        signupUrl,

      html: eventInviteEmail({
        firstName: "Хэрэглэгч",
        lastName: "",
        email,
        companyName: "",
        event,
        eventUrl: `${frontendUrl}/events/${event.id}`,
        frontendUrl,
        registered: false,
        signupUrl,
      }),
    });

    return res.json({
      message: "Guest invitation email sent",

      registered: false,

      email,
    });
  } catch (err) {
    console.error("POST /api/email/event-invite error:", err);

    return res.status(500).json({
      message: "Server error",

      error: String(err.message || err),
    });
  }
});

router.post("/gallery-published", authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.body?.event_id);

    if (!Number.isFinite(eventId)) {
      return res.status(400).json({
        message: "Valid event_id is required",
      });
    }

    const event = await getEvent(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const allowed = await canManageEvent(event, req);

    if (!allowed) {
      return res.status(403).json({
        message: "You are not allowed to send gallery emails for this event",
      });
    }

    const [participants] = await pool.query(
      `

          SELECT DISTINCT

            u.id,

            u.email,

            u.first_name

          FROM event_bookings eb

          JOIN users u

            ON u.id = eb.user_id

          WHERE eb.event_id = ?

            AND u.email IS NOT NULL

            AND u.email <> ''

          `,

      [eventId],
    );

    const [fileRows] = await pool.query(
      `

          SELECT COUNT(*) AS total

          FROM event_files

          WHERE event_id = ?

          `,

      [eventId],
    );

    const imageCount = Number(fileRows[0]?.total || 0);

    const frontendUrl = getFrontendUrl();

    const albumUrl = `${frontendUrl}/user/events/${eventId}/gallery`;

    const results = [];

    for (const participant of participants) {
      try {
        await sendMail({
          to: participant.email,

          subject: `${event.title}-ийн зургууд нийтлэгдлээ — ${imageCount} зураг`,

          text:
            `Сайн байна уу, ${participant.first_name || "оролцогч"}.\n\n` +
            `${event.title}-ийн зургууд нийтлэгдлээ.\n` +
            `${imageCount} зураг\n\n` +
            albumUrl,

          html: galleryPublishedEmail({
            firstName: participant.first_name,

            eventName: event.title,

            imageCount,

            albumUrl,
          }),
        });

        results.push({
          user_id: participant.id,

          email: participant.email,

          sent: true,
        });
      } catch (mailError) {
        console.error("GALLERY EMAIL ERROR:", participant.email, mailError);

        results.push({
          user_id: participant.id,

          email: participant.email,

          sent: false,

          error: String(mailError?.message || mailError),
        });
      }
    }

    const sentCount = results.filter((item) => item.sent).length;

    const failedCount = results.length - sentCount;

    return res.json({
      message: "Gallery email process completed",

      event_id: eventId,

      event_name: event.title,

      image_count: imageCount,

      total: results.length,

      sent: sentCount,

      failed: failedCount,

      results,
    });
  } catch (err) {
    console.error("POST /api/email/gallery-published error:", err);

    return res.status(500).json({
      message: "Server error",

      error: String(err.message || err),
    });
  }
});

router.post("/password-code", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email || !validEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required",
      });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        message: "This email is not registered.",
      });
    }

    await pool.query(
      `

        CREATE TABLE IF NOT EXISTS password_reset_codes

        (

          id BIGINT NOT NULL AUTO_INCREMENT,

          user_id BIGINT NOT NULL,

          code_hash CHAR(64) NOT NULL,

          expires_at DATETIME NOT NULL,

          used TINYINT(1)

            NOT NULL

            DEFAULT 0,

          attempts INT

            NOT NULL

            DEFAULT 0,

          created_at DATETIME

            NOT NULL

            DEFAULT CURRENT_TIMESTAMP,

          PRIMARY KEY (id),

          KEY idx_reset_user

            (user_id),

          KEY idx_reset_code

            (code_hash)

        )

        ENGINE=InnoDB

        DEFAULT CHARSET=utf8mb4

        `,
    );

    await pool.query(
      `

        UPDATE password_reset_codes

        SET used = 1

        WHERE user_id = ?

          AND used = 0

        `,

      [user.id],
    );

    const code = createResetCode();

    const codeHash = sha256(code);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `

        INSERT INTO password_reset_codes

        (

          user_id,

          code_hash,

          expires_at,

          used,

          attempts

        )

        VALUES

        (?, ?, ?, 0, 0)

        `,

      [user.id, codeHash, expiresAt],
    );

    const resetUrl =
      `${getFrontendUrl()}/reset-password` +
      `?email=${encodeURIComponent(user.email)}`;

    await sendMail({
      to: user.email,

      subject: `Registra нууц үг сэргээх`,

      text:
        `Таны Registra нууц үг сэргээх\n\n` +
        `Код 10 минут хүчинтэй.\n\n` +
        resetUrl,

      html: passwordResetCodeEmail({
        firstName: user.first_name,

        code,

        resetUrl,
      }),
    });

    return res.json({
      message: "Reset code sent to your email.",

      email: user.email,
    });
  } catch (err) {
    console.error("POST /api/email/password-code error:", err);

    return res.status(500).json({
      message: "Server error",

      error: String(err.message || err),
    });
  }
});

router.post("/test", authMiddleware, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email || !validEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required",
      });
    }

    await sendMail({
      to: email,

      subject: "Registra email test",

      text: "Registra email system is working.",

      html: `

          <div

            style="

              max-width:600px;

              margin:0 auto;

              padding:40px;

              font-family:Arial,sans-serif;

            "

          >

            <img

            src="cid:registra-logo"

            alt="REGISTRA"

            width="145"

            style="

                display:block;

                width:145px;

                max-width:145px;

                height:auto;

                margin:0 0 16px;

                border:0;

                outline:none;

                text-decoration:none;

            "

            />

            <h2>

              Email system ажиллаж байна

            </h2>

            <p>

              Энэ бол Registra backend-ээс

              илгээсэн тест имэйл.

            </p>

          </div>

        `,
    });

    return res.json({
      message: "Test email sent",

      email,
    });
  } catch (err) {
    console.error("POST /api/email/test error:", err);

    return res.status(500).json({
      message: "Email could not be sent",

      error: String(err.message || err),
    });
  }
});

export default router;
