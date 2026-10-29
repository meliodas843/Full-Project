// Link previews (Viber, Facebook, Telegram, Slack ...). Those apps do not run
// the React app, so before sending index.html we write the page's title,
// description and image into its Open Graph tags: an event or news article
// gets its own card, every other page the default Registra card.

import fs from "fs/promises";
import pool from "../db.js";
import { NEWS_IS_VISIBLE } from "../routes/news.routes.js";

const SITE_TITLE = "Registra — Бүх төрлийн эвент, бизнес уулзалтуудыг нэг дороос";
const SITE_DESCRIPTION =
  "Хурал, workshop, meetup-аа олж бүртгүүл. Эвэнтийн дараа хэрэгтэй хүмүүстэйгээ 1:1 Zoom уулзалт товлоорой.";
const DEFAULT_IMAGE = "/og-image.png";
const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function plainText(value, max = 160) {
  const text = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function absolute(base, url) {
  const value = String(url || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}

// Preview apps cannot show SVG, so default event covers fall back to ours.
function shareImage(base, url) {
  const value = String(url || "").trim();
  return value && !/\.svg(\?|$)/i.test(value) ? absolute(base, value) : null;
}

function formatWhen(value) {
  const d = value instanceof Date ? value : new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}, ${WEEKDAYS[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function eventMeta(id, base) {
  const [[event]] = await pool.query(
    `SELECT e.title, e.description, e.start_time, e.image_url,
            COALESCE(
              (SELECT o.name FROM organizations o WHERE o.id = e.organization_id),
              (SELECT o.name FROM organizations o JOIN users u ON u.id = o.user_id
                WHERE LOWER(u.email) = LOWER(e.created_by_email) LIMIT 1)
            ) AS organizer
       FROM events e
      WHERE e.id = ? AND e.archived = 0 AND e.visibility = 'public'
        AND (e.status IS NULL OR e.status = 'published')`,
    [id],
  );
  if (!event) return null;

  const facts = [formatWhen(event.start_time), event.organizer].filter(Boolean).join(" · ");
  const about = plainText(event.description, 140);
  return {
    title: event.title,
    description: [facts, about].filter(Boolean).join(" — ") || SITE_DESCRIPTION,
    image: shareImage(base, event.image_url),
    type: "article",
  };
}

async function newsMeta(id, base) {
  const [[news]] = await pool.query(
    `SELECT n.title, n.summary, n.body, n.image_url FROM news n WHERE n.id = ? AND ${NEWS_IS_VISIBLE}`,
    [id],
  );
  if (!news) return null;
  return {
    title: news.title,
    description: plainText(news.summary || news.body) || SITE_DESCRIPTION,
    image: shareImage(base, news.image_url),
    type: "article",
  };
}

async function pageMeta(pathname, base) {
  const event = pathname.match(/^\/events\/(\d+)\/?$/);
  const news = pathname.match(/^\/news\/(\d+)\/?$/);
  try {
    if (event) return await eventMeta(Number(event[1]), base);
    if (news) return await newsMeta(Number(news[1]), base);
  } catch (error) {
    console.error("SHARE PREVIEW ERROR:", error.message);
  }
  return null;
}

function setContent(html, attr, key, value) {
  const pattern = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
}

export async function renderIndex(indexPath, req) {
  const html = await fs.readFile(indexPath, "utf8");
  const base = `${req.protocol}://${req.get("host")}`;
  const page = await pageMeta(req.path, base);

  const title = page?.title ? `${page.title} | Registra` : SITE_TITLE;
  const description = page?.description || SITE_DESCRIPTION;
  const image = page?.image || absolute(base, DEFAULT_IMAGE);
  const url = `${base}${req.path}`;

  let out = html;
  for (const [attr, key, value] of [
    ["name", "description", description],
    ["property", "og:type", page?.type || "website"],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:image", image],
    ["property", "og:image:alt", title],
    ["property", "og:url", url],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", image],
  ]) {
    out = setContent(out, attr, key, value);
  }

  // The size tags describe the default image only.
  if (page?.image) {
    out = out.replace(/\s*<meta\s+property="og:image:(width|height)"\s+content="[^"]*"\s*\/>/g, "");
  }
  if (page?.title) {
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  }
  return out;
}
