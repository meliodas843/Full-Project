// Helpers for Topbar.jsx, moved out to keep the page component readable.
import { API_BASE } from "../../../lib/config";

export const ORGANIZATION_LOGOS = [
  "/registra-default-images/logos/logo-color-1-example.svg",

  "/registra-default-images/logos/logo-color-2-example.svg",

  "/registra-default-images/logos/logo-color-3-example.svg",

  "/registra-default-images/logos/logo-color-4-example.svg",

  "/registra-default-images/logos/logo-color-5-example.svg",

  "/registra-default-images/logos/logo-color-6-example.svg",
];

export function cleanValue(value) {
  return String(value ?? "").trim();
}

export function hashIdentity(value) {
  const text = cleanValue(value) || "registra";

  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function stableOrganizationLogo(key) {
  return ORGANIZATION_LOGOS[hashIdentity(key) % ORGANIZATION_LOGOS.length];
}

export function resolveOrganizationImage(value) {
  const image = cleanValue(value);

  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/registra-default-images/")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_BASE}${image}`;
  }

  return `${API_BASE}/${image}`;
}

export function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "mn-MN",

    {
      year: "numeric",

      month: "short",

      day: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    },
  );
}

export function getNotificationType(item) {
  const raw = String(
    item?.type ||
      item?.notification_type ||
      item?.kind ||
      item?.request_type ||
      "",
  )
    .trim()

    .toLowerCase();

  if (raw.includes("meeting")) {
    return "meeting";
  }

  if (raw.includes("event")) {
    return "event";
  }

  if (item?.meeting_id || item?.meeting?.id) {
    return "meeting";
  }

  if (item?.event_id || item?.event?.id) {
    return "event";
  }

  return "event";
}

export function getEventId(item) {
  return (
    item?.event_id || item?.event?.id || item?.eventId || item?.eventID || null
  );
}

export function getMeetingId(item) {
  return (
    item?.meeting_id ||
    item?.meeting?.id ||
    item?.meetingId ||
    item?.meetingID ||
    null
  );
}

export function getRequestId(item) {
  return item?.request_id || item?.notification_id || item?.id || null;
}

export function getNotificationKey(
  item,

  index,
) {
  return (
    item?.request_id ||
    item?.notification_id ||
    item?.id ||
    item?.event_id ||
    item?.meeting_id ||
    `${item?.title || "notification"}-${index}`
  );
}

export function getNotificationStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const identity = user?.id || user?.user_id || user?.email || "guest";

    return `registra_seen_notifications_${identity}`;
  } catch {
    return "registra_seen_notifications_guest";
  }
}

export function loadSeenNotificationKeys() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(getNotificationStorageKey()) || "[]",
    );

    return Array.isArray(stored) ? stored.map((value) => String(value)) : [];
  } catch {
    return [];
  }
}
