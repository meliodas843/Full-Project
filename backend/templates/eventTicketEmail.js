import QRCode from "qrcode";
import { sendMail, getFrontendUrl } from "../services/mailer.js";
import { eventTicketEmail } from "../templates/eventTicketEmail.js";

function formatEventDate(value) {
  if (!value) return "Товлоогүй";

  const date = String(value).replace("T", " ").slice(0, 16);
  return date.slice(0, 10);
}

function formatEventTime(value) {
  if (!value) return "Товлоогүй";

  const date = String(value).replace("T", " ").slice(0, 16);
  return date.slice(11, 16);
}

export async function sendEventTicketEmail({
  to,
  firstName,
  eventId,
  eventTitle,
  startTime,
  endTime,
  location = "",
  organizerName = "Registra",
  ticketCode,
}) {
  const frontendUrl = getFrontendUrl().replace(/\/$/, "");
  const ticketUrl = `${frontendUrl}/user/event-ticket/${eventId}`;

  const qrBuffer = await QRCode.toBuffer(ticketCode, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  const html = eventTicketEmail({
    firstName,
    eventName: eventTitle,
    eventDate: formatEventDate(startTime),
    eventTime: `${formatEventTime(startTime)} – ${formatEventTime(endTime)}`,
    location,
    ticketCode,
    ticketUrl,
    qrImageUrl: "cid:event-ticket-qr",
    organizerName,
  });

  return sendMail({
    to,
    subject: `${firstName || "Хэрэглэгч"}, таны тасалбар бэлэн боллоо`,
    text: [
      `${eventTitle} эвэнтийн бүртгэл амжилттай хийгдлээ.`,
      `Огноо: ${formatEventDate(startTime)}`,
      `Цаг: ${formatEventTime(startTime)} – ${formatEventTime(endTime)}`,
      `Тасалбар: ${ticketUrl}`,
    ].join("\n"),
    html,
    attachments: [
      {
        filename: "registra-ticket.png",
        content: qrBuffer,
        contentType: "image/png",
        cid: "event-ticket-qr",
        contentDisposition: "inline",
      },
    ],
  });
}