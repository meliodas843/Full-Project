import nodemailer from "nodemailer";

function required(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} is missing in .env`);
  }

  return value;
}

export function getFrontendUrl() {
  return required("FRONTEND_URL").replace(/\/+$/, "");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.RESET_EMAIL_USER,
    pass: process.env.RESET_EMAIL_PASS,
  },
});

function getLogoAttachment() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="72" viewBox="0 0 300 72">
      <rect width="300" height="72" rx="10" fill="#ffffff"/>
      <g transform="translate(16 14)" fill="#6c4df6">
        <path d="M0 0h17l21 22-21 22H0l21-22L0 0z"/>
        <circle cx="48" cy="22" r="8"/>
      </g>
      <text x="82" y="46" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="700" fill="#171725">REGISTRA</text>
    </svg>
  `.trim();

  return {
    filename: "registra-logo.svg",
    content: Buffer.from(svg, "utf8"),
    contentType: "image/svg+xml",
    cid: "registra-logo",
    contentDisposition: "inline",
  };
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  attachments = [],
  replyTo,
}) {
  const user = required("RESET_EMAIL_USER");
  required("RESET_EMAIL_PASS");

  return transporter.sendMail({
    from: `"Registra" <${user}>`,
    to,
    subject,
    text,
    html,
    attachments: [getLogoAttachment(), ...attachments],
    ...(replyTo ? { replyTo } : {}),
  });
}

export async function verifyMailer() {
  required("RESET_EMAIL_USER");
  required("RESET_EMAIL_PASS");
  return transporter.verify();
}

export default transporter;
