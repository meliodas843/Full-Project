// Questions asked in the chat assistant (public/chatbot/widget.js) and the
// answer it gave. Anonymous, so it is kept small: no user, email or IP is stored, contact
// details in the text are masked, the same question only counts up, and
// caps stop a flood from filling the table. The per-visitor rate limit is
// chatbotLimiter in server.js.

import express from "express";
import pool from "../db.js";

const router = express.Router();

export const KEEP_DAYS = 90;
const MAX_NEW_PER_DAY = 500;
const MAX_ROWS = 5000;

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

// The bot's own answer, shown to the admin as plain text.
const cleanAnswer = (value) =>
  String(value ?? "")
    .replace(/[^\P{Cc}\n]/gu, " ")
    .trim()
    .slice(0, 1000) || null;

const cleanPage = (value) => {
  const page = String(value ?? "").split(/[?#]/)[0].slice(0, 255);
  return /^\/[\w\-/.%]*$/.test(page) ? page : null;
};

// "/unanswered" is the address used before answered questions were saved too.
router.post(["/questions", "/unanswered"], async (req, res, next) => {
  try {
    const answered = req.path === "/questions" && req.body?.answered === true;
    const answer = answered ? cleanAnswer(req.body?.answer) : null;
    const question = cleanQuestion(req.body?.question);
    const key = questionKey(question);
    if (key.length < 2) return res.status(400).json({ message: "Асуулт хоосон байна." });
    const page = cleanPage(req.body?.page);

    await pool.query("DELETE FROM chatbot_questions WHERE last_asked_at < DATE_SUB(NOW(), INTERVAL ? DAY)", [KEEP_DAYS]);

    const [updated] = await pool.query(
      `UPDATE chatbot_questions SET ask_count = ask_count + 1, last_asked_at = NOW(), answered = ?, answer = ?
        WHERE question_key = ?`,
      [answered ? 1 : 0, answer, key],
    );
    if (updated.affectedRows) return res.status(204).end();

    // New question: drop it quietly once today's or the overall cap is reached.
    const [[counts]] = await pool.query(
      `SELECT SUM(first_asked_at >= CURDATE()) AS today, COUNT(*) AS total FROM chatbot_questions`,
    );
    if (Number(counts.today || 0) >= MAX_NEW_PER_DAY || Number(counts.total || 0) >= MAX_ROWS) {
      return res.status(204).end();
    }

    await pool.query(
      `INSERT INTO chatbot_questions (question, question_key, page, answered, answer) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ask_count = ask_count + 1, last_asked_at = NOW()`,
      [question, key, page, answered ? 1 : 0, answer],
    );
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
