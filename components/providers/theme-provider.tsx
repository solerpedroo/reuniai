"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "reuniai-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeScript() {
  const script = `
    (function () {
      try {
        var theme = localStorage.getItem("${STORAGE_KEY}") === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return { theme, setTheme, toggleTheme };
}
