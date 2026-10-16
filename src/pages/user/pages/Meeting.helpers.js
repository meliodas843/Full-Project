// Helpers for Meeting.jsx, moved out to keep the page component readable.
export function getToken() {
  return localStorage.getItem("token");
}

export function getDisplayName(person) {
  return (
    String(person?.name || "").trim() ||
    `${person?.first_name || ""} ${person?.last_name || ""}`.trim() ||
    String(person?.email || "").trim() ||
    "Хэрэглэгч"
  );
}

export function getInitials(person) {
  const name = getDisplayName(person);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.participants)) return data.participants;
  if (Array.isArray(data?.employees)) return data.employees;
  return [];
}
