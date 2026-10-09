import QRCode from "qrcode";
import { sendMail, getFrontendUrl } from "./mailer.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

function formatDate(value) {
  if (!value) return "Товлоогүй";

  const date = String(value)
    .replace("T", " ")
    .replace(/\.\d+Z?$/, "")
    .slice(0, 16);

  return escapeHtml(date);
}

export async function sendEventTicketEmail({
  to,
  firstName,
  eventId,
  eventTitle,
  startTime,
  endTime,
  ticketCode,
}) {
  const ticketUrl = `${getFrontendUrl()}/user/event-ticket/${eventId}`;

  const qr = await QRCode.toBuffer(ticketCode, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  const name = escapeHtml(firstName || "Хэрэглэгч");
  const title = escapeHtml(eventTitle);
  const code = escapeHtml(ticketCode);

  const html = `
    <!DOCTYPE html>
    <html lang="mn">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0;padding:32px 12px;background:#f4f5fb;font-family:Arial,sans-serif;color:#202238">
      <table role="presentation" style="max-width:620px;width:100%;margin:auto;background:#fff;border-radius:20px;border-collapse:separate;overflow:hidden">
        <tr>
          <td style="padding:26px 32px;background:#181536;color:#fff">
            <strong style="font-size:22px">REGISTRA</strong>
            <p style="margin:8px 0 0;color:#c8c4ee;font-size:13px">Эвентийн цахим тасалбар</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="color:#6948f5;font-weight:bold;margin:0 0 12px">БҮРТГЭЛ БАТАЛГААЖЛАА</p>
            <h1 style="font-size:25px;margin:0 0 12px">Сайн байна уу, ${name}!</h1>
            <p style="color:#687087;line-height:1.7">
              Та эвентэд амжилттай бүртгүүллээ.
              Доорх QR тасалбараа эвентийн үүдэнд үзүүлнэ үү.
            </p>
            <div style="background:#f5f4fc;border-radius:14px;padding:20px;margin:24px 0">
              <h2 style="font-size:21px;margin:0 0 16px">${title}</h2>
              <p style="margin:6px 0"><strong>Эхлэх:</strong> ${formatDate(startTime)}</p>
              <p style="margin:6px 0"><strong>Дуусах:</strong> ${formatDate(endTime)}</p>
            </div>
            <div style="text-align:center;border:1px solid #e6e7ef;border-radius:14px;padding:24px">
              <img src="cid:event-ticket-qr" alt="QR тасалбар" width="240" height="240" style="display:block;margin:auto">
              <p style="font-size:12px;color:#788098;margin:14px 0 5px">Тасалбарын код</p>
              <p style="font-size:11px;overflow-wrap:anywhere">${code}</p>
            </div>
            <div style="text-align:center;margin:28px 0">
              <a href="${escapeHtml(ticketUrl)}" style="display:inline-block;padding:14px 28px;background:#6948f5;color:white;text-decoration:none;border-radius:10px;font-weight:bold">
                Тасалбараа харах
              </a>
            </div>
            <p style="font-size:12px;color:#788098;line-height:1.6">
              Энэхүү QR код нь зөвхөн таны тасалбарт хамаарна.
              Бусдад дамжуулахгүй байхыг зөвлөж байна.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({
    to,
    subject: `Бүртгэл баталгаажлаа: ${eventTitle}`,
    text: `Та ${eventTitle} эвентэд бүртгүүллээ.\nЭхлэх: ${formatDate(startTime)}\nДуусах: ${formatDate(endTime)}\nТасалбар: ${ticketUrl}`,
    html,
    attachments: [
      {
        filename: "event-ticket.png",
        content: qr,
        contentType: "image/png",
        cid: "event-ticket-qr",
        contentDisposition: "inline",
      },
    ],
  });
}