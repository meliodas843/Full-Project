export const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export const DEFAULT_EVENT_COVERS = [
  "/registra-default-images/event-covers/event-cover-ai.svg",
  "/registra-default-images/event-covers/event-cover-cloud.svg",
  "/registra-default-images/event-covers/event-cover-data.svg",
  "/registra-default-images/event-covers/event-cover-devops.svg",
  "/registra-default-images/event-covers/event-cover-general.svg",
  "/registra-default-images/event-covers/event-cover-security.svg",
];

export function apiUrl(path) {
  const p = String(path || "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (!API_BASE) return p.startsWith("/") ? p : `/${p}`;
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${API_BASE}${normalized}`;
}

export function defaultEventCover(seed = 0) {
  const numericSeed = Number(seed);
  const index = Number.isFinite(numericSeed)
    ? Math.abs(Math.trunc(numericSeed)) % DEFAULT_EVENT_COVERS.length
    : 0;
  return DEFAULT_EVENT_COVERS[index];
}

export function getImageSrc(imageUrl, fallback = "") {
  const value = String(imageUrl || "").trim();

  if (!value) return fallback;

  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("/registra-default-images/")) {
    return value;
  }

  if (value.startsWith("registra-default-images/")) {
    return `/${value}`;
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;
  return apiUrl(normalized);
}
