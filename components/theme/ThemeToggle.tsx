"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";

interface ThemeToggleProps {
  /** Style variant for the trigger (matches TopBar's dark surface) */
  variant?: "topbar" | "default";
}

export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest("[data-theme-toggle]");
      if (!el) setOpen(false);
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const triggerClasses =
    variant === "topbar"
      ? "flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-white/8 hover:text-zinc-200 transition-colors"
      : "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

  // Render a stable placeholder before mount to avoid a hydration mismatch.
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className={triggerClasses}
        data-theme-toggle
      >
        <Sun size={16} />
      </button>
    );
  }

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div className="relative" data-theme-toggle>
      <button
        aria-label="Toggle theme"
        title={`Theme: ${theme}`}
        className={triggerClasses}
        onClick={(e) => {
          // Click = quick toggle; right-click or alt-click = menu
          if (e.altKey || e.shiftKey) {
            setOpen((v) => !v);
          } else {
            toggle();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Icon size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-40 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden"
          data-theme-toggle
        >
          {(
            [
              { value: "light", label: "Light", Icon: Sun },
              { value: "dark", label: "Dark", Icon: Moon },
              { value: "system", label: "System", Icon: Monitor },
            ] as { value: Theme; label: string; Icon: typeof Sun }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTheme(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                theme === opt.value
                  ? "bg-muted text-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <opt.Icon className="h-3.5 w-3.5 text-muted-foreground" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
