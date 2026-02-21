import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   GET /api/profile/me
========================= */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.user_id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const [rows] = await pool.query(
      `SELECT id, email, company_name, phone, first_name, last_name, role, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const u = rows[0];
    return res.json({
      user: {
        id: u.id,
        email: u.email,
        company_name: u.company_name || "",
        phone: u.phone || "",
        firstName: u.first_name || "",
        lastName: u.last_name || "",
        role: u.role || "",
        created_at: u.created_at || null,
      },
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   PUT /api/profile/me
========================= */
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.user_id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const company_name = String(req.body?.company_name ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const firstName = String(req.body?.firstName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();

    // You decide what's required:
    if (!company_name || !phone) {
      return res.status(400).json({ message: "company_name and phone are required" });
    }

    await pool.query(
      `UPDATE users
       SET company_name = ?, phone = ?, first_name = ?, last_name = ?
       WHERE id = ?`,
      [company_name, phone, firstName || null, lastName || null, userId]
    );

    return res.json({
      message: "Profile updated ✅",
      user: {
        id: userId,
        company_name,
        phone,
        firstName,
        lastName,
      },
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
