import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sql = "SELECT * FROM projects ORDER BY id DESC";
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    console.error("PROJECT FETCH ERROR:", err);
    res.status(500).json({
      message: "Database error",
      error: err.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, image } = req.body;

    const sql =
      "INSERT INTO projects (title, description, image) VALUES (?, ?, ?)";

    const [result] = await db.query(sql, [title, description, image || null]);

    res.json({
      message: "Project created",
      id: result.insertId,
    });
  } catch (err) {
    console.error("PROJECT CREATE ERROR:", err);
    res.status(500).json({
      message: "Insert failed",
      error: err.message,
    });
  }
});

export default router;