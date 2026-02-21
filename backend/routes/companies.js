// routes/companies.routes.js
import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT u.company_name
      FROM users u
      WHERE u.company_name IS NOT NULL
        AND u.company_name <> ''
        AND u.role = 'user'
      ORDER BY u.company_name ASC
    `);

    const companies = rows.map((r, i) => ({ id: i + 1, name: r.company_name }));
    return res.json(companies);
  } catch (err) {
    console.error("GET /api/companies error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ Employees dropdown: ONLY role='user' in that company, exclude admins AND exclude ME
router.get("/employees", authMiddleware, async (req, res) => {
  try {
    const companyName = String(req.query.company || "").trim();
    if (!companyName) {
      return res.status(400).json({ message: "company is required" });
    }

    const myUserId = Number(req.user?.id);
    if (!Number.isFinite(myUserId)) {
      return res.status(401).json({ message: "Invalid token (no user id)" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        email,
        CONCAT_WS(' ', first_name, last_name) AS name
      FROM users
      WHERE company_name = ?
        AND role = 'user'
        AND id <> ?
        AND email IS NOT NULL
        AND email <> ''
      ORDER BY email ASC
      `,
      [companyName, myUserId]
    );

    return res.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name?.trim() ? r.name.trim() : r.email,
      }))
    );
  } catch (err) {
    console.error("GET /api/companies/employees error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
