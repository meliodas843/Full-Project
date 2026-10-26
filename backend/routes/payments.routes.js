// Organizer side of payments: the publish fee for their events and the bank
// account they receive ticket income on. Super admin actions live in
// admin.routes.js.

import fs from "fs";
import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAudit } from "../utils/audit.js";
import { feeApplies, loadSettings, receiptPath, receiptUpload } from "../utils/payments.js";

const router = express.Router();

// Public: whether publishing costs anything, for the home page FAQ. No bank
// details here; those are only shown to signed-in organizers.
router.get("/publish-fee", async (req, res, next) => {
  try {
    const s = await loadSettings();
    return res.json({ required: feeApplies(s), amount: s.publishFee, reviewSlaHours: s.reviewSlaHours });
  } catch (error) {
    next(error);
  }
});

router.use(authMiddleware);

const FEE_COLUMNS = `
  f.id, f.event_id, f.reference, f.amount, f.status, f.paid_amount, f.payer_note,
  f.reject_reason, f.receipt_file IS NOT NULL AS has_receipt,
  UNIX_TIMESTAMP(f.created_at) AS created_ts,
  UNIX_TIMESTAMP(f.submitted_at) AS submitted_ts,
  UNIX_TIMESTAMP(f.decided_at) AS decided_ts,
  e.title AS event_title, e.image_url AS event_image, e.start_time AS event_start,
  e.status AS event_status
`;

// Bank account and fee shown on the payment step.
router.get("/settings", async (req, res, next) => {
  try {
    const s = await loadSettings();
    return res.json({
      publishFee: s.publishFee,
      bankName: s.bankName,
      accountNumber: s.accountNumber,
      accountName: s.accountName,
      reviewSlaHours: s.reviewSlaHours,
    });
  } catch (error) {
    next(error);
  }
});

// The organizer's own publish fees, newest first.
router.get("/publish-fees", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${FEE_COLUMNS}
       FROM publish_fees f JOIN events e ON e.id = f.event_id
       WHERE f.user_id = ?
       ORDER BY f.id DESC`,
      [req.user.id],
    );
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Fee for one of the organizer's events.
router.get("/publish-fees/event/:eventId", async (req, res, next) => {
  try {
    const [[fee]] = await pool.query(
      `SELECT ${FEE_COLUMNS}, e.description AS event_description, e.max_participants AS event_capacity
       FROM publish_fees f JOIN events e ON e.id = f.event_id
       WHERE f.event_id = ? AND f.user_id = ?`,
      [Number(req.params.eventId), req.user.id],
    );
    if (!fee) return res.status(404).json({ message: "Төлбөрийн мэдээлэл олдсонгүй." });
    return res.json(fee);
  } catch (error) {
    next(error);
  }
});

// "Төлбөр төлсөн": the organizer says they have transferred the fee.
router.post("/publish-fees/:id/submit", receiptUpload.single("receipt"), async (req, res, next) => {
  try {
    const [[fee]] = await pool.query(
      `SELECT f.id, f.status, f.reference, f.receipt_file, e.title
       FROM publish_fees f JOIN events e ON e.id = f.event_id
       WHERE f.id = ? AND f.user_id = ?`,
      [Number(req.params.id), req.user.id],
    );

    if (!fee) return res.status(404).json({ message: "Төлбөрийн мэдээлэл олдсонгүй." });
    if (!["awaiting", "rejected"].includes(fee.status)) {
      return res.status(400).json({ message: "Энэ төлбөрийг аль хэдийн илгээсэн байна." });
    }

    const paidAmount = Number(req.body?.paid_amount);
    const note = String(req.body?.payer_note || "").trim().slice(0, 255) || null;

    await pool.query(
      `UPDATE publish_fees
       SET status = 'submitted', submitted_at = NOW(), reject_reason = NULL,
           paid_amount = ?, payer_note = ?, receipt_file = COALESCE(?, receipt_file)
       WHERE id = ?`,
      [Number.isFinite(paidAmount) && paidAmount > 0 ? paidAmount : null, note, req.file?.filename || null, fee.id],
    );

    // Replacing an earlier receipt: remove the old file.
    if (req.file && fee.receipt_file) fs.rm(receiptPath(fee.receipt_file), { force: true }, () => {});

    logAudit(req, {
      type: "create",
      action: "Нийтлэх шимтгэл төлсөн гэж илгээсэн",
      target: fee.title,
      targetDetail: fee.reference,
    });

    return res.json({ message: "Төлбөрийн мэдээлэл илгээгдлээ. Супер админ шалгаад эвэнтийг нийтэлнэ." });
  } catch (error) {
    next(error);
  }
});

// Receipt file, for the organizer who uploaded it.
router.get("/publish-fees/:id/receipt", async (req, res, next) => {
  try {
    const [[fee]] = await pool.query("SELECT receipt_file FROM publish_fees WHERE id = ? AND user_id = ?", [
      Number(req.params.id),
      req.user.id,
    ]);
    const file = receiptPath(fee?.receipt_file);
    if (!file || !fs.existsSync(file)) return res.status(404).json({ message: "Баримт олдсонгүй." });
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.sendFile(file);
  } catch (error) {
    next(error);
  }
});

/* Payout account: where ticket income is transferred. */
router.get("/payout-account", async (req, res, next) => {
  try {
    const [[account]] = await pool.query(
      `SELECT bank_name, account_number, account_name, UNIX_TIMESTAMP(updated_at) AS updated_ts
       FROM payout_accounts WHERE user_id = ?`,
      [req.user.id],
    );
    return res.json(account || null);
  } catch (error) {
    next(error);
  }
});

router.put("/payout-account", async (req, res, next) => {
  try {
    const bankName = String(req.body?.bank_name || "").trim().slice(0, 100);
    const accountNumber = String(req.body?.account_number || "").replace(/\s+/g, "");
    const accountName = String(req.body?.account_name || "").trim().slice(0, 150);

    if (!bankName || !accountName) return res.status(400).json({ message: "Банк болон данс эзэмшигчийг оруулна уу." });
    if (!/^\d{6,20}$/.test(accountNumber)) {
      return res.status(400).json({ message: "Дансны дугаар 6-20 оронтой тоо байна." });
    }

    await pool.query(
      `INSERT INTO payout_accounts (user_id, bank_name, account_number, account_name)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), account_number = VALUES(account_number),
         account_name = VALUES(account_name)`,
      [req.user.id, bankName, accountNumber, accountName],
    );

    logAudit(req, { type: "update", action: "Орлого хүлээн авах данс шинэчилсэн", target: bankName });
    return res.json({ message: "Данс хадгалагдлаа." });
  } catch (error) {
    next(error);
  }
});

export default router;
