
import express from "express";
import crypto from "node:crypto";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

const currentUserId = (req) =>
  Number(req.user?.id || req.user?.user_id);

const validId = (value) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0;

function newTicketCode() {
  return `RGS-${crypto.randomBytes(24).toString("hex")}`;
}

async function findEvent(eventId) {
  const [rows] = await pool.query(
    "SELECT id, title, user_id FROM events WHERE id = ? LIMIT 1",
    [eventId]
  );
  return rows[0];
}

async function requireOrganizer(req, res, next) {
  try {
    const event = await findEvent(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        message: "Эвент олдсонгүй."
      });
    }

    if (Number(event.user_id) !== currentUserId(req)) {
      return res.status(403).json({
        message: "Зөвхөн эвент зохион байгуулагч нэвтрэх эрхтэй."
      });
    }

    req.checkinEvent = event;
    next();
  } catch (error) {
    next(error);
  }
}

async function ensureTicket(eventId, userId) {
  const [booking] = await pool.query(
    `SELECT user_id
     FROM event_bookings
     WHERE event_id = ? AND user_id = ?
     LIMIT 1`,
    [eventId, userId]
  );

  if (!booking.length) {
    const error = new Error("Та энэ эвентэд бүртгүүлээгүй байна.");
    error.status = 403;
    throw error;
  }

  await pool.query(
    `INSERT INTO event_checkins
       (event_id, user_id, ticket_code)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [eventId, userId, newTicketCode()]
  );

  const [tickets] = await pool.query(
    `SELECT ticket_code, checked_in_at
     FROM event_checkins
     WHERE event_id = ? AND user_id = ?
     LIMIT 1`,
    [eventId, userId]
  );

  return tickets[0];
}

router.get("/:eventId/my-ticket", async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = currentUserId(req);

    if (!validId(eventId) || !validId(userId)) {
      return res.status(400).json({ message: "Буруу хүсэлт." });
    }

    const event = await findEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Эвент олдсонгүй." });
    }

    const ticket = await ensureTicket(eventId, userId);

    res.json({
      event_id: Number(eventId),
      event_title: event.title,
      ticket_code: ticket.ticket_code,
      checked_in_at: ticket.checked_in_at
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "QR тасалбар авахад алдаа гарлаа."
    });
  }
});

router.get(
  "/:eventId/attendance",
  requireOrganizer,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const [rows] = await pool.query(
        `SELECT
           eb.user_id,
           u.first_name,
           u.last_name,
           u.email,
           ec.ticket_code,
           ec.checked_in_at
         FROM event_bookings eb
         JOIN users u ON u.id = eb.user_id
         LEFT JOIN event_checkins ec
           ON ec.event_id = eb.event_id
          AND ec.user_id = eb.user_id
         WHERE eb.event_id = ?
         ORDER BY
           (ec.checked_in_at IS NULL) ASC,
           ec.checked_in_at DESC,
           u.first_name ASC`,
        [eventId]
      );

      const checkedIn = rows.filter(
        (row) => row.checked_in_at !== null
      ).length;

      res.json({
        event: req.checkinEvent,
        total: rows.length,
        checked_in: checkedIn,
        remaining: rows.length - checkedIn,
        participants: rows
      });
    } catch (error) {
      console.error("ATTENDANCE ERROR:", error);
      res.status(500).json({
        message: "Ирцийн мэдээлэл авахад алдаа гарлаа."
      });
    }
  }
);

router.post(
  "/:eventId/scan",
  requireOrganizer,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const code = String(req.body?.ticket_code || "").trim();

      if (!/^RGS-[a-f0-9]{48}$/.test(code)) {
        return res.status(400).json({
          status: "invalid",
          message: "QR код буруу байна."
        });
      }

      const [result] = await pool.query(
        `UPDATE event_checkins ec
         INNER JOIN event_bookings eb
           ON eb.event_id = ec.event_id
          AND eb.user_id = ec.user_id
         SET
           ec.checked_in_at = NOW(),
           ec.checked_in_by = ?
         WHERE ec.event_id = ?
           AND ec.ticket_code = ?
           AND ec.checked_in_at IS NULL`,
        [currentUserId(req), eventId, code]
      );

      const [rows] = await pool.query(
        `SELECT
           ec.user_id,
           ec.checked_in_at,
           u.first_name,
           u.last_name,
           u.email
         FROM event_checkins ec
         JOIN event_bookings eb
           ON eb.event_id = ec.event_id
          AND eb.user_id = ec.user_id
         JOIN users u ON u.id = ec.user_id
         WHERE ec.event_id = ?
           AND ec.ticket_code = ?
         LIMIT 1`,
        [eventId, code]
      );

      if (!rows.length) {
        return res.status(404).json({
          status: "invalid",
          message: "Энэ эвентийн тасалбар олдсонгүй."
        });
      }

      const participant = rows[0];

      if (result.affectedRows === 0) {
        return res.status(409).json({
          status: "duplicate",
          message: "Аль хэдийн бүртгэгдсэн.",
          participant
        });
      }

      return res.json({
        status: "success",
        message: "Амжилттай бүртгэгдлээ.",
        participant
      });
    } catch (error) {
      console.error("CHECKIN SCAN ERROR:", error);
      res.status(500).json({
        message: "Бүртгэл хийхэд алдаа гарлаа."
      });
    }
  }
);

export default router;
