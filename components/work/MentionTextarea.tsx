"use client";

import { useEffect, useRef, useState } from "react";
import { listMentionableUsers } from "@/lib/work/actions";
import type { MentionableUser } from "@/lib/work/types";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

interface DropdownState {
  open: boolean;
  query: string;
  /** Index of the "@" character that triggered this dropdown */
  triggerIndex: number;
  filtered: MentionableUser[];
  activeIdx: number;
}

const CLOSED: DropdownState = {
  open: false,
  query: "",
  triggerIndex: -1,
  filtered: [],
  activeIdx: 0,
};

function displayName(u: MentionableUser): string {
  return u.name ?? u.email.split("@")[0];
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows = 2,
  className,
  autoFocus,
}: Props) {
  const [users, setUsers] = useState<MentionableUser[]>([]);
  const [dropdown, setDropdown] = useState<DropdownState>(CLOSED);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch mentionable users once on mount
  useEffect(() => {
    let cancelled = false;
    void listMentionableUsers().then((us) => {
      if (!cancelled) setUsers(us);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);

    // Detect if cursor is right after a "@" word
    const cursor = e.target.selectionStart ?? next.length;
    const textUpToCursor = next.slice(0, cursor);
    const match = /@([A-Za-z0-9._%+-]*)$/.exec(textUpToCursor);

    if (match) {
      const query = match[1].toLowerCase();
      const triggerIndex = match.index;
      const filtered = users.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          (u.name ?? "").toLowerCase().includes(query)
      );
      setDropdown({ open: true, query, triggerIndex, filtered, activeIdx: 0 });
    } else {
      setDropdown(CLOSED);
    }
  }

  function selectUser(user: MentionableUser) {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? value.length;
    const before = value.slice(0, dropdown.triggerIndex);
    const after = value.slice(cursor);
    const insertion = `@${user.email} `;
    const nextValue = before + insertion + after;
    onChange(nextValue);
    setDropdown(CLOSED);
    // Move cursor after insertion
    const newCursor = before.length + insertion.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (dropdown.open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setDropdown((d) => ({
          ...d,
          activeIdx: Math.min(d.activeIdx + 1, d.filtered.length - 1),
        }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setDropdown((d) => ({ ...d, activeIdx: Math.max(d.activeIdx - 1, 0) }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const user = dropdown.filtered[dropdown.activeIdx];
        if (user) {
          e.preventDefault();
          selectUser(user);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDropdown(CLOSED);
        return;
      }
    }
    onKeyDown?.(e);
  }

  // Scroll active item into view
  useEffect(() => {
    if (!dropdown.open || !listRef.current) return;
    const item = listRef.current.children[dropdown.activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [dropdown.activeIdx, dropdown.open]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={
          className ??
          "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        }
        rows={rows}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay close so click on dropdown item registers
          setTimeout(() => setDropdown(CLOSED), 150);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />

      {dropdown.open && dropdown.filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 z-50 mt-1 max-h-48 w-64 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {dropdown.filtered.map((user, idx) => (
            <li
              key={user.id}
              role="option"
              aria-selected={idx === dropdown.activeIdx}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                selectUser(user);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                idx === dropdown.activeIdx
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold uppercase text-white">
                {displayName(user)[0]}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium">{displayName(user)}</div>
                <div className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {user.email}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
