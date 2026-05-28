"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";

interface Props {
  currentUser: { id: string; email: string; name?: string };
}

export function GeneralTab({ currentUser }: Props) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-8">
      {/* Account */}
      <section className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The account you&rsquo;re currently signed in as.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </p>
            <p className="mt-1 text-sm text-foreground">
              {currentUser.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </p>
            <p className="mt-1 text-sm text-foreground break-all">
              {currentUser.email}
            </p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose how Staydos looks to you. System matches your device theme.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(
            [
              { value: "light", label: "Light", Icon: Sun },
              { value: "dark", label: "Dark", Icon: Moon },
              { value: "system", label: "System", Icon: Monitor },
            ] as { value: Theme; label: string; Icon: typeof Sun }[]
          ).map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-card border p-4 text-sm transition-colors ${
                  active
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-foreground hover:bg-muted"
                }`}
                aria-pressed={active}
              >
                <opt.Icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
