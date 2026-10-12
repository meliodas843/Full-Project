import { useEffect, useState } from "react";

const THEME_KEY = "registra-theme";

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);

    if (saved === "dark" || saved === "light") {
      return saved;
    }

    return "light";
  });

  useEffect(() => {
    const applyTheme = () => {
      const saved = localStorage.getItem(THEME_KEY);
      const nextTheme =
        saved === "dark" || saved === "light" ? saved : "light";

      setTheme(nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
    };

    applyTheme();

    window.addEventListener("storage", applyTheme);
    window.addEventListener("registra-theme-change", applyTheme);

    return () => {
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("registra-theme-change", applyTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.dispatchEvent(new Event("registra-theme-change"));
    setTheme(nextTheme);
  };

  return { theme, toggleTheme };
}