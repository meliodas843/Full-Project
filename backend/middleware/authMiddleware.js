// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export default function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
