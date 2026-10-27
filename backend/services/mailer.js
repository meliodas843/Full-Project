import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Any SMTP provider via SMTP_HOST / SMTP_PORT (e.g. Microsoft 365:
// smtp.office365.com, 587). Without SMTP_HOST it falls back to Gmail.
function transportOptions() {
  const auth = {
    user: process.env.RESET_EMAIL_USER,
    pass: process.env.RESET_EMAIL_PASS,
  };
  const host = String(process.env.SMTP_HOST || "").trim();
  if (!host) return { service: "gmail", auth };

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  return { host, port, secure, requireTLS: !secure, auth };
}

const transporter = nodemailer.createTransport(transportOptions());

function findLogoPath() {
  const candidates = [
    path.resolve(__dirname, "../../src/assets/reigistra-logo-def.png"),
    path.resolve(process.cwd(), "../src/assets/reigistra-logo-def.png"),
    path.resolve(process.cwd(), "src/assets/reigistra-logo-def.png"),
    path.resolve(process.cwd(), "../dist/assets/reigistra-logo-def.png"),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));

  if (!found) {
    console.warn("Registra logo not found. Tried:", candidates);
    return null;
  }

  return found;
}

function getLogoAttachment() {
  const logoPath = findLogoPath();

  if (!logoPath) {
    return null;
  }

  return {
    filename: "reigistra-logo-def.png",
    path: logoPath,
    contentType: "image/png",
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

  const logoAttachment = getLogoAttachment();

  const finalAttachments = [
    ...(logoAttachment ? [logoAttachment] : []),
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
