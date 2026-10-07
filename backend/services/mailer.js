import fs from "fs";
import path from "path";
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
  const candidates = [
    path.resolve(process.cwd(), "public", "logo.png"),
    path.resolve(process.cwd(), "..", "public", "logo.png"),
    path.resolve(process.cwd(), "public", "registra-logo.png"),
    path.resolve(process.cwd(), "..", "public", "registra-logo.png"),
    path.resolve(process.cwd(), "assets", "logo.png"),
    path.resolve(process.cwd(), "..", "src", "assets", "logo.png"),
  ];

  const logoPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!logoPath) {
    return null;
  }

  return {
    filename: path.basename(logoPath),
    path: logoPath,
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

  const logo = getLogoAttachment();

  const finalAttachments = [
    ...(logo ? [logo] : []),
    ...attachments,
  ];

  return transporter.sendMail({
    from: `"Registra" <${user}>`,
    to,
    subject,
    text,
    html,
    attachments: finalAttachments,
    ...(replyTo ? { replyTo } : {}),
  });
}

export async function verifyMailer() {
  required("RESET_EMAIL_USER");
  required("RESET_EMAIL_PASS");

  return transporter.verify();
}

export default transporter;
