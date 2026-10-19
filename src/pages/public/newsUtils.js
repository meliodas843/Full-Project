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

// The category chosen in the admin editor wins; old posts without one
// fall back to a guess from their text.
export function getCategory(item) {
  if (item?.category) return item.category;

  const text = `${item?.title || ""} ${item?.body || item?.content || item?.description || ""}`.toLowerCase();

  if (/security|cyber|zero[- ]trust|аюулгүй/.test(text)) return "Security";
  if (/cloud|kubernetes|docker|aws|azure/.test(text)) return "Cloud";
  if (/\bai\b|llm|machine learning|artificial/.test(text)) return "AI/ML";
  if (/frontend|react|javascript|typescript/.test(text)) return "Frontend";
  if (/\bdata\b|analytics|database/.test(text)) return "Data";
  return "DevOps";
}
