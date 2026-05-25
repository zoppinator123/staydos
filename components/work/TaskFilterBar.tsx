"use client";

import { useMemo } from "react";
import type { Status, TaskPriority } from "@/lib/work/types";
import { Input, Select } from "@/components/ui/Input";

export interface TaskFilterState {
  query: string;
  status: string; // status_id or ""
  priority: TaskPriority | "";
  showCompleted: boolean;
  view: "list" | "kanban";
}

export const DEFAULT_FILTER: TaskFilterState = {
  query: "",
  status: "",
  priority: "",
  showCompleted: true,
  view: "list",
};

interface Props {
  value: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
  statuses?: Status[];
  showViewToggle?: boolean;
}

export function TaskFilterBar({ value, onChange, statuses = [], showViewToggle }: Props) {
  const statusOptions = useMemo(
    () => [
      { value: "", label: "All statuses" },
      ...statuses.map((s) => ({ value: s.id, label: s.name })),
    ],
    [statuses]
  );

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Input
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        placeholder="Search tasks…"
        className="h-8 max-w-xs flex-1"
      />
      {statuses.length > 0 ? (
        <Select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          options={statusOptions}
          className="h-8 w-40"
        />
      ) : null}
      <Select
        value={value.priority}
        onChange={(e) =>
          onChange({ ...value, priority: e.target.value as TaskPriority | "" })
        }
        options={[
          { value: "", label: "Any priority" },
          { value: "urgent", label: "Urgent" },
          { value: "high", label: "High" },
          { value: "normal", label: "Normal" },
          { value: "low", label: "Low" },
          { value: "none", label: "None" },
        ]}
        className="h-8 w-36"
      />
      <label className="ml-1 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={value.showCompleted}
          onChange={(e) => onChange({ ...value, showCompleted: e.target.checked })}
          className="h-3.5 w-3.5 accent-indigo-600"
        />
        Show completed
      </label>

      {showViewToggle ? (
        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-zinc-200 text-xs dark:border-zinc-800">
          {(["list", "kanban"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onChange({ ...value, view: v })}
              className={`px-2.5 py-1 capitalize ${
                value.view === v
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
