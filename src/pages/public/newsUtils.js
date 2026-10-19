// Shared helpers for the public news list and article pages.

export const NEWS_CATEGORIES = ["DevOps", "Cloud", "AI/ML", "Security", "Frontend", "Data", "Мэдэгдэл"];

const CATEGORY_CLASS = {
  DevOps: "devops",
  Cloud: "cloud",
  "AI/ML": "ai-ml",
  Security: "security",
  Frontend: "frontend",
  Data: "data",
  Мэдэгдэл: "notice",
};

export function categoryClass(value) {
  return CATEGORY_CLASS[value] || "other";
}

// The category chosen in the admin editor, or "" when none was picked.
// Posts without one show no category badge.
export function getCategory(item) {
  return String(item?.category || "").trim();
}
