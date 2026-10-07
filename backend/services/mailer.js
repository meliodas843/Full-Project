import "dotenv/config";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const registraLogoPath =
  path.resolve(
    __dirname,
    "../../src/assets/registra-logo-def.png"
  );

const transporter =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user:
        process.env.RESET_EMAIL_USER,

      pass:
        process.env.RESET_EMAIL_PASS,
    },
  });

export function getFrontendUrl() {
  return String(
    process.env.FRONTEND_URL || ""
  ).replace(/\/+$/, "");
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  attachments = [],
}) {
  if (!to) {
    throw new Error(
      "Email recipient is required"
    );
  }

  if (
    !process.env.RESET_EMAIL_USER
  ) {
    throw new Error(
      "RESET_EMAIL_USER is missing"
    );
  }

  if (
    !process.env.RESET_EMAIL_PASS
  ) {
    throw new Error(
      "RESET_EMAIL_PASS is missing"
    );
  }

  return transporter.sendMail({
    from:
      `"Registra" <${process.env.RESET_EMAIL_USER}>`,

    to,

    subject,

    text,

    html,

    attachments: [
      {
        filename:
          "registra-logo-def.png",

        path:
          registraLogoPath,

        cid:
          "registra-logo",
      },

      ...attachments,
    ],
  });
}

export async function verifyMailer() {
  return transporter.verify();
}

export default transporter;