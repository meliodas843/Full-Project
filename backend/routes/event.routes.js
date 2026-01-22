import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   CREATE EVENT
   POST /api/events
========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      start_time,
      end_time,
      image_url,
      max_participants,
    } = req.body;

    if (!title || !start_time) {
      return res.status(400).json({ message: "Title and start_time are required" });
    }

    const max = Number(max_participants) || 0;
    if (max < 0) {
      return res.status(400).json({ message: "max_participants cannot be negative" });
    }

    const createdByEmail = req.user?.email;
    if (!createdByEmail) {
      return res.status(401).json({ message: "Token missing email" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO events
        (title, description, start_time, end_time, image_url, created_by_email, max_participants)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description || null,
        start_time,
        end_time || null,
        image_url || null,
        createdByEmail,
        max,
      ]
    );

    res.status(201).json({
      message: "Event created",
      event: {
        id: result.insertId,
        title,
        description: description || null,
        start_time,
        end_time: end_time || null,
        image_url: image_url || null,
        created_by_email: createdByEmail,
        max_participants: max,
      },
    });
  } catch (err) {
    console.error("CREATE EVENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET EVENTS (PUBLIC)
   GET /api/events
========================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.start_time,
        e.end_time,
        e.created_by_email,
        e.created_at,
        e.max_participants,
        COUNT(b.id) AS joined_count
      FROM events e
      LEFT JOIN event_bookings b ON b.event_id = e.id
      GROUP BY e.id
      ORDER BY e.start_time ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET SINGLE EVENT
   GET /api/events/:id
========================= */
router.get("/:id", async (req, res) => {
  const eventId = Number(req.params.id);

  try {
    const [[event]] = await pool.query(
      `
      SELECT
        e.*,
        COUNT(b.id) AS joined_count
      FROM events e
      LEFT JOIN event_bookings b ON b.event_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
      `,
      [eventId]
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error("GET EVENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   BOOK EVENT
   POST /api/events/:id/book
========================= */
router.post("/:id/book", authMiddleware, async (req, res) => {
  const eventId = Number(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Invalid token (no user id)" });
  }

  try {
    const [[event]] = await pool.query(
      `
      SELECT
        e.max_participants,
        (SELECT COUNT(*) FROM event_bookings WHERE event_id = ?) AS joined_count
      FROM events e
      WHERE e.id = ?
      `,
      [eventId, eventId]
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.max_participants > 0 && event.joined_count >= event.max_participants) {
      return res.status(400).json({ message: "This event is full" });
    }

    await pool.query(
      `
      INSERT INTO event_bookings (event_id, user_id)
      VALUES (?, ?)
      `,
      [eventId, userId]
    );

    return res.json({ message: "Booked successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "You already booked this event" });
    }

    console.error("BOOK EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
