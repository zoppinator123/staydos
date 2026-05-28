"use client";

import { useState } from "react";
import { Search, HelpCircle, Clock, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/work/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface TopBarProps {
  userEmail?: string;
  userName?: string;
}

function getInitials(email: string, name?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  // Fallback to email local part
  const local = email.split("@")[0];
  return local.slice(0, 2).toUpperCase();
}

function getDisplayName(email: string, name?: string): string {
  if (name) return name.split(" ")[0];
  return email.split("@")[0];
}

export function TopBar({ userEmail = "", userName }: TopBarProps) {
  const [searchValue, setSearchValue] = useState("");

  const initials = getInitials(userEmail, userName);
  const displayName = getDisplayName(userEmail, userName);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      window.location.href = `/work/tasks?search=${encodeURIComponent(searchValue.trim())}`;
    }
  }

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 px-4 z-40"
      style={{ background: "rgb(14 16 15)" }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <span
          className="font-display text-sm font-bold tracking-tight text-white select-none"
          style={{ letterSpacing: "-0.03em" }}
        >
          STAYDOS
        </span>
      </div>

      {/* Global search */}
      <div className="flex-1 max-w-xl mx-auto">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
            size={14}
            aria-hidden
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search tasks, docs, people…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-8 pr-14 text-sm text-zinc-300 placeholder-zinc-500 outline-none focus:border-white/20 focus:bg-white/8 transition-colors"
            aria-label="Global search"
          />
          <span
            className="kbd absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{
              background: "rgb(40 44 42)",
              borderColor: "rgb(60 65 62)",
              color: "rgb(120 130 125)",
            }}
          >
            ⌘K
          </span>
        </form>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Help */}
        <button
          aria-label="Help"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-white/8 hover:text-zinc-200 transition-colors"
        >
          <HelpCircle size={16} />
        </button>

        {/* Theme toggle */}
        <ThemeToggle variant="topbar" />

        {/* Notification bell — styled for dark mode */}
        <div className="[&_button]:text-zinc-400 [&_button:hover]:bg-white/8 [&_button:hover]:text-zinc-200">
          <NotificationBell />
        </div>

        {/* Recents / clock */}
        <button
          aria-label="Recent items"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-white/8 hover:text-zinc-200 transition-colors"
        >
          <Clock size={16} />
        </button>

        {/* User avatar */}
        <button
          aria-label="User menu"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-zinc-300 hover:bg-white/8 hover:text-white transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shrink-0">
            {initials}
          </span>
          <span className="text-xs font-medium hidden sm:block">{displayName}</span>
          <ChevronDown size={12} className="text-zinc-500 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
