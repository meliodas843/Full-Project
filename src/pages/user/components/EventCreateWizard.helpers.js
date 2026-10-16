// Helpers for EventCreateWizard.jsx, moved out to keep the page component readable.
export const BADGE_OPTIONS = [
  {
    value: "Технологи",

    label: "Технологи",
  },

  {
    value: "Бизнес",

    label: "Бизнес",
  },

  {
    value: "Боловсрол",

    label: "Боловсрол",
  },

  {
    value: "Хурал, конференц",

    label: "Хурал, конференц",
  },

  {
    value: "Сургалт",

    label: "Сургалт",
  },

  {
    value: "Танилцах, харилцаа холбоо",

    label: "Танилцах, харилцаа холбоо",
  },

  {
    value: "Нийгэмлэг",

    label: "Нийгэмлэг",
  },

  {
    value: "Спорт",

    label: "Спорт",
  },

  {
    value: "Энтертайнмент",

    label: "Энтертайнмент",
  },
];

export function resolvePreview(imageFile, imageUrl, resolveUrl) {
  if (typeof File !== "undefined" && imageFile instanceof File) {
    return URL.createObjectURL(imageFile);
  }

  if (imageUrl && typeof resolveUrl === "function") {
    return resolveUrl(imageUrl);
  }

  return "";
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

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getDatePart(value) {
  const normalized = normalizeDateTimeLocalValue(value);

  return normalized ? normalized.slice(0, 10) : "";
}

export function getTimePart(value) {
  const normalized = normalizeDateTimeLocalValue(value);

  return normalized ? normalized.slice(11, 16) : "";
}

export function combineDateAndTime(date, time) {
  if (!date) return "";

  return `${date}T${time || "09:00"}`;
}

export function formatPreviewDate(value) {
  if (!value) {
    return "Тодорхойгүй";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("mn-MN", {
    month: "long",

    day: "numeric",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    hour12: false,
  });
}
