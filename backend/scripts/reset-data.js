// Empties Registra's data so the site can go live clean.
//
//   node scripts/reset-data.js                  dry run: shows what would be deleted
//   node scripts/reset-data.js --yes            back up the database, then delete
//   node scripts/reset-data.js --yes --include-news   also delete news
//
// Kept: admin / super_admin accounts (so you can still log in), news (unless
// --include-news), and the files those still use. Everything else in the
// tables below is deleted, plus the uploaded files that belonged to it.
// Run from the backend folder; it reads the database settings from .env.

import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pool from "../db.js";

const args = new Set(process.argv.slice(2));
const CONFIRMED = args.has("--yes");
const INCLUDE_NEWS = args.has("--include-news");
const KEEP_ROLES = ["admin", "super_admin"];

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPLOADS_DIR = path.join(BACKEND_DIR, "uploads");

// Registra's own tables only, so other apps sharing this MySQL are untouched.
const WIPE_TABLES = [
  "event_bookings",
  "event_checkins",
  "event_join_requests",
  "event_files",
  "event_gallery_images",
  "event_gallery_settings",
  "finished_event_participants",
  "finished_event",
  "events",
  "finished_meeting",
  "meetings",
  "notifications",
  "organization_followers",
  "organizations",
  "password_reset_codes",
  "password_resets",
  ...(INCLUDE_NEWS ? ["news"] : []),
];

const UPLOAD_SUBDIRS = [
  "events",
  "event-files",
  "organizations",
  "profile",
  ...(INCLUDE_NEWS ? ["news"] : []),
];

async function existingTables() {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
  );
  return new Set(rows.map((r) => r.name));
}

async function count(sql, params = []) {
  const [[row]] = await pool.query(sql, params);
  return Number(row.total);
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

// Files still referenced by the rows we keep (admin avatars).
async function keptFiles(tables) {
  const keep = new Set();
  if (!tables.has("users")) return keep;
  const [rows] = await pool.query(
    `SELECT avatar_url FROM users WHERE role IN (?) AND avatar_url IS NOT NULL`,
    [KEEP_ROLES],
  );
  for (const { avatar_url: url } of rows) {
    const match = String(url).match(/\/uploads\/(.+)$/);
    if (match) keep.add(path.join(UPLOADS_DIR, match[1]));
  }
  return keep;
}

function backupDatabase() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(os.homedir(), `registra-db-backup-${stamp}.sql`);
  const result = spawnSync(
    "mysqldump",
    [
      "--single-transaction",
      "--routines",
      "-h", process.env.DB_HOST || "localhost",
      "-P", String(process.env.DB_PORT || 3306),
      "-u", process.env.DB_USER || "root",
      "--result-file", file,
      process.env.DB_NAME || "Time_Management",
    ],
    { env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || "" }, encoding: "utf8" },
  );
  if (result.status !== 0 || !fs.existsSync(file) || fs.statSync(file).size === 0) {
    throw new Error(`Database backup failed, nothing was deleted.\n${result.stderr || result.error || ""}`);
  }
  return file;
}

async function main() {
  const tables = await existingTables();
  const present = WIPE_TABLES.filter((t) => tables.has(t));

  console.log(`Database: ${process.env.DB_NAME || "Time_Management"}\n`);
  console.log("Rows that will be deleted:");
  for (const table of present) {
    console.log(`  ${table.padEnd(30)} ${await count(`SELECT COUNT(*) AS total FROM \`${table}\``)}`);
  }
  const usersToDelete = tables.has("users")
    ? await count(`SELECT COUNT(*) AS total FROM users WHERE role NOT IN (?) OR role IS NULL`, [KEEP_ROLES])
    : 0;
  const admins = tables.has("users")
    ? await count(`SELECT COUNT(*) AS total FROM users WHERE role IN (?)`, [KEEP_ROLES])
    : 0;
  console.log(`  ${"users (non-admin)".padEnd(30)} ${usersToDelete}`);
  console.log(`\nKept: ${admins} admin account(s)${INCLUDE_NEWS ? "" : ", all news"}.`);

  const keep = await keptFiles(tables);
  const files = UPLOAD_SUBDIRS.flatMap((d) => listFiles(path.join(UPLOADS_DIR, d))).filter(
    (f) => !keep.has(f),
  );
  console.log(`Uploaded files that will be deleted: ${files.length} (in ${UPLOAD_SUBDIRS.join(", ")})`);

  if (admins === 0) {
    console.log("\nStopping: no admin account would be left, so nobody could log in to manage the site.");
    process.exitCode = 1;
    return;
  }

  if (!CONFIRMED) {
    console.log("\nDry run only. Re-run with --yes to back up the database and delete the above.");
    return;
  }

  const backup = backupDatabase();
  console.log(`\nBackup written: ${backup}`);

  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of present) await conn.query(`TRUNCATE TABLE \`${table}\``);
    if (tables.has("users")) {
      await conn.query(`DELETE FROM users WHERE role NOT IN (?) OR role IS NULL`, [KEEP_ROLES]);
    }
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    conn.release();
  }

  for (const file of files) fs.rmSync(file, { force: true });

  console.log(`Done: emptied ${present.length} tables, deleted ${usersToDelete} users and ${files.length} files.`);
  console.log(`To undo the database part: mysql ${process.env.DB_NAME || "Time_Management"} < ${backup}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
