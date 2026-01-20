import { OAuth2Client } from "google-auth-library";
import pool from "../db.js"; 

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Handles Google login
 * @param {string} token
 * @returns 
 */
export async function googleAuth(token) {
  try {
    if (!token) {
      throw new Error("Token is required");
    }
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture } = payload;

    const [rows] = await pool.query(
      "SELECT id, name, email, google_id FROM all_users WHERE google_id = ? OR email = ?",
      [google_id, email]
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
    } else {
      const [result] = await pool.query(
        "INSERT INTO all_users (name, email, google_id, created_at) VALUES (?, ?, ?, NOW())",
        [name, email, google_id]
      );
      user = {
        id: result.insertId,
        name,
        email,
        google_id,
      };
    }

    return { id: user.id, name: user.name, email: user.email, picture, google_id };
  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    return null;
  }
}
