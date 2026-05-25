"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getSpaceMembers, getListMembers } from "@/lib/work/permissions";
import { getList } from "@/lib/work/actions";
import { Input } from "@/components/ui/Input";

interface Props {
  listId: string;
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Lightweight assignee picker. Pulls candidates from the list's members and
 * (if applicable) the parent space's members. We surface profile_id only —
 * Supabase doesn't expose auth.users via the anon role by default, so emails
 * aren't visible without a `profiles` table mirror. We show the short id.
 */
export function AssigneePicker({ listId, value, onChange }: Props) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const list = await getList(listId);
      const [lm, sm] = await Promise.all([
        getListMembers(listId),
        list?.space_id ? getSpaceMembers(list.space_id) : Promise.resolve([]),
      ]);
      const ids = new Set<string>();
      lm.forEach((m) => ids.add(m.profile_id));
      sm.forEach((m) => ids.add(m.profile_id));
      value.forEach((v) => ids.add(v));
      setCandidates([...ids]);
    });
  }, [listId, value]);

  const filtered = useMemo(
    () => candidates.filter((c) => c.toLowerCase().includes(query.toLowerCase())),
    [candidates, query]
  );

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members…"
        className="mb-2"
      />
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-xs text-zinc-500">No candidates yet.</p>
        ) : (
          filtered.map((id) => {
            const on = value.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs ${
                  on
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded border ${
                    on
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                />
                <span className="font-mono">{id.slice(0, 8)}…</span>
              </button>
            );
          })
        )}
      </div>
      {value.length > 0 ? (
        <p className="mt-2 text-[11px] text-zinc-500">
          {value.length} assignee{value.length === 1 ? "" : "s"} selected
        </p>
      ) : null}
    </div>
  );
}
