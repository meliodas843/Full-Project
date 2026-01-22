import pool from "../db.js";

/* ===================== GET ALL NEWS ===================== */
export async function getNews(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, body, image_url, created_by, created_at FROM news ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET NEWS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ===================== CREATE NEWS ===================== */
export async function createNews(req, res) {
  try {
    const { title, body, image_url } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    // get user id from JWT payload set by authMiddleware
    const createdBy =
      req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;

    if (!createdBy) {
      return res.status(401).json({ message: "Missing user in token" });
    }

    const [result] = await pool.query(
      "INSERT INTO news (title, body, image_url, created_by) VALUES (?, ?, ?, ?)",
      [title, body, image_url || null, createdBy]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      body,
      image_url: image_url || null,
      created_by: createdBy,
    });
  } catch (err) {
    console.error("CREATE NEWS ERROR:", err);
    // send real error while debugging (you can change back later)
    res.status(500).json({ message: err.message, code: err.code });
  }
}
