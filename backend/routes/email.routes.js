import express from "express";

import crypto from "crypto";

import fs from "fs";

import path from "path";

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
  const email = String(value || "")
    .trim()
    .toLowerCase();

  const atIndex = email.indexOf("@");

  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) {
    return false;
  }

  const domain = email.slice(atIndex + 1);

  return (
    domain.length >= 3 &&
    domain.includes(".") &&
    !domain.startsWith(".") &&
    !domain.endsWith(".")
  );
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

      DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,

      DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time,

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

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const base = String(frontendUrl || "").replace(/\/+$/, "");
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;

  return `${base}${cleanPath}`;
}

function parseMongoliaDateTime(value) {
  const raw = String(value || "").trim();
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!match) {
    return null;
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4],
    minute: match[5],
  };
}

function formatInviteDate(value) {
  const parts = parseMongoliaDateTime(value);

  if (!parts) {
    return value ? String(value) : "Огноо тодорхойгүй";
  }

  return `${parts.year}.${parts.month}.${parts.day}`;
}

function formatInviteTime(start, end) {
  const startParts = parseMongoliaDateTime(start);

  const endParts = parseMongoliaDateTime(end);

  const startText = startParts ? `${startParts.hour}:${startParts.minute}` : "";

  const endText = endParts ? `${endParts.hour}:${endParts.minute}` : "";

  if (startText && endText) {
    return `${startText} – ${endText}`;
  }

  return startText || endText || "Цаг тодорхойгүй";
}

function getEventImageAttachment(imageUrl) {
  const raw = String(imageUrl || "").trim();

  if (!raw || /^https?:\/\//i.test(raw)) {
    return null;
  }

  let relativePath = raw.split("?")[0].split("#")[0];

  try {
    relativePath = decodeURIComponent(relativePath);
  } catch {
    // Keep the original path.
  }

  relativePath = relativePath.replace(/^\/+/, "");

  if (!relativePath.startsWith("uploads/events/")) {
    return null;
  }

  const candidates = [
    path.resolve(process.cwd(), relativePath),

    path.resolve(process.cwd(), "..", relativePath),

    path.resolve(process.cwd(), "backend", relativePath),
  ];

  const absolutePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!absolutePath) {
    console.warn("Invite image not found. Tried:", candidates);

    return null;
  }

  return {
    filename: path.basename(absolutePath),

    path: absolutePath,

    cid: "registra-event-cover@registra",

    contentDisposition: "inline",
  };
}

function buildEventImage(event, frontendUrl) {
  const attachment = getEventImageAttachment(event?.image_url);

  if (attachment) {
    return {
      src: "cid:registra-event-cover@registra",

      attachments: [attachment],
    };
  }

  const publicUrl = absoluteUrl(event?.image_url, frontendUrl);

  return {
    src: publicUrl,

    attachments: [],
  };
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

  const eventName = String(event?.title || "Registra эвент").trim();

  const description =
    String(event?.description || "").trim() ||
    "Таныг энэхүү арга хэмжээнд хүрэлцэн ирэхийг урьж байна.";

  const organizer = String(event?.created_by_email || "Registra").trim();

  const category = String(event?.category || "Эвент").trim();

  const { src: imageUrl } = buildEventImage(event, frontendUrl);

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

    category: escapeHtml(category),

    dateText: escapeHtml(dateText),

    timeText: escapeHtml(timeText),

    imageUrl: escapeHtml(imageUrl),

    primaryUrl: escapeHtml(primaryUrl),

    eventUrl: escapeHtml(eventUrl),
  };

  const imageBlock = safe.imageUrl
    ? `

      <tr>

        <td style="padding:0;background:#f2f0ff;">

          <img

            src="${safe.imageUrl}"

            alt="${safe.eventName}"

            width="560"

            style="display:block;width:100%;max-width:560px;height:auto;max-height:300px;object-fit:cover;border:0;margin:0;"

          >

        </td>

      </tr>

    `
    : "";

  return `<!doctype html>

<html>

<head>

  <meta charset="utf-8">

  <meta name="viewport" content="width=device-width,initial-scale=1">

  <meta name="color-scheme" content="light">

  <meta name="supported-color-schemes" content="light">

  <title>${safe.eventName}</title>

</head>

<body

  bgcolor="#f5f6fb"

  style="

    margin:0;

    padding:0;

    background:#f5f6fb;

    color:#171725;

    font-family:Arial,Helvetica,sans-serif;

    -webkit-text-size-adjust:100%;

    -ms-text-size-adjust:100%;

  "

>

  <table

    role="presentation"

    width="100%"

    cellspacing="0"

    cellpadding="0"

    border="0"

    bgcolor="#f5f6fb"

    style="width:100%;margin:0;padding:0;background:#f5f6fb;"

  >

    <tr>

      <td align="center" style="padding:20px 10px 28px;">

        <table

          role="presentation"

          width="100%"

          cellspacing="0"

          cellpadding="0"

          border="0"

          style="width:100%;max-width:620px;margin:0 auto;"

        >

          <tr>

            <td style="padding:0 8px 14px;">

              <table

                role="presentation"

                width="100%"

                cellspacing="0"

                cellpadding="0"

                border="0"

              >

                <tr>

                  <td align="left" valign="middle">

                    <img

                      src="cid:registra-logo"

                      alt="REGISTRA"

                      width="116"

                      style="

                        display:block;

                        width:116px;

                        max-width:116px;

                        height:auto;

                        border:0;

                        outline:none;

                        text-decoration:none;

                      "

                    >

                  </td>

                  <td

                    align="right"

                    valign="middle"

                    style="

                      font-size:11px;

                      line-height:16px;

                      color:#9699a8;

                    "

                  >

                    Хөтөч дээр харах

                  </td>

                </tr>

              </table>

            </td>

          </tr>

          <tr>

            <td

              bgcolor="#ffffff"

              style="

                background:#ffffff;

                border:1px solid #e7e7ef;

                border-radius:16px;

                padding:24px;

              "

            >

              <table

                role="presentation"

                width="100%"

                cellspacing="0"

                cellpadding="0"

                border="0"

              >

                <tr>

                  <td style="padding:0 0 16px;">

                    <span

                      style="

                        display:inline-block;

                        padding:6px 10px;

                        background:#f0ebff;

                        border-radius:7px;

                        color:#6c4df6;

                        font-size:11px;

                        line-height:16px;

                        font-weight:700;

                      "

                    >

                      ✉ Хувийн урилга

                    </span>

                  </td>

                </tr>

                <tr>

                  <td

                    style="

                      padding:0 0 8px;

                      color:#171725;

                      font-size:23px;

                      line-height:30px;

                      font-weight:800;

                    "

                  >

                    ${safe.firstName}, ${safe.eventName}-д урьж байна

                  </td>

                </tr>

                <tr>

                  <td

                    style="

                      padding:0 0 16px;

                      color:#666978;

                      font-size:14px;

                      line-height:22px;

                    "

                  >

                    <strong style="color:#30313b;">${safe.organizer}</strong>

                    таныг доорх эвэнтэд урьлаа.

                    ${
                      registered
                        ? "Таны Registra бүртгэл бэлэн тул эвэнтийн дэлгэрэнгүйг шууд харах боломжтой."
                        : "Registra-д бүртгүүлээд урилгаа үргэлжлүүлнэ үү."
                    }

                  </td>

                </tr>

                <tr>

                  <td style="padding:0 0 18px;">

                    <table

                      role="presentation"

                      width="100%"

                      cellspacing="0"

                      cellpadding="0"

                      border="0"

                      bgcolor="#fafaff"

                      style="

                        width:100%;

                        background:#fafaff;

                        border-radius:9px;

                      "

                    >

                      <tr>

                        <td

                          width="4"

                          bgcolor="#6c4df6"

                          style="width:4px;background:#6c4df6;"

                        ></td>

                        <td

                          style="

                            padding:12px 14px;

                            color:#666978;

                            font-size:12px;

                            line-height:19px;

                            font-style:italic;

                          "

                        >

                          “${safe.description}”

                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

                <tr>

                  <td style="padding:0 0 16px;">

                    <table

                      role="presentation"

                      width="100%"

                      cellspacing="0"

                      cellpadding="0"

                      border="0"

                      style="

                        width:100%;

                        border:1px solid #e5e6ee;

                        border-radius:13px;

                        border-collapse:separate;

                        overflow:hidden;

                      "

                    >

                      ${imageBlock}

                      <tr>

                        <td

                          bgcolor="#ffffff"

                          style="

                            padding:16px 18px;

                            background:#ffffff;

                          "

                        >

                          <div

                            style="

                              margin:0 0 12px;

                              color:#171725;

                              font-size:18px;

                              line-height:24px;

                              font-weight:800;

                            "

                          >

                            ${safe.eventName}

                          </div>

                          <table

                            role="presentation"

                            width="100%"

                            cellspacing="0"

                            cellpadding="0"

                            border="0"

                          >

                            <tr>

                              <td

                                width="50%"

                                valign="top"

                                style="

                                  padding:4px 8px 4px 0;

                                  color:#686b7a;

                                  font-size:12px;

                                  line-height:18px;

                                "

                              >

                                📅 ${safe.dateText}

                              </td>

                              <td

                                width="50%"

                                valign="top"

                                style="

                                  padding:4px 0 4px 8px;

                                  color:#686b7a;

                                  font-size:12px;

                                  line-height:18px;

                                "

                              >

                                🕘 ${safe.timeText}

                              </td>

                            </tr>

                            <tr>

                              <td

                                width="50%"

                                valign="top"

                                style="

                                  padding:4px 8px 4px 0;

                                  color:#686b7a;

                                  font-size:12px;

                                  line-height:18px;

                                "

                              >

                                🏷 ${safe.category}

                              </td>

                              <td

                                width="50%"

                                valign="top"

                                style="

                                  padding:4px 0 4px 8px;

                                  color:#686b7a;

                                  font-size:12px;

                                  line-height:18px;

                                  word-break:break-word;

                                "

                              >

                                👤 ${safe.organizer}

                              </td>

                            </tr>

                          </table>

                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

                <tr>

                  <td style="padding:0 0 18px;">

                    <table

                      role="presentation"

                      width="100%"

                      cellspacing="0"

                      cellpadding="0"

                      border="0"

                      style="

                        width:100%;

                        border:1px solid #e5e6ee;

                        border-radius:13px;

                        border-collapse:separate;

                      "

                    >

                      <tr>

                        <td style="padding:16px 18px;">

                          <div

                            style="

                              margin:0 0 10px;

                              color:#777a88;

                              font-size:12px;

                              line-height:18px;

                              font-weight:800;

                              letter-spacing:.25px;

                            "

                          >

                            БҮРТГЭЛИЙН МЭДЭЭЛЭЛ

                          </div>

                          <table

                            role="presentation"

                            width="100%"

                            cellspacing="0"

                            cellpadding="0"

                            border="0"

                          >

                            <tr>

                              <td

                                width="31%"

                                valign="top"

                                style="

                                  padding:4px 10px 4px 0;

                                  color:#8b8e9b;

                                  font-size:12px;

                                  line-height:18px;

                                "

                              >

                                Нэр

                              </td>

                              <td

                                valign="top"

                                style="

                                  padding:4px 0;

                                  color:#333540;

                                  font-size:12px;

                                  line-height:18px;

                                  font-weight:700;

                                "

                              >

                                ${safe.recipientName}

                              </td>

                            </tr>

                            <tr>

                              <td

                                valign="top"

                                style="

                                  padding:4px 10px 4px 0;

                                  color:#8b8e9b;

                                  font-size:12px;

                                  line-height:18px;

                                "

                              >

                                Имэйл

                              </td>

                              <td

                                valign="top"

                                style="

                                  padding:4px 0;

                                  color:#333540;

                                  font-size:12px;

                                  line-height:18px;

                                  font-weight:700;

                                  word-break:break-word;

                                "

                              >

                                ${safe.email}

                              </td>

                            </tr>

                            <tr>

                              <td

                                valign="top"

                                style="

                                  padding:4px 10px 4px 0;

                                  color:#8b8e9b;

                                  font-size:12px;

                                  line-height:18px;

                                "

                              >

                                Байгууллага

                              </td>

                              <td

                                valign="top"

                                style="

                                  padding:4px 0;

                                  color:#333540;

                                  font-size:12px;

                                  line-height:18px;

                                  font-weight:700;

                                "

                              >

                                ${safe.companyName}

                              </td>

                            </tr>

                          </table>

                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

                <tr>

                  <td style="padding:0;">

                    <table

                      role="presentation"

                      cellspacing="0"

                      cellpadding="0"

                      border="0"

                    >

                      <tr>

                        <td

                          bgcolor="#6c4df6"

                          style="

                            background:#6c4df6;

                            border-radius:8px;

                          "

                        >

                          <a

                            href="${safe.primaryUrl}"

                            target="_blank"

                            style="

                              display:inline-block;

                              padding:12px 17px;

                              color:#ffffff;

                              text-decoration:none;

                              font-size:13px;

                              line-height:18px;

                              font-weight:800;

                            "

                          >

                            ${registered ? "✓ Урилга хүлээн авах" : "Registra-д бүртгүүлэх"}

                          </a>

                        </td>

                        <td width="8"></td>

                        <td

                          bgcolor="#ffffff"

                          style="

                            background:#ffffff;

                            border:1px solid #dedee7;

                            border-radius:8px;

                          "

                        >

                          <a

                            href="${safe.eventUrl}"

                            target="_blank"

                            style="

                              display:inline-block;

                              padding:11px 16px;

                              color:#3c3d48;

                              text-decoration:none;

                              font-size:13px;

                              line-height:18px;

                              font-weight:700;

                            "

                          >

                            Эвэнт харах

                          </a>

                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

              </table>

            </td>

          </tr>

          <tr>

            <td

              align="center"

              style="

                padding:16px 20px 0;

                color:#8a8d9c;

                font-size:12px;

                line-height:18px;

              "

            >

              ${
                registered
                  ? `Та Registra-д <strong>${safe.email}</strong> хаягаар бүртгэлтэй учир энэ урилгыг хүлээн авлаа.`
                  : `Энэ урилгыг <strong>${safe.email}</strong> хаягт илгээлээ.`
              }

              <div

                style="

                  margin-top:10px;

                  color:#aaaabd;

                  font-size:10px;

                  line-height:16px;

                "

              >

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

        attachments: buildEventImage(event, frontendUrl).attachments,

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
      `SELECT COUNT(*) AS total
    FROM event_gallery_images
    WHERE event_id = ?`,
      [eventId],
    );

    const imageCount = Number(fileRows[0]?.total || 0);

    const frontendUrl = getFrontendUrl();

    const albumUrl = `http://194.59.165.105/user/history/${eventId}/images`;

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
