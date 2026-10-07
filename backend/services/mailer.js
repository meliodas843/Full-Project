import nodemailer from "nodemailer";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is missing in .env`);
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

export async function sendMail({ to, subject, text, html }) {
  const user = required("RESET_EMAIL_USER");
  required("RESET_EMAIL_PASS");

  return transporter.sendMail({
    from: `"Registra" <${user}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function verifyMailer() {
  required("RESET_EMAIL_USER");
  required("RESET_EMAIL_PASS");
  return transporter.verify();
}

export default transporter;
