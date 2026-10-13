
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

  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.style.colorScheme = next;

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
