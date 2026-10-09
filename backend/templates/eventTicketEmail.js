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
  const e = escapeHtml;

  return `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body bgcolor="#f5f6fb" style="margin:0;padding:0;background:#f5f6fb;font-family:Arial,Helvetica,sans-serif;color:#171927">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
${e(eventName)} эвэнтийн QR тасалбар бэлэн боллоо.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f6fb" style="width:100%;background:#f5f6fb">
<tr>
<td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px">
<tr>
<td style="padding:0 6px 16px">
<img src="cid:registra-logo" alt="REGISTRA" width="145" style="display:block;width:145px;max-width:145px;height:auto;border:0">
</td>
</tr>
<tr>
<td style="background:#ffffff;border:1px solid #e7e8ef;border-radius:16px;padding:28px">
<div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700">
✓ Бүртгэл баталгаажлаа
</div>

<h1 style="font-size:26px;line-height:1.3;color:#171927;margin:20px 0 12px;font-weight:800">
${e(firstName || "Хэрэглэгч")}, таны тасалбар бэлэн боллоо
</h1>

<p style="font-size:14px;line-height:1.7;color:#656b7c;margin:0 0 22px">
Та <strong>${e(eventName)}</strong> эвентэд амжилттай бүртгүүллээ.
Доорх QR кодыг эвентэд ирэхдээ үзүүлнэ үү.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e5e6ee;border-radius:13px">
<tr>
<td bgcolor="#191632" style="background:#191632;padding:20px;color:#ffffff;border-radius:12px 12px 0 0">
<div style="font-size:19px;line-height:26px;font-weight:800">
${e(eventName)}
</div>
<div style="font-size:12px;color:#d8d5f1;margin-top:8px">
${e(eventDate)} · ${e(eventTime)}
</div>
</td>
</tr>

<tr>
<td align="center" style="padding:27px 16px">
<div style="font-size:12px;color:#858b9d;margin-bottom:14px">
ЭВЭНТИЙН QR ТАСАЛБАР
</div>
<img src="${e(qrImageUrl)}" alt="QR Ticket" width="210" height="210" style="display:block;width:210px;height:210px;border:0">
<p style="font-size:11px;color:#8e94a6;margin:17px 0 6px">
Тасалбарын код
</p>
<div style="font-size:12px;font-weight:700;color:#171927;word-break:break-all">
${e(ticketCode)}
</div>
</td>
</tr>

<tr>
<td style="padding:17px 20px;border-top:1px solid #e7e8ef;font-size:13px;line-height:2;color:#656b7c">
<div><strong style="color:#171927">📅 Огноо:</strong> ${e(eventDate)}</div>
<div><strong style="color:#171927">🕘 Цаг:</strong> ${e(eventTime)}</div>
<div><strong style="color:#171927">📍 Байршил:</strong> ${e(location || "Тодорхойгүй")}</div>
<div><strong style="color:#171927">🏢 Зохион байгуулагч:</strong> ${e(organizerName)}</div>
</td>
</tr>
</table>

<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:25px auto 0">
<tr>
<td align="center" bgcolor="#6847ef" style="background:#6847ef;border-radius:9px">
<a href="${e(ticketUrl)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 25px">
Тасалбараа харах
</a>
</td>
</tr>
</table>

<p style="font-size:12px;line-height:1.7;color:#8e94a6;margin:23px 0 0">
Тасалбарын QR кодыг бусдад дамжуулахгүй байхыг зөвлөж байна.
</p>
</td>
</tr>

<tr>
<td align="center" style="padding:22px 10px;color:#8e94a6;font-size:12px;line-height:1.7">
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