import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * USERS TABLE:
 * - company_name
 * - email
 * - role
 */

// ✅ Companies dropdown: ONLY companies that have at least 1 normal user
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

    // --- Find logged-in user's email safely ---
    let myEmail = "";

    // 1) if JWT already has email
    if (req.user?.email) {
      myEmail = String(req.user.email).trim().toLowerCase();
    }

    // 2) else if JWT has id, lookup email from DB
    if (!myEmail && req.user?.id) {
      const [me] = await pool.query("SELECT email FROM users WHERE id = ? LIMIT 1", [
        req.user.id,
      ]);
      myEmail = String(me?.[0]?.email || "").trim().toLowerCase();
    }

    // --- Main query (exclude myEmail if we found it) ---
    let sql = `
      SELECT id, email
      FROM users
      WHERE company_name = ?
        AND role = 'user'
        AND email IS NOT NULL
        AND email <> ''
    `;
    const params = [companyName];

    if (myEmail) {
      sql += ` AND LOWER(email) <> ? `;
      params.push(myEmail);
    }

    sql += ` ORDER BY email ASC `;

    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("GET /api/companies/employees error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
