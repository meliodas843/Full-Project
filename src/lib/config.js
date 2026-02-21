export const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export function apiUrl(path) {
  const p = String(path || "");
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (!API_BASE) return p.startsWith("/") ? p : `/${p}`;
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${API_BASE}${normalized}`;
}


export function getImageSrc(image_url, fallback = "https://via.placeholder.com/900x600") {
  const u = String(image_url || "").trim();
  if (!u) return fallback;
  if (/^https?:\/\//i.test(u)) return u;
  const normalized = u.startsWith("/") ? u : `/${u}`;
  return apiUrl(normalized);
}
