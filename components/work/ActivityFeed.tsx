"use client";

import { useEffect, useState } from "react";
import { getActivity } from "@/lib/work/actions";
import { relativeTime } from "@/lib/utils/time";
import type { Status, TaskActivityEntry } from "@/lib/work/types";

interface Props {
  taskId: string;
  statuses?: Status[];
}

const ACTION_COLORS: Record<string, string> = {
  status_changed: "bg-blue-500",
  priority_changed: "bg-amber-500",
  due_date_changed: "bg-teal-500",
  assignees_changed: "bg-violet-500",
  renamed: "bg-indigo-500",
  description_changed: "bg-slate-500",
  moved: "bg-orange-500",
  completed: "bg-green-500",
  uncompleted: "bg-rose-500",
  archived: "bg-zinc-500",
  commented: "bg-sky-500",
  created: "bg-emerald-500",
  updated_custom_field: "bg-pink-500",
  attachment_added: "bg-cyan-500",
  recurrence_spawned: "bg-purple-500",
};

function dotColor(action: string): string {
  return ACTION_COLORS[action] ?? "bg-zinc-400";
}

function actorLabel(entry: TaskActivityEntry): string {
  return entry.actor_name ?? entry.actor_email ?? "Someone";
}

function avatarInitials(name: string | null, email: string | null): string {
  const src = name ?? email ?? "?";
  return src.slice(0, 2).toUpperCase();
}

function avatarColor(id: string | null): string {
  if (!id) return "bg-zinc-400";
  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-sky-500",
    "bg-teal-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-emerald-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function describeEntry(entry: TaskActivityEntry, statuses: Status[]): string {
  const actor = actorLabel(entry);
  const from = entry.from_value;
  const to = entry.to_value;

  switch (entry.action) {
    case "status_changed": {
      const fromStatus = statuses.find((s) => s.id === (from?.status_id as string));
      const toStatus = statuses.find((s) => s.id === (to?.status_id as string));
      const fromLabel = fromStatus?.name ?? (from?.status_id as string | null) ?? "None";
      const toLabel = toStatus?.name ?? (to?.status_id as string | null) ?? "None";
      return `${actor} changed status from ${fromLabel} → ${toLabel}`;
    }
    case "priority_changed": {
      const toVal = (to?.priority as string | null) ?? "none";
      return `${actor} set priority to ${toVal}`;
    }
    case "due_date_changed": {
      const toVal = to?.due_date as string | null;
      if (!toVal) return `${actor} removed due date`;
      const formatted = new Date(toVal).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return `${actor} set due date to ${formatted}`;
    }
    case "assignees_changed": {
      const fromArr = (from?.assignee_ids as string[] | null) ?? [];
      const toArr = (to?.assignee_ids as string[] | null) ?? [];
      const added = toArr.filter((id) => !fromArr.includes(id));
      const removed = fromArr.filter((id) => !toArr.includes(id));
      const parts: string[] = [];
      if (added.length) parts.push(`assigned ${added.length} user(s)`);
      if (removed.length) parts.push(`unassigned ${removed.length} user(s)`);
      return `${actor} ${parts.join(" and ")}`;
    }
    case "renamed": {
      const fromTitle = (from?.title as string | null) ?? "";
      const toTitle = (to?.title as string | null) ?? "";
      return `${actor} renamed task from "${fromTitle}" to "${toTitle}"`;
    }
    case "description_changed":
      return `${actor} updated description`;
    case "moved":
      return `${actor} moved task to a different list`;
    case "completed":
      return `${actor} completed this task`;
    case "uncompleted":
      return `${actor} reopened this task`;
    case "archived":
      return `${actor} archived this task`;
    case "commented":
      return `${actor} commented`;
    case "created":
      return `${actor} created this task`;
    case "updated_custom_field":
      return `${actor} updated a custom field`;
    case "attachment_added":
      return `${actor} added an attachment`;
    case "recurrence_spawned":
      return `${actor} spawned a recurring task`;
    default:
      return `${actor} performed ${entry.action}`;
  }
}

export function ActivityFeed({ taskId, statuses = [] }: Props) {
  const [entries, setEntries] = useState<TaskActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await getActivity(taskId);
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (loading) {
    return <p className="text-xs text-zinc-500">Loading activity…</p>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-zinc-500">No activity yet.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2.5 rounded px-1 py-1.5"
        >
          {/* Colored action dot */}
          <div className="mt-1.5 flex-shrink-0">
            <span
              className={`inline-block h-2 w-2 rounded-full ${dotColor(entry.action)}`}
            />
          </div>

          {/* Actor avatar */}
          {entry.actor_id ? (
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${avatarColor(entry.actor_id)}`}
              title={entry.actor_name ?? entry.actor_email ?? entry.actor_id}
            >
              {avatarInitials(entry.actor_name, entry.actor_email)}
            </div>
          ) : (
            <div className="h-6 w-6 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          )}

          {/* Description + time */}
          <div className="min-w-0 flex-1">
            <span className="text-xs text-zinc-700 dark:text-zinc-300">
              {describeEntry(entry, statuses)}
            </span>
          </div>

          <span
            className="flex-shrink-0 text-[11px] text-zinc-400"
            title={new Date(entry.created_at).toLocaleString()}
          >
            {relativeTime(entry.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
