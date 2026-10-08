function e(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function logo() {
  return `
    <img
      src="cid:registra-logo"
      alt="REGISTRA"
      width="145"
      style="display:block;width:145px;max-width:145px;height:auto;margin:0;padding:0;border:0;outline:none;text-decoration:none;"
    >
  `;
}

function layout(content, preheader = "") {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Registra</title>
</head>
<body bgcolor="#f5f6fb" style="margin:0;padding:0;background:#f5f6fb;font-family:Arial,Helvetica,sans-serif;color:#171927;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f5f6fb" style="width:100%;background:#f5f6fb;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;">
          <tr>
            <td style="padding:0 6px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">${logo()}</td>
                  <td align="right" style="font-size:11px;line-height:16px;color:#9699a8;">Хөтөч дээр харах</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>${content}</td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 10px;color:#8e94a6;font-size:12px;line-height:1.7;">
              © ${new Date().getFullYear()} Registra · Улаанбаатар
              <br>
              Имэйлийн тохиргоо · Нууцлал
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label, href, secondary = false) {
  const background = secondary ? "#ffffff" : "#6847ef";
  const color = secondary ? "#30313b" : "#ffffff";
  const border = secondary ? "1px solid #dfe1ea" : "1px solid #6847ef";

  return `
    <a
      href="${e(href)}"
      style="display:inline-block;background:${background};color:${color};border:${border};text-decoration:none;font-size:13px;font-weight:700;padding:12px 17px;border-radius:9px;"
    >${e(label)}</a>
  `;
}

function photoCell(photo, width = "50%") {
  if (!photo?.src) return "";
  return `
    <td width="${width}" valign="top" style="padding:3px;">
      <img
        src="${e(photo.src)}"
        alt="Event photo"
        width="270"
        style="display:block;width:100%;max-width:270px;height:150px;object-fit:cover;border:0;border-radius:9px;"
      >
    </td>
  `;
}

export function existingParticipantEmail({ firstName, eventName, eventUrl }) {
  return layout(
    `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;background:#ffffff;border:1px solid #e7e8ef;border-radius:16px;">
      <tr>
        <td style="padding:30px;">
          <div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700;">✉ Эвэнтийн урилга</div>
          <h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px;color:#171927;">Сайн байна уу, ${e(firstName || "Хэрэглэгч")}</h1>
          <p style="font-size:15px;line-height:1.7;color:#656b7c;margin:0 0 16px;">Таныг <strong>${e(eventName)}</strong> арга хэмжээнд амжилттай нэмлээ.</p>
          <div style="background:#fafafe;border:1px solid #ececf3;border-radius:12px;padding:18px;margin:18px 0;">
            <div style="font-size:12px;color:#9297a6;margin-bottom:7px;">ЭВЭНТ</div>
            <div style="font-size:19px;font-weight:800;color:#171927;">${e(eventName)}</div>
          </div>
          ${button("Эвэнт харах", eventUrl)}
        </td>
      </tr>
    </table>
  `,
    `${eventName} арга хэмжээнд таныг нэмлээ`,
  );
}

export function newParticipantEmail({ firstName, eventName, setupUrl }) {
  return layout(
    `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;background:#ffffff;border:1px solid #e7e8ef;border-radius:16px;">
      <tr>
        <td style="padding:30px;">
          <div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700;">✉ Хувийн урилга</div>
          <h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px;color:#171927;">Registra-д тавтай морилно уу</h1>
          <p style="font-size:15px;line-height:1.7;color:#656b7c;">Сайн байна уу, ${e(firstName || "Хэрэглэгч")}.</p>
          <p style="font-size:15px;line-height:1.7;color:#656b7c;">Таныг <strong>${e(eventName)}</strong> арга хэмжээнд нэмлээ. Таны Registra бүртгэл автоматаар үүслээ.</p>
          <div style="background:#fafafe;border:1px solid #ececf3;border-radius:12px;padding:18px;margin:18px 0;">
            <div style="font-size:12px;color:#9297a6;margin-bottom:7px;">ЭВЭНТ</div>
            <div style="font-size:19px;font-weight:800;color:#171927;">${e(eventName)}</div>
          </div>
          <p style="font-size:14px;line-height:1.65;color:#656b7c;">Доорх товчийг дарж нууц үгээ тохируулна уу.</p>
          ${button("Нууц үг тохируулах", setupUrl)}
          <p style="font-size:12px;color:#8e94a6;margin-top:18px;">Энэ холбоос 24 цагийн дараа хүчингүй болно.</p>
        </td>
      </tr>
    </table>
  `,
    `${eventName} арга хэмжээнд таныг нэмлээ`,
  );
}

export function passwordResetCodeEmail({ firstName, code, resetUrl }) {
  const safeCode = String(code || "")
    .replace(/\D/g, "")
    .slice(0, 6);
  const boxes = safeCode
    .split("")
    .map(
      (digit) => `
    <td align="center" valign="middle" style="width:48px;height:58px;background:#f0ebff;color:#6847ef;font-size:25px;font-weight:800;border-radius:9px;">${e(digit)}</td>
  `,
    )
    .join('<td style="width:7px;"></td>');

  return layout(
    `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;background:#ffffff;border:1px solid #e7e8ef;border-radius:16px;">
      <tr>
        <td style="padding:30px;">
          <div style="width:46px;height:46px;line-height:46px;text-align:center;background:#f0ebff;border-radius:11px;font-size:20px;">🔒</div>
          <h1 style="font-size:26px;line-height:1.25;margin:18px 0 10px;color:#171927;">Нууц үг сэргээх код</h1>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#656b7c;">Сайн байна уу, ${e(firstName || "Хэрэглэгч")}. Таны Registra бүртгэлийн нууц үгийг сэргээх хүсэлт ирлээ.</p>
          <p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#656b7c;">Доорх 6 оронтой баталгаажуулах кодыг нууц үг сэргээх хуудсанд оруулна уу.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto 16px;"><tr>${boxes}</tr></table>
          <p style="margin:0;text-align:center;color:#858b9d;font-size:12px;line-height:1.6;">Код 10 минутын турш хүчинтэй бөгөөд нэг удаа ашиглагдана.</p>
        </td>
      </tr>
    </table>
  `,
    `Registra нууц үг сэргээх код: ${safeCode}`,
  );
}


export function galleryPublishedEmail({
  firstName,
  organizationName = "Registra",
  eventName,
  eventDate = "",
  imageCount = 0,
  albumUrl,
  downloadUrl = "",
  photos = [],
  nextEventText = "",
}) {
  const total = Math.max(0, Number(imageCount) || 0);
  const visiblePhotos = Array.isArray(photos)
    ? photos.filter((photo) => photo?.src).slice(0, 3)
    : [];

  const remaining = Math.max(0, total - 3);

  const photo = (item, width, height, overlay = "") => {
    if (!item?.src) return "";

    return `
      <td width="${width}" valign="top" style="padding:3px;">
        <a href="${e(albumUrl)}"
           style="display:block;text-decoration:none;">
          <img
            src="${e(item.src)}"
            alt="Эвэнтийн зураг"
            width="${width === "100%" ? "180" : "350"}"
            style="display:block;width:100%;height:${height}px;
                   object-fit:cover;border-radius:10px;
                   border:0;background:#f1f1f8;"
          >
          ${overlay ? `
            <div style="margin-top:-33px;position:relative;
                        text-align:center;color:#ffffff;
                        background:#252347;font-size:14px;
                        font-weight:800;padding:7px;">
              ${e(overlay)}
            </div>
          ` : ""}
        </a>
      </td>
    `;
  };

  let galleryBlock = "";

  if (visiblePhotos.length) {
    const [first, second, third] = visiblePhotos;

    galleryBlock = `
      <table role="presentation"
             width="100%"
             cellpadding="0"
             cellspacing="0"
             border="0"
             style="width:100%;margin:20px 0 12px;">
        <tr>
          <td width="66%" valign="top" style="padding:0;">
            <table role="presentation"
                   width="100%"
                   cellpadding="0"
                   cellspacing="0"
                   border="0">
              <tr>
                ${photo(first, "100%", 252)}
              </tr>
            </table>
          </td>

          <td width="34%" valign="top" style="padding:0;">
            <table role="presentation"
                   width="100%"
                   cellpadding="0"
                   cellspacing="0"
                   border="0">
              ${second ? `
                <tr>${photo(second, "100%", 122)}</tr>
              ` : ""}
              ${third ? `
                <tr>
                  ${photo(
                    third,
                    "100%",
                    122,
                    remaining > 0 ? `+${remaining}` : ""
                  )}
                </tr>
              ` : ""}
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  const orgInitials = String(organizationName || "R")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return layout(
    `
    <table role="presentation"
           width="100%"
           cellspacing="0"
           cellpadding="0"
           border="0"
           bgcolor="#ffffff"
           style="width:100%;background:#ffffff;
                  border:1px solid #e7e8ef;
                  border-radius:16px;">

      <tr>
        <td style="padding:26px 26px 28px;">

          <table role="presentation"
                 cellspacing="0"
                 cellpadding="0"
                 border="0">
            <tr>
              <td align="center"
                  style="width:36px;height:36px;
                         background:#6847ef;
                         border-radius:9px;
                         color:#ffffff;
                         font-size:12px;
                         font-weight:800;">
                ${e(orgInitials)}
              </td>

              <td style="padding-left:11px;">
                <div style="font-size:14px;
                            font-weight:800;
                            color:#171927;">
                  ${e(organizationName)}
                </div>

                <div style="font-size:11px;
                            line-height:17px;
                            color:#9699a8;">
                  ${e(eventName)}
                  ${eventDate ? ` · ${e(eventDate)}` : ""}
                </div>
              </td>
            </tr>
          </table>

          <h1 style="margin:25px 0 10px;
                     color:#171927;
                     font-size:25px;
                     line-height:32px;
                     font-weight:800;">
            ${e(firstName || "Сайн байна уу")},
            ${e(eventName)}-ийн зургууд нийтлэгдлээ
          </h1>

          <p style="margin:0;
                    color:#666978;
                    font-size:14px;
                    line-height:22px;">
            Та оролцсон тул цомгийг үзэж,
            зургаа бүрэн чанараар татаж авах боломжтой.
            Нийт ${total} зураг нийтлэгдлээ.
          </p>

          ${galleryBlock}

          <table role="presentation"
                 cellspacing="0"
                 cellpadding="0"
                 border="0"
                 style="margin-top:15px;">
            <tr>
              <td style="padding-right:8px;">
                ${button(`Цомог үзэх (${total} зураг)`, albumUrl)}
              </td>

              ${downloadUrl ? `
                <td>
                  ${button("⇩ Бүгдийг татах", downloadUrl, true)}
                </td>
              ` : ""}
            </tr>
          </table>

          ${nextEventText ? `
            <div style="margin-top:20px;
                        padding:14px 16px;
                        background:#f2efff;
                        border-radius:10px;
                        color:#6847ef;
                        font-size:12px;
                        line-height:19px;
                        font-weight:700;">
              ▣ ${e(nextEventText)}
            </div>
          ` : ""}

        </td>
      </tr>
    </table>

    <p style="margin:17px 8px 0;
              text-align:center;
              color:#858b9d;
              font-size:12px;
              line-height:19px;">
      Та ${e(eventName)} эвэнтэд оролцсон учир
      энэ имэйлийг хүлээн авлаа.
      <br>
      Цомог эвэнтийн оролцогчдод харагдана.
    </p>
    `,
    `${eventName}-ийн ${total} зураг нийтлэгдлээ`
  );
}



export function meetingInviteEmail({
  recipientName,
  senderName,
  senderCompany = "",
  title,
  description,
  date,
  startTime,
  endTime,
  meetingUrl,
}) {
  const timeText = endTime ? `${startTime} – ${endTime}` : startTime;

  return layout(
    `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;background:#ffffff;border:1px solid #e7e8ef;border-radius:16px;">
      <tr>
        <td style="padding:30px;">
          <div style="display:inline-block;background:#f0ebff;color:#6847ef;border-radius:20px;padding:7px 11px;font-size:12px;font-weight:700;">📅 1:1 уулзалтын урилга</div>

          <h1 style="margin:18px 0 8px;color:#171927;font-size:25px;line-height:32px;font-weight:800;">
            ${e(recipientName || "Сайн байна уу")}, танд уулзалтын урилга ирлээ
          </h1>

          <p style="margin:0 0 18px;color:#666978;font-size:14px;line-height:22px;">
            <strong style="color:#30313b;">${e(senderName || "Registra хэрэглэгч")}</strong>${senderCompany ? ` · ${e(senderCompany)}` : ""} тантай 1:1 уулзалт хийх хүсэлт илгээлээ.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #e5e6ee;border-radius:13px;border-collapse:separate;">
            <tr>
              <td style="padding:18px;">
                <div style="margin:0 0 14px;color:#171927;font-size:19px;line-height:25px;font-weight:800;">${e(title || "1:1 уулзалт")}</div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="50%" style="padding:5px 8px 5px 0;color:#686b7a;font-size:12px;line-height:18px;">📅 ${e(date)}</td>
                    <td width="50%" style="padding:5px 0 5px 8px;color:#686b7a;font-size:12px;line-height:18px;">🕘 ${e(timeText)}</td>
                  </tr>
                </table>

                ${description ? `<div style="margin-top:14px;padding:12px 14px;background:#fafaff;border-left:4px solid #6847ef;border-radius:8px;color:#666978;font-size:12px;line-height:19px;">“${e(description)}”</div>` : ""}
              </td>
            </tr>
          </table>

          <div style="margin-top:20px;">
            ${button("Урилгыг харах", meetingUrl)}
          </div>

          <p style="margin:16px 0 0;color:#8e94a6;font-size:11px;line-height:17px;">
            Урилгыг зөвшөөрөх эсвэл татгалзахын тулд Registra руу нэвтэрч уулзалтын хүсэлтээ нээнэ үү.
          </p>
        </td>
      </tr>
    </table>
    `,
    `${senderName || "Registra хэрэглэгч"} танд 1:1 уулзалтын урилга илгээлээ`,
  );
}
