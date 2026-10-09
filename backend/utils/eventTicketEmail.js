import QRCode from "qrcode";
import { sendMail, getFrontendUrl } from "../services/mailer.js";
import { eventTicketEmail } from "../templates/eventTicketEmail.js";

function formatDate(value) {
  if (!value) return "Товлоогүй";

  const text = String(value).replace("T", " ");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  return match ? `${match[1]}.${match[2]}.${match[3]}` : "Товлоогүй";
}

function formatTime(value) {
  if (!value) return "";

  const match = String(value).match(/(?:T|\s)(\d{2}):(\d{2})/);

  return match ? `${match[1]}:${match[2]}` : "";
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
  if (
    !/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/.test(
      String(ticketCode || ""),
    )
  ) {
    throw new Error("Invalid ticket code");
  }

  const frontendUrl = getFrontendUrl().replace(/\/+$/, "");

  const ticketUrl = `${frontendUrl}/user/event-ticket/${eventId}`;

  const qrBuffer = await QRCode.toBuffer(ticketCode, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  const eventDate = formatDate(startTime);

  const start = formatTime(startTime);
  const end = formatTime(endTime);

  const eventTime =
    start && end ? `${start} – ${end}` : start || end || "Товлоогүй";

  const html = eventTicketEmail({
    firstName,
    eventName: eventTitle,
    eventDate,
    eventTime,
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
      `Огноо: ${eventDate}`,
      `Цаг: ${eventTime}`,
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
