// Event publish fee: settings, reference codes and receipt uploads.
//
// Flow: an organizer creates an event -> it is saved with status
// 'pending_payment' and a publish_fees row (status 'awaiting'). They pay by
// bank transfer to the account in the settings with the reference code, then
// submit ('submitted', optional receipt). A super admin confirms (event
// becomes 'published', a row is added to payments) or rejects with a reason.
// While the free trial is on, submitting publishes the event straight away
// (the fee is confirmed with trial = 1 and no payment row is added).

import fs from "fs";
import path from "path";
import multer from "multer";
import pool from "../db.js";
import { imageExtension, isAllowedImage, uploadError } from "./uploadSafety.js";

export const SETTING_DEFAULTS = {
  fee_enabled: "1",
  publish_fee: "5000",
  bank_name: "",
  account_number: "",
  account_name: "",
  review_sla_hours: "4",
  trial_mode: "1",
};

export async function loadSettings(db = pool) {
  const [rows] = await db.query("SELECT `key`, `value` FROM payment_settings");
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const s = { ...SETTING_DEFAULTS, ...stored };
  return {
    feeEnabled: s.fee_enabled === "1",
    publishFee: Math.max(0, Math.round(Number(s.publish_fee) || 0)),
    bankName: s.bank_name,
    accountNumber: s.account_number,
    accountName: s.account_name,
    reviewSlaHours: Math.max(1, Math.round(Number(s.review_sla_hours) || 4)),
    trialMode: s.trial_mode === "1",
  };
}

export async function saveSettings(values, db = pool) {
  const rows = Object.entries(values).filter(([key]) => key in SETTING_DEFAULTS);
  for (const [key, value] of rows) {
    await db.query(
      "INSERT INTO payment_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [key, String(value)],
    );
  }
}

// Code the organizer writes in the bank transfer description.
export const feeReference = (eventId) => `REG-${String(eventId).padStart(4, "0")}`;

// Fees are only charged when switched on and a receiving account is set,
// so events never get stuck waiting for a payment nobody can make.
export function feeApplies(settings) {
  return settings.feeEnabled && settings.publishFee > 0 && Boolean(settings.accountNumber);
}

// Creates the fee for a new event and marks the event as waiting for it.
export async function requirePublishFee(db, { eventId, userId, organizationId = null, settings }) {
  await db.query("UPDATE events SET status = 'pending_payment' WHERE id = ?", [eventId]);
  await db.query(
    `INSERT INTO publish_fees (event_id, user_id, organization_id, reference, amount, status)
     VALUES (?, ?, ?, ?, ?, 'awaiting')`,
    [eventId, userId, organizationId, feeReference(eventId), settings.publishFee],
  );
}

/* Receipts are bank screenshots, so they live outside the public /uploads
   folder and are only served to the organizer and admins. */
export const RECEIPT_DIR = path.join(process.cwd(), "private_uploads", "receipts");
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const RECEIPT_TYPES = { "application/pdf": ".pdf" };

export const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, RECEIPT_DIR),
    filename: (req, file, cb) => {
      const ext = RECEIPT_TYPES[file.mimetype] || imageExtension(file.mimetype);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImage(file.mimetype) && !RECEIPT_TYPES[file.mimetype]) {
      return cb(uploadError("Зөвхөн зураг эсвэл PDF файл оруулна уу."));
    }
    cb(null, true);
  },
});

export function receiptPath(fileName) {
  const safe = path.basename(String(fileName || ""));
  return safe ? path.join(RECEIPT_DIR, safe) : null;
}
