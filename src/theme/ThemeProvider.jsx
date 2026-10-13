
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { THEME_KEY, applyTheme, getTheme } from "./theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event) => {
      setTheme(event.detail.theme);
    };

    window.addEventListener(
      "registra-theme-change",
      handleThemeChange
    );

    return () => {
      window.removeEventListener(
        "registra-theme-change",
        handleThemeChange
      );
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key === THEME_KEY &&
        (event.newValue === "dark" || event.newValue === "light")
      ) {
        setTheme(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () =>
        setTheme((current) =>
          current === "dark" ? "light" : "dark"
        ),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
