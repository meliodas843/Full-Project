import fs from "fs";
import path from "path";
import pool from "../db.js";
import { sendMail } from "./mailer.js";
import { galleryPublishedEmail } from "../templates/emailTemplates.js";

function formatEventDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : raw;
}

function galleryFilePath(imageUrl) {
  const relative = String(imageUrl || "")
    .split("?")[0]
    .replace(/^\/+/, "");
  if (!relative) return null;

  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), "..", relative),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function mimeFromName(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function sendEventGalleryEmails({
  eventId,
  eventName,
  excludeUserId = null,
}) {
  const [participants] = await pool.query(
    `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
     FROM event_bookings eb
     JOIN users u ON u.id = eb.user_id
     WHERE eb.event_id = ?
       AND u.email IS NOT NULL
       AND u.email <> ''`,
    [eventId],
  );

  let event = {};
  const [eventRows] = await pool.query(
    `SELECT title, start_time, created_by_email FROM events WHERE id = ? LIMIT 1`,
    [eventId],
  );

  if (eventRows.length) {
    event = eventRows[0];
  } else {
    const [finishedRows] = await pool.query(
      `SELECT title, start_time, created_by_email
       FROM finished_event WHERE original_event_id = ? LIMIT 1`,
      [eventId],
    );
    event = finishedRows[0] || {};
  }

  const [photoRows] = await pool.query(
    `SELECT id, image_url, original_name
     FROM event_gallery_images
     WHERE event_id = ?
     ORDER BY id DESC
     LIMIT 3`,
    [eventId],
  );

  const attachments = [];
  const photos = [];

  photoRows.forEach((photo, index) => {
    const absolutePath = galleryFilePath(photo.image_url);
    if (!absolutePath) return;

    const cid = `registra-gallery-${eventId}-${photo.id}-${index}@registra`;
    attachments.push({
      filename: photo.original_name || path.basename(absolutePath),
      path: absolutePath,
      contentType: mimeFromName(photo.original_name || absolutePath),
      cid,
      contentDisposition: "inline",
    });
    photos.push({ src: `cid:${cid}` });
  });

  const frontendUrl = String(
    process.env.FRONTEND_URL || "http://194.59.165.105",
  ).replace(/\/+$/, "");

  const albumUrl = `${frontendUrl}/user/history/${eventId}/images`;
  const eventDate = formatEventDate(event.start_time);
  const organizationName = event.created_by_email || "Registra";
  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM event_gallery_images WHERE event_id = ?`,
    [eventId],
  );
  const totalImages = Number(countRow?.total || 0);
  const results = [];

  for (const participant of participants) {
    if (excludeUserId && Number(participant.id) === Number(excludeUserId))
      continue;

    try {
      await sendMail({
        to: participant.email,
        subject: `${eventName}-ийн зургууд нийтлэгдлээ — ${totalImages} зураг`,
        text:
          `Сайн байна уу, ${participant.first_name || "оролцогч"}.\n\n` +
          `${eventName}-ийн зургууд нийтлэгдлээ.\n` +
          `Нийт ${totalImages} зураг.\n\n` +
          `Цомог үзэх: ${albumUrl}`,
        html: galleryPublishedEmail({
          firstName: participant.first_name,
          organizationName,
          eventName,
          eventDate,
          imageCount: totalImages,
          albumUrl,
          photos,
        }),
        attachments,
      });

      results.push({
        user_id: participant.id,
        email: participant.email,
        sent: true,
      });
    } catch (err) {
      console.error("EVENT GALLERY EMAIL ERROR:", participant.email, err);
      results.push({
        user_id: participant.id,
        email: participant.email,
        sent: false,
        error: String(err.message || err),
      });
    }
  }

  return results;
}
