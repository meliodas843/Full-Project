import pool from "../db.js";
import { getFrontendUrl, sendMail } from "./mailer.js";
import { galleryPublishedEmail } from "../templates/emailTemplates.js";

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
      u.first_name
    FROM event_bookings eb
    JOIN users u ON u.id = eb.user_id
    WHERE eb.event_id = ?
      AND u.email IS NOT NULL
      AND u.email <> ''
    `,
    [eventId]
  );

  const albumUrl = `${getFrontendUrl()}/user/events/${eventId}/gallery`;
  const results = [];

  for (const participant of participants) {
    if (
      excludeUserId &&
      Number(participant.id) === Number(excludeUserId)
    ) {
      continue;
    }

    try {
      await sendMail({
        to: participant.email,
        subject: `${eventName}-ийн зургууд нийтлэгдлээ — ${Number(imageCount) || 0} зураг`,
        text: `${eventName}-ийн зургууд нийтлэгдлээ.\n${Number(imageCount) || 0} зураг\n${albumUrl}`,
        html: galleryPublishedEmail({
          firstName: participant.first_name,
          eventName,
          imageCount,
          albumUrl,
        }),
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
