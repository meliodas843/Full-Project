// Shared labels and formatters for the super admin pages.

export const ROLE_LABELS = {
  super_admin: "Супер админ",
  admin: "Админ",
  user: "Хэрэглэгч",
};

export const LOG_TYPES = [
  { key: "login", label: "Нэвтрэлт" },
  { key: "create", label: "Үүсгэсэн" },
  { key: "update", label: "Зассан" },
  { key: "delete", label: "Устгасан" },
  { key: "decision", label: "Шийдвэр" },
  { key: "system", label: "Систем" },
  { key: "error", label: "Алдаа" },
];

export const LOG_TYPE_LABEL = Object.fromEntries(LOG_TYPES.map((t) => [t.key, t.label]));

export const NEWS_STATES = {
  published: "Нийтлэгдсэн",
  scheduled: "Товлосон",
  draft: "Ноорог",
};

export const NEWS_CATEGORIES = ["Security", "Cloud", "AI/ML", "DevOps", "Data", "Frontend", "Мэдэгдэл"];

const pad = (n) => String(n).padStart(2, "0");

export function fromTs(ts) {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

export function formatDate(date) {
  if (!date) return "—";
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function formatTime(date, seconds = false) {
  if (!date) return "—";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}${seconds ? `:${pad(date.getSeconds())}` : ""}`;
}

export function formatDateTime(date) {
  return date ? `${formatDate(date)} ${formatTime(date, true)}` : "—";
}

export function timeAgo(date) {
  if (!date) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "дөнгөж сая";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} цаг`;
  return `${Math.round(hours / 24)} өдөр`;
}

export function dayLabel(date) {
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(date)) / 86400000);
  if (diff === 0) return "Өнөөдөр";
  if (diff === 1) return "Өчигдөр";
  return formatDate(date);
}

export function initials(name, fallback = "?") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function shortName(name, email) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  if (parts.length === 1) return parts[0];
  return email || "Систем";
}

// "Chrome · macOS" from a user-agent string.
export function describeDevice(userAgent) {
  const ua = String(userAgent || "");
  if (!ua) return "—";
  const browser =
    /curl\//i.test(ua) ? `curl/${(ua.match(/curl\/([\d.]+)/i) || [])[1] || ""}` :
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" :
    /node|undici/i.test(ua) ? "Node" : "Бусад";
  const os =
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Windows/.test(ua) ? "Windows" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

export function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    return {};
  }
}
