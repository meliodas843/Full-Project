
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function eventTicketEmail({
  firstName,
  eventName,
  eventDate,
  eventTime,
  location,
  ticketCode,
  ticketUrl,
  qrImageUrl,
  organizerName = "Registra",
}) {
  const safe = escapeHtml;
  const event = safe(eventName);
  const name = safe(firstName || "Хэрэглэгч");

  return `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#191a2c">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center" style="padding:32px 14px">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px">
<tr>
<td style="padding:16px 0;font-size:21px;font-weight:800;color:#6946ef">
REGISTRA
</td>
</tr>
<tr>
<td style="background:#ffffff;border-radius:18px;padding:30px">
<div style="color:#6946ef;font-size:12px;font-weight:700">
БҮРТГЭЛ БАТАЛГААЖЛАА
</div>
<h1 style="font-size:25px;line-height:1.3;margin:15px 0">
${name}, таны тасалбар бэлэн боллоо
</h1>
<p style="font-size:14px;color:#687083;line-height:1.7">
${event} эвэнтийн бүртгэл амжилттай хийгдлээ.
Доорх QR кодыг эвентэд ирэхдээ үзүүлнэ үү.
</p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e8e8f0;border-radius:12px">
<tr>
<td style="background:#191632;color:#ffffff;padding:19px;border-radius:12px 12px 0 0">
<strong style="font-size:18px">${event}</strong>
<div style="font-size:12px;margin-top:7px">
${safe(eventDate)} · ${safe(eventTime)}
</div>
</td>
</tr>
<tr>
<td align="center" style="padding:25px">
<img src="${safe(qrImageUrl)}" width="190" height="190" alt="QR Ticket" style="display:block;width:190px;height:190px">
<p style="font-size:11px;color:#8890a1;margin:18px 0 6px">
Тасалбарын код
</p>
<strong style="font-size:15px;word-break:break-all">
${safe(ticketCode)}
</strong>
</td>
</tr>
<tr>
<td style="padding:15px 22px;border-top:1px solid #eeeeF5;font-size:13px;line-height:1.9">
<strong>Зохион байгуулагч:</strong> ${safe(organizerName)}
<br>
<strong>Байршил:</strong> ${safe(location || "Тодорхойгүй")}
</td>
</tr>
</table>
<div style="text-align:center;margin-top:25px">
<a href="${safe(ticketUrl)}" style="display:inline-block;background:#6946ef;color:#ffffff;text-decoration:none;padding:14px 25px;border-radius:9px;font-weight:700;font-size:14px">
Тасалбараа харах
</a>
</div>
<p style="font-size:12px;color:#9095a5;line-height:1.7;margin-top:22px">
QR кодоо бусдад дамжуулахгүй байхыг зөвлөж байна.
</p>
</td>
</tr>
<tr>
<td align="center" style="padding:22px;color:#9498a6;font-size:12px">
© ${new Date().getFullYear()} Registra · Улаанбаатар
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}
