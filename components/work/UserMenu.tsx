"use client";

import { useState, useTransition } from "react";
import { signOut } from "@/lib/auth/actions";

export function UserMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold uppercase text-white">
          {email?.[0] ?? "?"}
        </span>
        <span className="flex-1 truncate">{email ?? "Account"}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="absolute bottom-full left-2 right-2 mb-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() =>
              startTransition(() => {
                signOut();
              })
            }
            disabled={pending}
            className="block w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
