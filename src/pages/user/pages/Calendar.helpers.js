// Helpers for Calendar.jsx, moved out to keep the page component readable.
export function getToken() {
  return localStorage.getItem("token");
}

export function parseDate(value) {
  if (!value) return null;

  const raw = String(value).trim();

  const date = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function isoKey(value) {
  const date = value instanceof Date ? value : parseDate(value);

  if (!date) return "";

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function monthGrid(date) {
  const year = date.getFullYear();

  const month = date.getMonth();

  const first = new Date(
    year,

    month,

    1,
  );

  const start = first.getDay() === 0 ? 6 : first.getDay() - 1;

  const days = new Date(
    year,

    month + 1,

    0,
  ).getDate();

  const result = [];

  for (let index = 0; index < start; index += 1) {
    result.push(null);
  }

  for (let day = 1; day <= days; day += 1) {
    result.push(new Date(year, month, day));
  }

  while (result.length % 7 !== 0) {
    result.push(null);
  }

  return result;
}

export function formatTime(value) {
  const date = parseDate(value);

  if (!date) return "";

  return date.toLocaleTimeString(
    "mn-MN",

    {
      timeZone: "Asia/Ulaanbaatar",

      hour: "2-digit",

      minute: "2-digit",

      hour12: false,
    },
  );
}

export function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

export function uniqueMeetings(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.id) return;

    const key = `${item.id}-${item.start_time || ""}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

export function meetingPersonName(meeting) {
  return (
    meeting?.creator_name ||
    meeting?.sender_name ||
    meeting?.creator_full_name ||
    meeting?.sender_full_name ||
    meeting?.creator_email ||
    meeting?.sender_email ||
    "Хэрэглэгч"
  );
}

export function meetingPersonEmail(meeting) {
  return meeting?.creator_email || meeting?.sender_email || "";
}

export function personInitials(value) {
  const text = String(value || "").trim();

  if (!text) return "U";

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
