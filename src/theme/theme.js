
export const THEME_KEY = "registra-theme";

export function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";

  const root = document.documentElement;

  // index.css keys its dark rules off all three attributes (and some off
  // body[data-user-theme]); keep them in sync from one place.
  root.setAttribute("data-theme", next);
  root.setAttribute("data-user-theme", next);
  root.setAttribute("data-public-theme", next);
  root.style.colorScheme = next;

  if (document.body) {
    document.body.setAttribute("data-user-theme", next);
  }

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}

  window.dispatchEvent(
    new CustomEvent("registra-theme-change", {
      detail: { theme: next },
    })
  );

  return next;
}

export function toggleTheme() {
  return applyTheme(getTheme() === "dark" ? "light" : "dark");
}
