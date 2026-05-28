"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { listMentionableUsers } from "@/lib/work/actions";
import type { MentionableUser } from "@/lib/work/types";

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  minRows?: number;
}

interface DropdownPos {
  top: number;
  left: number;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  onSubmit,
  autoFocus,
  minRows = 2,
}: MentionInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [users, setUsers] = useState<MentionableUser[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [atIndex, setAtIndex] = useState<number>(-1);
  const [dropPos, setDropPos] = useState<DropdownPos>({ top: 0, left: 0 });
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Lazy-load mentionable users once on first @ typed
  const loadUsers = useCallback(async () => {
    if (users.length > 0) return;
    try {
      const list = await listMentionableUsers();
      setUsers(list);
    } catch {
      // ignore
    }
  }, [users.length]);

  const filteredUsers =
    query !== null
      ? users.filter((u) => {
          const q = query.toLowerCase();
          return (
            (u.name?.toLowerCase().includes(q) ?? false) ||
            u.email.toLowerCase().includes(q)
          );
        })
      : [];

  /** Compute dropdown pixel position from caret offset in textarea */
  function computeDropPos(ta: HTMLTextAreaElement, caretPos: number): DropdownPos {
    const rect = ta.getBoundingClientRect();
    const style = window.getComputedStyle(ta);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    // Count newlines before caret
    const textBeforeCaret = ta.value.slice(0, caretPos);
    const lines = textBeforeCaret.split("\n").length;

    return {
      top: rect.top + window.scrollY + paddingTop + lines * lineHeight,
      left: rect.left + window.scrollX + 8,
    };
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const caret = e.target.selectionStart ?? val.length;
    onChange(val);

    // Detect @ trigger: walk backwards from caret
    let at = -1;
    for (let i = caret - 1; i >= 0; i--) {
      const ch = val[i];
      if (ch === "@") {
        at = i;
        break;
      }
      if (ch === " " || ch === "\n") break;
    }

    if (at >= 0) {
      const q = val.slice(at + 1, caret);
      if (!q.includes(" ")) {
        setQuery(q);
        setAtIndex(at);
        setSelectedIdx(0);
        setDropPos(computeDropPos(e.target, caret));
        loadUsers();
        return;
      }
    }
    setQuery(null);
  }

  function insertMention(user: MentionableUser) {
    if (!ref.current) return;
    const ta = ref.current;
    const caret = ta.selectionStart ?? value.length;
    const before = value.slice(0, atIndex);
    const after = value.slice(caret);
    const mention = `@[${user.name ?? user.email}](${user.id})`;
    const newVal = before + mention + " " + after;
    onChange(newVal);
    setQuery(null);

    // Restore focus and move caret after mention
    setTimeout(() => {
      ta.focus();
      const pos = before.length + mention.length + 1;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        setQuery(null);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setQuery(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={minRows}
        className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      {query !== null && filteredUsers.length > 0 && (
        <div
          className="fixed z-50 w-64 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden"
          style={{ top: dropPos.top, left: dropPos.left }}
        >
          {filteredUsers.slice(0, 8).map((u, i) => (
            <button
              key={u.id}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${
                i === selectedIdx ? "bg-muted" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-semibold text-accent">
                {(u.name ?? u.email)[0].toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{u.name ?? u.email}</div>
                {u.name && (
                  <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
