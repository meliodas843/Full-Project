// Helpers for History.jsx, moved out to keep the page component readable.
import { defaultEventCover, getImageSrc } from "@/lib/config";

export function resolveUrl(url) {
  return getImageSrc(url, "");
}

export function fallbackImgSrc(seed = 0) {
  return defaultEventCover(seed);
}

export function getEventImage(event) {
  return (
    resolveUrl(event?.image_url) ||
    resolveUrl(event?.image) ||
    resolveUrl(event?.cover_image) ||
    resolveUrl(event?.cover) ||
    resolveUrl(event?.thumbnail) ||
    resolveUrl(event?.banner) ||
    fallbackImgSrc(event?.id || event?.event_id || 0)
  );
}

export function formatDateTime(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      "mn-MN",

      {
        timeZone: "Asia/Ulaanbaatar",

        month: "short",

        day: "2-digit",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

        hour12: true,
      },
    );
  }

  const normalized = raw.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "mn-MN",

    {
      month: "short",

      day: "2-digit",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",

      hour12: true,
    },
  );
}

export function toDateTimeLocal(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const parts = new Intl.DateTimeFormat(
      "en-CA",

      {
        timeZone: "Asia/Ulaanbaatar",

        year: "numeric",

        month: "2-digit",

        day: "2-digit",

        hour: "2-digit",

        minute: "2-digit",

        hour12: false,
      },
    ).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value;

    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
      "minute",
    )}`;
  }

  return raw

    .replace(" ", "T")

    .slice(0, 16);
}

export function parseEventDateTime(value) {
  if (!value) return NaN;

  const raw = String(value).trim();

  if (!raw) return NaN;

  if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw).getTime();
  }

  const normalized = raw.replace(" ", "T");

  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!match) {
    return new Date(normalized).getTime();
  }

  const [, year, month, day, hour, minute, second = "00"] = match;

  return new Date(
    Number(year),

    Number(month) - 1,

    Number(day),

    Number(hour),

    Number(minute),

    Number(second),
  ).getTime();
}

export function isFinished(event) {
  if (!event) {
    return false;
  }

  const value = event.end_time || event.start_time;

  if (!value) {
    return false;
  }

  const time = parseEventDateTime(value);

  return Number.isFinite(time) && time <= Date.now();
}

export function getEventStatus(event) {
  if (isFinished(event)) {
    return "ended";
  }

  const status = String(event?.status || "")
    .trim()

    .toLowerCase();

  if (status === "draft") {
    return "draft";
  }

  // Waiting for the publish fee to be paid and confirmed.
  if (status === "pending_payment") {
    return "payment";
  }

  return "published";
}

export const EVENT_STATUS_LABELS = {
  published: "Нийтлэгдсэн",

  draft: "Ноорог",

  payment: "Төлбөр хүлээгдэж буй",

  ended: "Дууссан",
};

// Badge text for an event waiting for its publish fee.
export function paymentStatusLabel(event) {
  if (event?.fee_status === "submitted") return "Төлбөр шалгагдаж буй";
  if (event?.fee_status === "rejected") return "Төлбөр татгалзсан";
  return EVENT_STATUS_LABELS.payment;
}

export function makeSpeaker() {
  return {
    name: "",

    organization: "",

    topic: "",

    avatar: null,
  };
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
    return [];
  }
}

export function parseAgenda(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSpeakerAvatar(speaker) {
  return (
    speaker?.avatar_url ||
    speaker?.avatar ||
    speaker?.image_url ||
    speaker?.profile ||
    speaker?.photo ||
    ""
  );
}

export function isSvgFile(file) {
  return (
    file?.type === "image/svg+xml" ||
    String(file?.name || "")
      .toLowerCase()

      .endsWith(".svg")
  );
}

export function getParticipantName(user) {
  if (!user) {
    return "Тодорхойгүй хэрэглэгч";
  }

  if (typeof user === "string") {
    return user;
  }

  return (
    user.name ||
    user.full_name ||
    user.display_name ||
    user.fullName ||
    [user.first_name, user.last_name]

      .filter(Boolean)

      .join(" ") ||
    [user.last_name, user.first_name]

      .filter(Boolean)

      .join(" ") ||
    [user.firstName, user.lastName]

      .filter(Boolean)

      .join(" ") ||
    user.username ||
    user.user?.name ||
    user.user?.full_name ||
    user.user?.display_name ||
    [user.user?.first_name, user.user?.last_name]

      .filter(Boolean)

      .join(" ") ||
    user.email ||
    user.user?.email ||
    "Тодорхойгүй хэрэглэгч"
  );
}

export function getParticipantEmail(user) {
  if (!user || typeof user === "string") {
    return "";
  }

  return user.email || user.user_email || user.user?.email || "";
}

export function getParticipantInitials(user) {
  const name = getParticipantName(user).trim();

  if (!name) {
    return "?";
  }

  const parts = name

    .split(/\s+/)

    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]

      .charAt(0)

      .toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function getParticipantId(user) {
  const value = user?.user_id || user?.id || user?.user?.id;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function isValidInviteEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "")
      .trim()

      .toLowerCase(),
  );
}
