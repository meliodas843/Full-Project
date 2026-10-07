import fs from "fs";
import path from "path";
import pool from "../db.js";
import { getFrontendUrl, sendMail } from "./mailer.js";
import { galleryPublishedEmail } from "../templates/emailTemplates.js";

function formatEventDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : raw;
}

function findStoredFile(storedName) {
  if (!storedName) return null;

  const candidates = [
    path.resolve(process.cwd(), "uploads", "events", storedName),
    path.resolve(process.cwd(), "backend", "uploads", "events", storedName),
    path.resolve(process.cwd(), "..", "backend", "uploads", "events", storedName),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

export async function sendEventGalleryEmails({
  eventId,
  eventName,
  imageCount,
  excludeUserId = null,
}) {
  const [participants] = await pool.query(
    `
    SELECT DISTINCT
      u.id,
      u.email,
      u.first_name,
      u.last_name
    FROM event_bookings eb
    JOIN users u ON u.id = eb.user_id
    WHERE eb.event_id = ?
      AND u.email IS NOT NULL
      AND u.email <> ''
    `,
    [eventId],
  );

  const [eventRows] = await pool.query(
    `
    SELECT title, start_time, created_by_email
    FROM events
    WHERE id = ?
    LIMIT 1
    `,
    [eventId],
  );

  const event = eventRows[0] || {};

  const [photoRows] = await pool.query(
    `
    SELECT id, original_name, stored_name, mime_type
    FROM event_files
    WHERE event_id = ?
      AND mime_type LIKE 'image/%'
    ORDER BY id ASC
    LIMIT 3
    `,
    [eventId],
  );

  const attachments = [];
  const photos = [];

  photoRows.forEach((photo, index) => {
    const absolutePath = findStoredFile(photo.stored_name);
    if (!absolutePath) return;

    const cid = `registra-gallery-${eventId}-${photo.id}-${index}@registra`;

    attachments.push({
      filename: photo.original_name || photo.stored_name,
      path: absolutePath,
      contentType: photo.mime_type || undefined,
      cid,
      contentDisposition: "inline",
    });

    photos.push({ src: `cid:${cid}` });
  });

  const frontendUrl = getFrontendUrl();
  const albumUrl = `${frontendUrl}/user/events/${eventId}/gallery`;
  const eventDate = formatEventDate(event.start_time);
  const organizationName = event.created_by_email || "Registra";
  const results = [];

  for (const participant of participants) {
    if (excludeUserId && Number(participant.id) === Number(excludeUserId)) {
      continue;
    }

    try {
      await sendMail({
        to: participant.email,
        subject: `${eventName}-ийн зургууд нийтлэгдлээ — ${Number(imageCount) || 0} зураг`,
        text:
          `Сайн байна уу, ${participant.first_name || "оролцогч"}.\n\n` +
          `${eventName}-ийн зургууд нийтлэгдлээ.\n` +
          `Нийт ${Number(imageCount) || 0} зураг.\n\n` +
          `Цомог үзэх: ${albumUrl}`,
        html: galleryPublishedEmail({
          firstName: participant.first_name,
          organizationName,
          eventName,
          eventDate,
          imageCount,
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
