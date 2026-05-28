"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function CmdK() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay to allow the modal to render before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset query when closed
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(""), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/work/tasks?search=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-xl border border-border bg-surface animate-slide-up">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, docs, people…"
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm outline-none"
              aria-label="Search"
            />
            <span className="kbd shrink-0">Esc</span>
          </div>

          {/* Quick action hint */}
          <div className="px-4 py-3">
            {query.trim() ? (
              <button
                type="submit"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-accent-soft hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Search size={14} className="shrink-0 text-accent" />
                Search for &ldquo;{query}&rdquo;
                <span className="ml-auto text-xs text-muted-foreground">↵</span>
              </button>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Type to search tasks, docs, and more
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
