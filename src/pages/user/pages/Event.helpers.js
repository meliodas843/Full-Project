// Helpers for Event.jsx, moved out to keep the page component readable.
import { defaultEventCover, getImageSrc } from "@/lib/config";

export function formatDateTime(dt) {
  if (!dt) return "";

  const raw = String(dt).trim().replace("T", " ").replace(/Z$/, "");

  const [datePart, timePart = ""] = raw.split(" ");

  if (!datePart) return "";

  const [year, month, day] = datePart.split("-");

  const time = timePart.slice(0, 5);

  return `${year}/${month}/${day}${time ? ` ${time}` : ""}`;
}

export function toDateTimeLocal(dt) {
  if (!dt) return "";

  return String(dt).trim().replace(" ", "T").replace(/Z$/, "").slice(0, 16);
}

export function isSvgFile(file) {
  return (
    file?.type === "image/svg+xml" ||
    String(file?.name || "")
      .toLowerCase()

      .endsWith(".svg")
  );
}

export function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();

  if (!s) return "?";

  if (s.includes("@")) {
    return s[0].toUpperCase();
  }

  const parts = s.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function resolveUrl(url) {
  return getImageSrc(url, "");
}

export function fallbackImgSrc(seed = 0) {
  return defaultEventCover(seed);
}

export function isImageName(name) {
  return /(png|jpe?g|gif|webp|bmp)$/i.test(String(name || ""));
}

export function parseAgenda(agendaValue) {
  if (!agendaValue) return [];

  if (Array.isArray(agendaValue)) {
    return agendaValue;
  }

  try {
    const parsed = JSON.parse(agendaValue);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseSpeakers(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      return [parsed];
    }

    return [];
  } catch {
    if (typeof value === "string" && value.trim()) {
      return [
        {
          name: value.trim(),

          organization: "",

          topic: "",

          avatar: null,
        },
      ];
    }

    return [];
  }
}

export function getSpeakerAvatar(sp) {
  return (
    sp?.avatar_url ||
    sp?.avatar ||
    sp?.image_url ||
    sp?.profile ||
    sp?.photo ||
    ""
  );
}

export function makeSpeaker() {
  return {
    name: "",

    organization: "",

    topic: "",

    avatar: null,
  };
}

export function getCurrentUser() {
  const keys = ["user", "authUser", "currentUser", "profile"];

  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");

      if (value) {
        return value;
      }
    } catch {}
  }

  const email =
    localStorage.getItem("email") || localStorage.getItem("userEmail");

  return email ? { email } : null;
}

export function canEditEvent(ev) {
  if (!ev) return false;

  const user = getCurrentUser();

  const userId = Number(
    user?.id || user?.user_id || user?.userId || user?.user?.id,
  );

  const eventCreatorId = Number(
    ev?.created_by ||
      ev?.created_by_id ||
      ev?.creator_id ||
      ev?.user_id ||
      ev?.organizer_id,
  );

  const userEmail = String(
    user?.email ||
      user?.user?.email ||
      localStorage.getItem("email") ||
      localStorage.getItem("userEmail") ||
      "",
  ).toLowerCase();

  const creatorEmail = String(
    ev?.created_by_email ||
      ev?.creator_email ||
      ev?.user_email ||
      ev?.organizer_email ||
      "",
  ).toLowerCase();

  return (
    ev?.relation_type === "created" ||
    (Number.isFinite(userId) &&
      Number.isFinite(eventCreatorId) &&
      userId === eventCreatorId) ||
    (userEmail && creatorEmail && userEmail === creatorEmail)
  );
}

export function normalizeDateTimeLocalValue(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 16);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
    return raw.replace(" ", "T").slice(0, 16);
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
