import express from "express";
import crypto from "node:crypto";
import pool from "../db.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(auth);

const currentUserId = (req) => Number(req.user?.id || req.user?.user_id);

const validId = (value) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0;

function newTicketCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const segment = () =>
    Array.from(
      { length: 3 },
      () => alphabet[crypto.randomInt(alphabet.length)]
    ).join("");

  return `${segment()}-${segment()}-${segment()}`;
}

async function findEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.created_by,
      e.created_by_email,
      e.organization_id,
      o.user_id AS organization_owner_id
    FROM events e
    LEFT JOIN organizations o
      ON o.id = e.organization_id
    WHERE e.id = ?
    LIMIT 1
    `,
    [eventId],
  );

  return rows[0] || null;
}

async function requireOrganizer(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = currentUserId(req);

    if (!validId(eventId) || !validId(userId)) {
      return res.status(400).json({
        message: "Буруу хүсэлт.",
      });
    }

    const event = await findEvent(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Эвент олдсонгүй.",
      });
    }

    const [users] = await pool.query(
      `
      SELECT id, email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    if (!users.length) {
      return res.status(403).json({
        message: "Хэрэглэгч олдсонгүй.",
      });
    }

    const loggedInEmail = String(users[0].email || "")
      .trim()
      .toLowerCase();

    const creatorEmail = String(event.created_by_email || "")
      .trim()
      .toLowerCase();

    const isCreatorById =
      event.created_by != null && Number(event.created_by) === userId;

    const isCreatorByEmail =
      event.created_by == null &&
      Boolean(loggedInEmail) &&
      loggedInEmail === creatorEmail;

    const isOrganizationOwner =
      event.organization_id != null &&
      event.organization_owner_id != null &&
      Number(event.organization_owner_id) === userId;

    if (!isCreatorById && !isCreatorByEmail && !isOrganizationOwner) {
      return res.status(403).json({
        message: "Зөвхөн эвент зохион байгуулагч нэвтрэх эрхтэй.",
      });
    }

    req.checkinEvent = event;
    next();
  } catch (error) {
    next(error);
  }
}

async function ensureTicket(eventId, userId) {
  const [bookings] = await pool.query(
    `SELECT user_id
     FROM event_bookings
     WHERE event_id = ?
       AND user_id = ?
     LIMIT 1`,
    [eventId, userId],
  );

  if (!bookings.length) {
    const error = new Error("Та энэ эвентэд бүртгүүлээгүй байна.");
    error.status = 403;
    throw error;
  }

  await pool.query(
    `INSERT INTO event_checkins
       (event_id, user_id, ticket_code)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [eventId, userId, newTicketCode()],
  );

  const [tickets] = await pool.query(
    `SELECT ticket_code, checked_in_at
     FROM event_checkins
     WHERE event_id = ?
       AND user_id = ?
     LIMIT 1`,
    [eventId, userId],
  );

  if (!tickets.length) {
    throw new Error("QR тасалбар үүсгэж чадсангүй.");
  }

  return tickets[0];
}

router.get("/:eventId/my-ticket", async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = currentUserId(req);

    if (!validId(eventId) || !validId(userId)) {
      return res.status(400).json({
        message: "Буруу хүсэлт.",
      });
    }

    const event = await findEvent(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Эвент олдсонгүй.",
      });
    }

    const ticket = await ensureTicket(eventId, userId);

    return res.json({
      event_id: Number(eventId),
      event_title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location || "",
      ticket_code: ticket.ticket_code,
      checked_in_at: ticket.checked_in_at,
    });
  } catch (error) {
    console.error("MY TICKET ERROR:", error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "QR тасалбар авахад алдаа гарлаа.",
    });
  }
});

router.get("/:eventId/attendance", requireOrganizer, async (req, res) => {
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
         JOIN users u
           ON u.id = eb.user_id
         LEFT JOIN event_checkins ec
           ON ec.event_id = eb.event_id
          AND ec.user_id = eb.user_id
         WHERE eb.event_id = ?
         ORDER BY
           (ec.checked_in_at IS NULL) ASC,
           ec.checked_in_at DESC,
           u.first_name ASC`,
      [eventId],
    );

    const checkedIn = rows.filter((row) => row.checked_in_at !== null).length;

    return res.json({
      event: req.checkinEvent,
      total: rows.length,
      checked_in: checkedIn,
      remaining: rows.length - checkedIn,
      participants: rows,
    });
  } catch (error) {
    console.error("ATTENDANCE ERROR:", error);

    return res.status(500).json({
      message: "Ирцийн мэдээлэл авахад алдаа гарлаа.",
    });
  }
});

router.post("/:eventId/scan", requireOrganizer, async (req, res) => {
  try {
    const { eventId } = req.params;

    const code = String(req.body?.ticket_code || "").trim().toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/.test(code)) {
      return res.status(400).json({
        status: "invalid",
        message: "QR код буруу байна.",
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
      [currentUserId(req), eventId, code],
    );

    const [rows] = await pool.query(
      `SELECT
           ec.user_id,
           ec.checked_in_at,
           u.first_name,
           u.last_name,
           u.email
         FROM event_checkins ec
         INNER JOIN event_bookings eb
           ON eb.event_id = ec.event_id
          AND eb.user_id = ec.user_id
         INNER JOIN users u
           ON u.id = ec.user_id
         WHERE ec.event_id = ?
           AND ec.ticket_code = ?
         LIMIT 1`,
      [eventId, code],
    );

    if (!rows.length) {
      return res.status(404).json({
        status: "invalid",
        message: "Энэ эвентийн тасалбар олдсонгүй.",
      });
    }

    const participant = rows[0];

    if (result.affectedRows === 0) {
      return res.status(409).json({
        status: "duplicate",
        message: "Аль хэдийн бүртгэгдсэн.",
        participant,
      });
    }

    return res.json({
      status: "success",
      message: "Амжилттай бүртгэгдлээ.",
      participant,
    });
  } catch (error) {
    console.error("CHECKIN SCAN ERROR:", error);

    return res.status(500).json({
      message: "Бүртгэл хийхэд алдаа гарлаа.",
    });
  }
});

export default router;
