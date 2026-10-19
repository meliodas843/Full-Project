export const NEWS_STATUSES = ["published", "scheduled", "draft"];
export const SUMMARY_MAX = 160;

const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "u", п: "p", р: "r", с: "s",
  т: "t", у: "u", ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

// URL-friendly name: Mongolian Cyrillic transliterated, lowercase, dashes.
export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .split("")
    .map((ch) => (ch in CYRILLIC ? CYRILLIC[ch] : ch))
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const truthy = (value) => ["1", "true", "on", "yes"].includes(String(value ?? "").toLowerCase());

// Validates the editor form (multipart fields arrive as strings).
export function readNewsFields(body = {}) {
  const title = String(body.title || "").trim();
  const content = String(body.body || "").trim();
  const status = NEWS_STATUSES.includes(body.status) ? body.status : "published";

  if (!title) return { error: "Гарчиг оруулна уу." };
  if (status !== "draft" && !content.replace(/<[^>]*>/g, "").trim()) {
    return { error: "Мэдээний агуулга хоосон байна." };
  }

  let publishAt = null;

  if (status === "scheduled") {
    publishAt = new Date(body.publish_at);

    if (Number.isNaN(publishAt.getTime())) return { error: "Нийтлэх огноо, цагийг сонгоно уу." };
    if (publishAt.getTime() <= Date.now()) return { error: "Товлох цаг ирээдүйд байх ёстой." };
  }

  const summary = String(body.summary || "").trim();

  if (summary.length > SUMMARY_MAX) {
    return { error: `Товч тайлбар ${SUMMARY_MAX} тэмдэгтээс хэтэрсэн байна.` };
  }

  return {
    title: title.slice(0, 255),
    body: content,
    status,
    publishAt,
    slug: slugify(body.slug || title) || null,
    summary: summary || null,
    category: String(body.category || "").trim().slice(0, 50) || null,
    authorName: String(body.author_name || "").trim().slice(0, 255) || null,
    isFeatured: truthy(body.is_featured) ? 1 : 0,
    isPinned: truthy(body.is_pinned) ? 1 : 0,
  };
}

// JS Date -> "YYYY-MM-DD HH:MM:SS" in UTC (the server and MySQL run in UTC).
export function toSqlDateTime(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}
