import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.RESET_EMAIL_USER,
    pass: process.env.RESET_EMAIL_PASS,
  },
});

function getLogoAttachment() {
  const possiblePaths = [
    path.resolve(
      __dirname,
      "../../src/assets/registra-logo-def.png"
    ),

    path.resolve(
      process.cwd(),
      "../src/assets/registra-logo-def.png"
    ),

    path.resolve(
      process.cwd(),
      "src/assets/registra-logo-def.png"
    ),

    path.resolve(
      "/var/www/registra/src/assets/registra-logo-def.png"
    ),
  ];

  const logoPath = possiblePaths.find((filePath) =>
    fs.existsSync(filePath)
  );

  if (!logoPath) {
    console.error(
      "REGISTRA LOGO NOT FOUND. Checked:",
      possiblePaths
    );

    return null;
  }

  console.log("Registra email logo:", logoPath);

  return {
    filename: "registra-logo-def.png",
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