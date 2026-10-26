// Super admin API: dashboard, news management, organization approval and the
// audit log. Every route requires an admin or super_admin login.

import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { AUDIT_TYPES, RETENTION_DAYS, logAudit } from "../utils/audit.js";

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["admin", "super_admin"]));

const clampDays = (value, fallback = 30) => {
  const days = Number(value);
  return [7, 30, 90].includes(days) ? days : fallback;
};

// Percentage change between this window and the one before it.
const change = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : current > 0 ? 100 : 0;

async function scalar(sql, params = []) {
  const [[row]] = await pool.query(sql, params);
  return Number(Object.values(row || {})[0] || 0);
}

// Counts rows created in the last `days` days and in the window before it.
async function windowCounts(table, days, where = "1=1") {
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) AS current,
       SUM(created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) AS previous
     FROM ${table}
     WHERE ${where}`,
    [days, days, days * 2],
  );
  const current = Number(row.current || 0);
  return { total: Number(row.total || 0), current, change: change(current, Number(row.previous || 0)) };
}

// Paid amounts in the last `days` days and in the window before it.
async function profitWindow(days) {
  const [[row]] = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total,
       COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN amount END), 0) AS current,
       COALESCE(SUM(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
                          AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN amount END), 0) AS previous
     FROM payments
     WHERE status = 'paid'`,
    [days, days, days * 2],
  );
  const current = Number(row.current);
  return { total: Number(row.total), current, change: change(current, Number(row.previous)) };
}

/* =========================
   DASHBOARD
========================= */
router.get("/dashboard", async (req, res, next) => {
  try {
    const days = clampDays(req.query.days);

    const [users, bookings, events, organizations, profit] = await Promise.all([
      windowCounts("users", days, "role NOT IN ('admin', 'super_admin') OR role IS NULL"),
      windowCounts("event_bookings", days),
      windowCounts("events", days),
      windowCounts("organizations", days),
      profitWindow(days),
    ]);

    const activeEvents = await scalar(
      `SELECT COUNT(*) FROM events
       WHERE archived = 0 AND COALESCE(end_time, start_time) >= NOW()`,
    );

    // Sign-ups and bookings per day for the chart, zero-filled. Days are
    // cut at the viewer's midnight (tz = minutes east of UTC, sent by the
    // browser), not the server's, so a sign-up at 07:00 in Ulaanbaatar
    // counts on that day.
    const tzMinutes = Math.max(-840, Math.min(840, Math.round(Number(req.query.tz) || 0)));
    const offsetSec = tzMinutes * 60;
    const today = Math.floor((Date.now() / 1000 + offsetSec) / 86400);
    const firstDay = today - (days - 1);
    const sinceSec = firstDay * 86400 - offsetSec;

    const perDay = async (table, where = "1=1") => {
      const [rows] = await pool.query(
        `SELECT FLOOR((UNIX_TIMESTAMP(created_at) + ?) / 86400) AS daynum, COUNT(*) AS total
         FROM ${table}
         WHERE created_at >= FROM_UNIXTIME(?) AND (${where})
         GROUP BY daynum`,
        [offsetSec, sinceSec],
      );
      return new Map(rows.map((r) => [Number(r.daynum), Number(r.total)]));
    };

    const [usersByDay, bookingsByDay] = await Promise.all([
      perDay("users", "role NOT IN ('admin', 'super_admin') OR role IS NULL"),
      perDay("event_bookings"),
    ]);

    const daily = [];
    for (let n = firstDay; n <= today; n++) {
      daily.push({
        day: new Date(n * 86400000).toISOString().slice(0, 10),
        users: usersByDay.get(n) || 0,
        bookings: bookingsByDay.get(n) || 0,
      });
    }

    const [pendingOrganizations] = await pool.query(
      `SELECT o.id, o.name, o.industry, o.logo_url, UNIX_TIMESTAMP(o.created_at) AS created_ts, u.email
       FROM organizations o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE COALESCE(o.is_verified, 0) = 0 AND o.review_status IS NULL
       ORDER BY o.created_at DESC
       LIMIT 6`,
    );

    const [topEvents] = await pool.query(
      `SELECT e.id, e.title, e.image_url, e.max_participants, e.start_time,
              o.name AS organization_name,
              (SELECT COUNT(*) FROM event_bookings eb WHERE eb.event_id = e.id) AS booked
       FROM events e
       LEFT JOIN organizations o ON o.id = e.organization_id
       WHERE e.archived = 0
       ORDER BY booked DESC, e.start_time ASC
       LIMIT 5`,
    );

    const [categories] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), 'Бусад') AS name, COUNT(*) AS total
       FROM events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY name
       ORDER BY total DESC
       LIMIT 6`,
      [days],
    );

    const [recent] = await pool.query(
      `SELECT l.id, l.type, l.status, l.action, l.target, UNIX_TIMESTAMP(l.created_at) AS ts,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name,
              l.user_email
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.id DESC
       LIMIT 6`,
    );

    return res.json({
      days,
      kpis: {
        users,
        bookings,
        events: { ...events, active: activeEvents },
        profit,
        organizations: {
          ...organizations,
          pending: await scalar(
            `SELECT COUNT(*) FROM organizations WHERE COALESCE(is_verified, 0) = 0 AND review_status IS NULL`,
          ),
        },
      },
      daily,
      pendingOrganizations,
      topEvents: topEvents.map((e) => ({ ...e, booked: Number(e.booked) })),
      categories: categories.map((c) => ({ name: c.name, total: Number(c.total) })),
      recent,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   ORGANIZATION APPROVAL
========================= */
router.patch("/organizations/:id/review", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const decision = req.body?.decision;

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be approve or reject" });
    }

    const [[organization]] = await pool.query("SELECT id, name FROM organizations WHERE id = ?", [id]);

    if (!organization) return res.status(404).json({ message: "Organization not found" });

    await pool.query("UPDATE organizations SET is_verified = ?, review_status = ? WHERE id = ?", [
      decision === "approve" ? 1 : 0,
      decision === "approve" ? "approved" : "rejected",
      id,
    ]);

    logAudit(req, {
      type: "decision",
      action: decision === "approve" ? "Байгууллага баталгаажуулсан" : "Байгууллагын хүсэлт татгалзсан",
      target: organization.name,
      targetDetail: `#${id}`,
    });

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* =========================
   NEWS (admin view: drafts and scheduled included)
========================= */
const NEWS_STATE = `
  CASE
    WHEN n.status = 'draft' THEN 'draft'
    WHEN n.publish_at IS NOT NULL AND n.publish_at > NOW() THEN 'scheduled'
    ELSE 'published'
  END
`;

router.get("/news", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.slug, n.image_url, n.category, n.author_name, n.views,
              n.is_pinned, n.is_featured, ${NEWS_STATE} AS state,
              UNIX_TIMESTAMP(COALESCE(n.publish_at, n.created_at)) AS date_ts,
              UNIX_TIMESTAMP(n.created_at) AS created_ts,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS creator_name
       FROM news n
       LEFT JOIN users u ON u.id = n.created_by
       ORDER BY n.is_pinned DESC, COALESCE(n.publish_at, n.created_at) DESC`,
    );

    const stats = { total: rows.length, published: 0, scheduled: 0, draft: 0, views: 0 };
    for (const row of rows) {
      stats[row.state] += 1;
      stats.views += Number(row.views || 0);
    }

    return res.json({ stats, rows });
  } catch (error) {
    next(error);
  }
});

router.get("/news/:id", async (req, res, next) => {
  try {
    const [[news]] = await pool.query(
      `SELECT n.*, ${NEWS_STATE} AS state,
              UNIX_TIMESTAMP(n.publish_at) AS publish_ts,
              UNIX_TIMESTAMP(n.created_at) AS created_ts
       FROM news n WHERE n.id = ?`,
      [Number(req.params.id)],
    );

    if (!news) return res.status(404).json({ message: "News not found" });

    return res.json(news);
  } catch (error) {
    next(error);
  }
});

router.patch("/news/:id/pin", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[news]] = await pool.query("SELECT id, title, is_pinned FROM news WHERE id = ?", [id]);

    if (!news) return res.status(404).json({ message: "News not found" });

    const pinned = news.is_pinned ? 0 : 1;

    await pool.query("UPDATE news SET is_pinned = ? WHERE id = ?", [pinned, id]);

    logAudit(req, {
      type: "update",
      action: pinned ? "Мэдээ дээр нь бэхэлсэн" : "Мэдээний бэхэлгээ авсан",
      target: news.title,
      targetDetail: `#${id}`,
    });

    return res.json({ is_pinned: pinned });
  } catch (error) {
    next(error);
  }
});

/* =========================
   AUDIT LOG
========================= */
// A "create" entry whose news or event was deleted later. Matched on the
// "#id" kept in target_detail and on the action names the routes log
// (news.routes.js / event.routes.js). The delete entry itself stays.
const DELETED_LATER = [
  { created: ["Мэдээ нийтэлсэн", "Мэдээ товлосон", "Мэдээ ноорог хадгалсан"], deleted: "Мэдээ устгасан" },
  { created: ["Эвэнт үүсгэсэн"], deleted: "Эвэнт устгасан" },
];

const REMOVED_CREATE_SQL = `(l.type = 'create' AND l.target_detail IS NOT NULL AND EXISTS (
  SELECT 1 FROM audit_logs d
  WHERE d.type = 'delete' AND d.target_detail = l.target_detail AND d.id > l.id
    AND (${DELETED_LATER.map(
      (pair) => `(l.action IN (${pair.created.map((a) => pool.escape(a)).join(", ")}) AND d.action = ${pool.escape(pair.deleted)})`,
    ).join(" OR ")})
))`;

function logFilters(query) {
  const where = [];
  const params = [];

  const sinceMs = Number(query.since);
  if (Number.isFinite(sinceMs) && sinceMs > 0) {
    where.push("l.created_at >= FROM_UNIXTIME(?)");
    params.push(Math.floor(sinceMs / 1000));
  } else {
    where.push("l.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    params.push(clampDays(query.days, 7));
  }

  if (AUDIT_TYPES.includes(query.type)) {
    where.push("l.type = ?");
    params.push(query.type);
    // Things that were created and then deleted drop out of "Үүсгэсэн".
    if (query.type === "create") where.push(`NOT ${REMOVED_CREATE_SQL}`);
  }

  if (["ok", "warn", "error"].includes(query.status)) {
    where.push("l.status = ?");
    params.push(query.status);
  }

  const q = String(query.q || "").trim().slice(0, 100);
  if (q) {
    where.push(
      `(l.action LIKE ? OR l.target LIKE ? OR l.user_email LIKE ? OR l.ip LIKE ? OR l.request_id LIKE ?
        OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?)`,
    );
    const like = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    params.push(like, like, like, like, like, like);
  }

  return { sql: where.join(" AND "), params };
}

const LOG_COLUMNS = `
  l.id, l.type, l.status, l.action, l.target, l.target_detail, l.user_id, l.user_email,
  l.user_role, l.ip, l.user_agent, l.request_id, l.details,
  UNIX_TIMESTAMP(l.created_at) AS ts,
  ${REMOVED_CREATE_SQL} AS removed,
  TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name
`;

router.get("/logs", async (req, res, next) => {
  try {
    const filter = logFilters(req.query);
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    const [rows] = await pool.query(
      `SELECT ${LOG_COLUMNS}
       FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${filter.sql}
       ORDER BY l.id DESC
       LIMIT ?`,
      [...filter.params, limit],
    );

    // Counts per type and status for the same time range (ignoring type filter).
    const rangeOnly = logFilters({ since: req.query.since, days: req.query.days });
    const [typeRows] = await pool.query(
      `SELECT l.type, COUNT(*) AS total FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${rangeOnly.sql} AND NOT ${REMOVED_CREATE_SQL} GROUP BY l.type`,
      rangeOnly.params,
    );
    const [statusRows] = await pool.query(
      `SELECT l.status, COUNT(*) AS total FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${rangeOnly.sql} GROUP BY l.status`,
      rangeOnly.params,
    );

    const byType = Object.fromEntries(typeRows.map((r) => [r.type, Number(r.total)]));
    const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.total)]));

    return res.json({
      rows,
      counts: {
        // Every entry in range, including created-then-deleted ones.
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        byType,
        errors: byStatus.error || 0,
        warnings: byStatus.warn || 0,
      },
      retentionDays: RETENTION_DAYS,
    });
  } catch (error) {
    next(error);
  }
});

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Prefix formula-like cells so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

router.get("/logs.csv", async (req, res, next) => {
  try {
    const filter = logFilters(req.query);

    const [rows] = await pool.query(
      `SELECT ${LOG_COLUMNS}
       FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${filter.sql}
       ORDER BY l.id DESC
       LIMIT 50000`,
      filter.params,
    );

    const header = ["time_utc", "type", "status", "action", "target", "detail", "user", "email", "role", "ip", "user_agent", "request_id"];
    const lines = rows.map((r) =>
      [
        new Date(Number(r.ts) * 1000).toISOString(),
        r.type,
        r.status,
        r.action,
        r.target,
        r.target_detail,
        r.user_name,
        r.user_email,
        r.user_role,
        r.ip,
        r.user_agent,
        r.request_id,
      ]
        .map(csvCell)
        .join(","),
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="registra-log-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send("﻿" + [header.join(","), ...lines].join("\n"));
  } catch (error) {
    next(error);
  }
});

export default router;
