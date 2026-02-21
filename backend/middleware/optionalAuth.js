import jwt from "jsonwebtoken";

export default function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    req.user = jwt.verify(token, secret);
  } catch {
    req.user = null;
  }

  next();
}
