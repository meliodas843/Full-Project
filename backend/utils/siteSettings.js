// Small key-value settings for the public site that a super admin can change,
// such as the image on the home page hero card.
import pool from "../db.js";

export const HERO_IMAGE_KEY = "home_hero_image";

export async function getSiteSetting(key, db = pool) {
  const [rows] = await db.query("SELECT `value` FROM site_settings WHERE `key` = ?", [key]);
  return rows[0]?.value || "";
}

export async function setSiteSetting(key, value, db = pool) {
  if (value) {
    await db.query(
      "INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [key, String(value)],
    );
  } else {
    await db.query("DELETE FROM site_settings WHERE `key` = ?", [key]);
  }
}
