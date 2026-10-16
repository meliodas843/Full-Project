// Helpers for OrganizationDetail.jsx, moved out to keep the page component readable.
import { API_BASE } from "../../../lib/config";

export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("adminToken") ||
    ""
  );
}

export function resolveUrl(value) {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(11, 16);
  }

  return date.toLocaleTimeString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function normalizeCategories(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function normalizeOrganization(item) {
  const categories = normalizeCategories(
    item?.categories || item?.category || item?.industry,
  );

  return {
    ...item,

    id: item?.id ?? item?.organization_id ?? item?.org_id,

    name:
      item?.name ||
      item?.organization_name ||
      item?.company_name ||
      "Байгууллага",

    category:
      item?.category || item?.industry || categories[0] || "Байгууллага",

    categories,

    description:
      item?.description ||
      item?.about ||
      item?.bio ||
      "Байгууллагын танилцуулга оруулаагүй байна.",

    logo: item?.logo_url || item?.logo || item?.image_url || item?.image || "",

    cover:
      item?.cover_url ||
      item?.cover_image ||
      item?.banner_url ||
      item?.banner ||
      "",

    verified: Boolean(
      item?.verified ??
      item?.is_verified ??
      item?.verification_status === "verified",
    ),

    following: Boolean(item?.following ?? item?.is_following ?? item?.followed),

    followers:
      Number(
        item?.followers_count ?? item?.follower_count ?? item?.followers ?? 0,
      ) || 0,

    website: item?.website || item?.website_url || "",

    phone: item?.phone || item?.organization_phone || "",

    address: item?.address || item?.location || item?.city || "",
  };
}

export function normalizeEvent(item) {
  return {
    ...item,

    id: item?.id ?? item?.event_id,

    title: item?.title || item?.name || "Эвэнт",

    badge: item?.badge || item?.category || item?.event_type || "Эвэнт",

    image:
      item?.image_url || item?.image || item?.cover_image || item?.cover || "",

    start: item?.start_time || item?.start_at || item?.date || "",

    end: item?.end_time || item?.end_at || "",

    location: item?.location || item?.venue || item?.address || "",

    participants:
      Number(
        item?.participants_count ??
          item?.bookings_count ??
          item?.registered_count ??
          0,
      ) || 0,
  };
}

export async function fetchJson(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,

    headers: {
      Accept: "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }

  return data;
}
