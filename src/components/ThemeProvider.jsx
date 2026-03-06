import React, { useEffect, useState } from "react";

/**
 * ThemeProvider Component
 * 
 * Manages system theme preference and applies dark class to html element
 * Integrates with existing Tailwind dark mode configuration
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Check for stored theme preference
    const storedTheme = localStorage.getItem("theme");
    
    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme = prefersDark ? "dark" : "light";
      setTheme(systemTheme);
      applyTheme(systemTheme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  function applyTheme(themeName) {
    const html = document.documentElement;
    if (themeName === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", themeName);
  }

  return <>{children}</>;
}