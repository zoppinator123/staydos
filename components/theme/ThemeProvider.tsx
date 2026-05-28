"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "staydos:theme";

interface ThemeContextValue {
  /** User's chosen preference: 'light' | 'dark' | 'system' */
  theme: Theme;
  /** The currently applied theme after resolving 'system'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

function applyClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Hydrate from localStorage / system on mount
  useEffect(() => {
    const stored = readStoredTheme();
    const sys = readSystemTheme();
    const resolved: ResolvedTheme = stored === "system" ? sys : stored;
    /* eslint-disable react-hooks/set-state-in-effect */
    setThemeState(stored);
    setResolvedTheme(resolved);
    /* eslint-enable react-hooks/set-state-in-effect */
    applyClass(resolved);
  }, []);

  // Listen to system theme changes when user picked 'system'
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function listener() {
      const sys: ResolvedTheme = mql.matches ? "dark" : "light";
      setResolvedTheme(sys);
      applyClass(sys);
    }
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    const resolved: ResolvedTheme = t === "system" ? readSystemTheme() : t;
    setResolvedTheme(resolved);
    applyClass(resolved);
  }, []);

  const toggle = useCallback(() => {
    // Cycle: light -> dark -> light. If on 'system', resolve current and flip.
    const current: ResolvedTheme = resolvedTheme;
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggle }),
    [theme, resolvedTheme, setTheme, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so non-wrapped renders don't crash; theme operations no-op
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Inline script that applies the theme class on <html> BEFORE React hydration
 * so the first paint matches the user's choice and there is no flash.
 * Render this inside <head>.
 */
export function ThemeScript() {
  const script = `(() => {
  try {
    var key = "${STORAGE_KEY}";
    var stored = window.localStorage.getItem(key);
    var sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var resolved = (stored === "light" || stored === "dark") ? stored : sys;
    if (resolved === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
