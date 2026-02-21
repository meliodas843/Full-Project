import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
function toClientUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    company_name: u.company_name ?? null,
    phone: u.phone ?? null,
    firstName: u.first_name ?? null,
    lastName: u.last_name ?? null,
  };
}

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const { email, password, company_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (exists.length) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (company_name, email, password, role) VALUES (?, ?, ?, 'user')",
      [company_name || null, email, hashed]
    );

    // ✅ return consistent shape
    const user = {
      id: result.insertId,
      email,
      role: "user",
      company_name: company_name || null,
      phone: null,
      first_name: null,
      last_name: null,
    };

    res.status(201).json({ user: toClientUser(user), token: signToken(user) });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    if (!user.password) {
      return res.status(401).json({
        message: "Use Google sign-in for this account",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ include phone + company_name in response
    res.json({
      user: toClientUser(user),
      token: signToken(user),
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= GOOGLE LOGIN ================= */
router.post("/google", async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "GOOGLE_CLIENT_ID not set" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const google_id = payload?.sub;

    if (!email || !google_id) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1",
      [google_id, email]
    );

    let userRow;

    if (rows.length) {
      userRow = rows[0];

      // attach google_id if missing
      if (!userRow.google_id) {
        await pool.query("UPDATE users SET google_id=? WHERE id=?", [
          google_id,
          userRow.id,
        ]);

        // re-fetch to keep response consistent
        const [again] = await pool.query(
          "SELECT * FROM users WHERE id = ? LIMIT 1",
          [userRow.id]
        );
        userRow = again[0];
      }
    } else {
      const [result] = await pool.query(
        "INSERT INTO users (email, google_id, role) VALUES (?, ?, 'user')",
        [email, google_id]
      );

      // ✅ re-fetch full row so it contains phone/company_name columns
      const [created] = await pool.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [result.insertId]
      );
      userRow = created[0];
    }

    res.json({
      user: toClientUser(userRow),
      token: signToken(userRow),
    });
  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
