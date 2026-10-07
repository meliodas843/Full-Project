function e(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function layout(content, preheader = "") {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registra</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fb;font-family:Arial,Helvetica,sans-serif;color:#171927">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f6fb">
<tr><td align="center" style="padding:30px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px">
<tr><td style="padding:0 0 18px;font-size:22px;font-weight:800;color:#6847ef">➤ REGISTRA</td></tr>
<tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border:1px solid #e7e8ef;border-radius:16px"><tr><td style="padding:30px">${content}</td></tr></table></td></tr>
<tr><td align="center" style="padding:22px 10px;color:#8e94a6;font-size:12px;line-height:1.7">© ${new Date().getFullYear()} Registra · Улаанбаатар<br>Тусламж · Нууцлал</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(label, href) {
  return `<a href="${e(href)}" style="display:inline-block;background:#6847ef;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;border-radius:9px">${e(label)}</a>`;
}

export function existingParticipantEmail({ firstName, eventName, eventUrl }) {
  return layout(
    `
<div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700">✉ Эвэнтийн урилга</div>
<h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px">Сайн байна уу, ${e(firstName || "Хэрэглэгч")}</h1>
<p style="font-size:15px;line-height:1.7;color:#656b7c">Таныг <strong>${e(eventName)}</strong> арга хэмжээнд амжилттай нэмлээ.</p>
<div style="background:#fafafe;border:1px solid #ececf3;border-radius:12px;padding:18px;margin:18px 0"><div style="font-size:12px;color:#9297a6;margin-bottom:7px">ЭВЭНТ</div><div style="font-size:19px;font-weight:800">${e(eventName)}</div></div>
${button("Эвэнт харах", eventUrl)}
`,
    `${eventName} арга хэмжээнд таныг нэмлээ`,
  );
}

export function newParticipantEmail({ firstName, eventName, setupUrl }) {
  return layout(
    `
<div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700">✉ Хувийн урилга</div>
<h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px">Registra-д тавтай морилно уу</h1>
<p style="font-size:15px;line-height:1.7;color:#656b7c">Сайн байна уу, ${e(firstName || "Хэрэглэгч")}.</p>
<p style="font-size:15px;line-height:1.7;color:#656b7c">Таныг <strong>${e(eventName)}</strong> арга хэмжээнд нэмлээ. Таны Registra бүртгэл автоматаар үүслээ.</p>
<div style="background:#fafafe;border:1px solid #ececf3;border-radius:12px;padding:18px;margin:18px 0"><div style="font-size:12px;color:#9297a6;margin-bottom:7px">ЭВЭНТ</div><div style="font-size:19px;font-weight:800">${e(eventName)}</div></div>
<p style="font-size:14px;line-height:1.65;color:#656b7c">Доорх товчийг дарж нууц үгээ тохируулна уу.</p>
${button("Нууц үг тохируулах", setupUrl)}
<p style="font-size:12px;color:#8e94a6;margin-top:18px">Энэ холбоос 24 цагийн дараа хүчингүй болно.</p>
`,
    `${eventName} арга хэмжээнд таныг нэмлээ`,
  );
}

export function passwordResetCodeEmail({ firstName, code, resetUrl }) {
  const boxes = String(code)
    .split("")
    .map(
      (digit) =>
        `<td align="center" style="width:48px;height:58px;background:#f0ebff;color:#6847ef;font-size:25px;font-weight:800;border-radius:9px">${e(digit)}</td>`,
    )
    .join('<td style="width:7px"></td>');

  return layout(
    `
<div style="width:46px;height:46px;line-height:46px;text-align:center;background:#f0ebff;border-radius:11px;font-size:20px">🔒</div>
<h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px">Нууц үг сэргээх код</h1>
<p style="font-size:15px;line-height:1.7;color:#656b7c">Сайн байна уу, ${e(firstName || "Хэрэглэгч")}. Таны Registra бүртгэлийн нууц үгийг сэргээх хүсэлт ирлээ.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto">${boxes}</table>
<p style="text-align:center;color:#858b9d;font-size:12px">Код 10 минутын турш хүчинтэй бөгөөд нэг удаа ашиглагдана.</p>
<div style="text-align:center;margin-top:22px">${button("Нууц үг сэргээх", resetUrl)}</div>
`,
    `Registra нууц үг сэргээх код: ${code}`,
  );
}

export function galleryPublishedEmail({
  firstName,
  eventName,
  imageCount,
  albumUrl,
}) {
  return layout(
    `
<div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700">▣ Зургийн цомог</div>
<h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px">${e(eventName)}-ийн зургууд нийтлэгдлээ</h1>
<p style="font-size:15px;line-height:1.7;color:#656b7c">Сайн байна уу, ${e(firstName || "оролцогч")}. Таны оролцсон эвэнтийн зургийн цомог бэлэн боллоо.</p>
<div style="background:#fafafe;border:1px solid #ececf3;border-radius:12px;padding:18px;margin:18px 0"><div style="font-size:12px;color:#9297a6;margin-bottom:7px">ЦОМОГ</div><div style="font-size:19px;font-weight:800">${e(eventName)}</div><div style="font-size:13px;color:#747a8b;margin-top:7px">${Number(imageCount) || 0} зураг</div></div>
${button("Цомог үзэх", albumUrl)}
`,
    `${eventName}-ийн зургууд нийтлэгдлээ`,
  );
}
