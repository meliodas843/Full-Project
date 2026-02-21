import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js"; // default export

const router = express.Router();

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.user_id;
    if (!userId) return res.status(401).json({ message: "Invalid token payload" });

    const { company_name, phone, firstName, lastName } = req.body;

    if (!company_name || !phone) {
      return res.status(400).json({ message: "company_name and phone are required" });
    }

    await pool.query(
      "UPDATE users SET company_name = ?, phone = ?, first_name = ?, last_name = ? WHERE id = ?",
      [company_name, phone, firstName || null, lastName || null, userId]
    );

    // return updated fields so frontend can store them
    res.json({
      message: "Profile updated",
      user: { id: userId, company_name, phone, firstName: firstName || "", lastName: lastName || "" },
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
