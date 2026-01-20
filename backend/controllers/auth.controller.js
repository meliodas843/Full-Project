import bcrypt from "bcryptjs";
import pool from "../db.js";

export const register = async (req, res) => {
  try {
    const { email, password, company_name } = req.body;

    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (exists.length) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (company_name, email, password, role) VALUES (?, ?, ?, 'user')",
      [company_name || null, email, hashed]
    );

    res.json({
      user: {
        id: result.insertId,
        email,
        role: "user",
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
