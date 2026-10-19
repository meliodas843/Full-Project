import crypto from "node:crypto";
import pool from "../db.js";

// Types shown in the admin log register.
export const AUDIT_TYPES = ["login", "create", "update", "delete", "decision", "system", "error"];

const RETENTION_DAYS = 365;

// Every request gets a short id, returned as X-Request-Id and stored with
// any log entry it produces, so a user-reported problem can be traced.
export function requestId(req, res, next) {
  req.id = `req_${crypto.randomBytes(4).toString("hex")}`;
  res.setHeader("X-Request-Id", req.id);
  next();
}

function clip(value, max) {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Records one entry. Never throws and never delays the response: a logging
// failure must not break the action being logged.
export function logAudit(req, { type, status = "ok", action, target, targetDetail, user, details } = {}) {
  const actor = user || req?.user || {};
  const ip = req?.ip || req?.socket?.remoteAddress || null;

  pool
    .query(
      `INSERT INTO audit_logs
         (type, status, action, target, target_detail, user_id, user_email, user_role, ip, user_agent, request_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        AUDIT_TYPES.includes(type) ? type : "system",
        ["ok", "warn", "error"].includes(status) ? status : "ok",
        clip(action, 255) || "",
        clip(target, 255),
        clip(targetDetail, 255),
        Number.isSafeInteger(Number(actor.id)) && Number(actor.id) > 0 ? Number(actor.id) : null,
        clip(actor.email, 255),
        clip(actor.role, 50),
        clip(ip ? String(ip).replace(/^::ffff:/, "") : null, 64),
        clip(req?.get?.("user-agent"), 500),
        clip(req?.id, 40),
        details === undefined ? null : clip(JSON.stringify(details), 4000),
      ],
    )
    .catch((error) => console.error("AUDIT LOG WRITE FAILED:", error.message));
}

export async function pruneAuditLogs() {
  try {
    await pool.query(
      `DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [RETENTION_DAYS],
    );
  } catch (error) {
    console.error("AUDIT LOG PRUNE FAILED:", error.message);
  }
}

export { RETENTION_DAYS };
