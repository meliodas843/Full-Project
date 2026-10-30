// Questions the chat assistant (public/chatbot/widget.js) could not answer.
// Anonymous, so it is kept small: no user, email or IP is stored, contact
// details in the text are masked, the same question only counts up, and
// caps stop a flood from filling the table. The per-visitor rate limit is
// chatbotLimiter in server.js.

import express from "express";
import pool from "../db.js";

const router = express.Router();

export const KEEP_DAYS = 90;
const MAX_NEW_PER_DAY = 200;
const MAX_OPEN = 2000;

// Emails and phone/account numbers never reach the database.
export function cleanQuestion(value) {
  return String(value ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/[^\s@,;]+@[\w-]+(\.[\w-]+)+/g, "[имэйл]")
    .replace(/\+?\d(?:[\s-]?\d){7,}/g, "[дугаар]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

// "Хэрхэн QR авах вэ??" and "хэрхэн qr авах вэ" are the same question.
export const questionKey = (question) =>
  question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 191);

const cleanPage = (value) => {
  const page = String(value ?? "").split(/[?#]/)[0].slice(0, 255);
  return /^\/[\w\-/.%]*$/.test(page) ? page : null;
};

router.post("/unanswered", async (req, res, next) => {
  try {
    const question = cleanQuestion(req.body?.question);
    const key = questionKey(question);
    if (key.length < 2) return res.status(400).json({ message: "Асуулт хоосон байна." });
    const page = cleanPage(req.body?.page);

    await pool.query("DELETE FROM chatbot_questions WHERE last_asked_at < DATE_SUB(NOW(), INTERVAL ? DAY)", [KEEP_DAYS]);

    const [updated] = await pool.query(
      "UPDATE chatbot_questions SET ask_count = ask_count + 1, last_asked_at = NOW() WHERE question_key = ?",
      [key],
    );
    if (updated.affectedRows) return res.status(204).end();

    // New question: drop it quietly once today's or the overall cap is reached.
    const [[counts]] = await pool.query(
      `SELECT SUM(first_asked_at >= CURDATE()) AS today, SUM(resolved = 0) AS open FROM chatbot_questions`,
    );
    if (Number(counts.today || 0) >= MAX_NEW_PER_DAY || Number(counts.open || 0) >= MAX_OPEN) {
      return res.status(204).end();
    }

    await pool.query(
      `INSERT INTO chatbot_questions (question, question_key, page) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE ask_count = ask_count + 1, last_asked_at = NOW()`,
      [question, key, page],
    );
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
