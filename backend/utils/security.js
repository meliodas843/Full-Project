import cors from "cors";
import rateLimit from "express-rate-limit";

// Browsers may only call the API cross-origin from these sites. The deployed
// frontend is served from the same origin as the API, which needs no entry.
export function corsMiddleware() {
  const allowed = new Set(
    [
      process.env.FRONTEND_URL,
      ...String(process.env.CORS_ORIGINS || "").split(","),
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]
      .map((origin) => String(origin || "").trim().replace(/\/+$/, ""))
      .filter(Boolean),
  );

  return cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowed.has(origin.replace(/\/+$/, ""))),
  });
}

function limiter(windowMinutes, limit, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
  });
}

const TOO_MANY = "Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.";

export const apiLimiter = limiter(5, 1000, TOO_MANY);

export const authLimiter = limiter(15, 20, TOO_MANY);

export const resetEmailLimiter = limiter(15, 5, TOO_MANY);

export const resetCodeLimiter = limiter(15, 20, TOO_MANY);

// 5xx responses used to include err.message (SQL errors, file paths). Keep
// logging them server-side but don't send them to the browser.
export function hideServerErrors(req, res, next) {
  const json = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === "object") {
      const { error, stack, sql, sqlMessage, ...rest } = body;
      return json(rest);
    }

    return json(body);
  };

  next();
}
