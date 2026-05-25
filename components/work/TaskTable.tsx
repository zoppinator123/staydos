"use client";

import { useMemo, useState, useTransition } from "react";
import { completeTask, reorderTasks, uncompleteTask } from "@/lib/work/actions";
import type { Status, Task, TaskWithMeta } from "@/lib/work/types";
import { PriorityBadge, StatusBadge, Tag } from "@/components/ui/Badge";
import { TaskEditModal } from "./TaskEditModal";

type RowTask = Task | TaskWithMeta;

interface Props {
  listId: string;
  tasks: RowTask[];
  statuses?: Status[];
  showListColumn?: boolean;
}

export function TaskTable({ listId, tasks: initial, statuses = [], showListColumn }: Props) {
  const [tasks, setTasks] = useState<RowTask[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statusMap = useMemo(() => {
    const m = new Map<string, Status>();
    for (const s of statuses) m.set(s.id, s);
    return m;
  }, [statuses]);

  function statusFor(t: RowTask) {
    if ("status_name" in t && t.status_name) {
      return { name: t.status_name, color: t.status_color, category: t.status_category };
    }
    if (t.status_id && statusMap.get(t.status_id)) {
      const s = statusMap.get(t.status_id)!;
      return { name: s.name, color: s.color, category: s.category };
    }
    return { name: null, color: null, category: null };
  }

  function toggleComplete(t: RowTask) {
    startTransition(async () => {
      if (t.completed_at) {
        const updated = await uncompleteTask(t.id);
        setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, ...updated } : x)));
      } else {
        const updated = await completeTask(t.id);
        setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, ...updated } : x)));
      }
    });
  }

  function onDragStart(id: string) {
    setDragId(id);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const cur = [...tasks];
    const from = cur.findIndex((t) => t.id === dragId);
    const to = cur.findIndex((t) => t.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = cur.splice(from, 1);
    cur.splice(to, 0, moved);
    setTasks(cur);
    setDragId(null);
    const ordered = cur.map((t) => t.id);
    startTransition(async () => {
      try {
        await reorderTasks(listId, ordered);
      } catch (e) {
        console.error("reorder failed", e);
      }
    });
  }

  return (
    <div className="w-full">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-8" />
          <col />
          <col className="w-32" />
          <col className="w-32" />
          <col className="w-28" />
          <col className="w-28" />
          {showListColumn ? <col className="w-32" /> : null}
        </colgroup>
        <thead className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          <tr>
            <th></th>
            <th className="px-2 py-2">Task</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Assignees</th>
            <th className="px-2 py-2">Due</th>
            <th className="px-2 py-2">Priority</th>
            {showListColumn ? <th className="px-2 py-2">List</th> : null}
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={showListColumn ? 7 : 6} className="py-12 text-center text-zinc-500">
                No tasks yet.
              </td>
            </tr>
          ) : (
            tasks.map((t) => {
              const st = statusFor(t);
              const completed = !!t.completed_at;
              return (
                <tr
                  key={t.id}
                  draggable
                  onDragStart={() => onDragStart(t.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(t.id)}
                  className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/60"
                  onClick={() => setEditing(t.id)}
                >
                  <td className="px-2 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={completed}
                      onChange={() => toggleComplete(t)}
                      className="h-4 w-4 cursor-pointer accent-indigo-600"
                      disabled={pending}
                    />
                  </td>
                  <td className="truncate px-2 py-2">
                    <span
                      className={`${completed ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}
                    >
                      {t.title}
                    </span>
                    {t.tags?.length ? (
                      <span className="ml-2 inline-flex gap-1">
                        {t.tags.slice(0, 3).map((tag) => (
                          <Tag key={tag} value={tag} />
                        ))}
                      </span>
                    ) : null}
                    {t.recurrence_rule ? (
                      <span
                        className="ml-2 inline-block rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                        title={`Recurring (${t.recurrence_rule.frequency})`}
                      >
                        ↻
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <StatusBadge name={st.name} color={st.color} category={st.category} />
                  </td>
                  <td className="truncate px-2 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {t.assignee_ids?.length ? `${t.assignee_ids.length} assigned` : "—"}
                  </td>
                  <td className="px-2 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <PriorityBadge value={t.priority} />
                  </td>
                  {showListColumn ? (
                    <td className="truncate px-2 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {"list_name" in t ? t.list_name : ""}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {editing ? (
        <TaskEditModal
          taskId={editing}
          statuses={statuses}
          onClose={() => setEditing(null)}
          onSaved={(updated) =>
            setTasks((cur) => cur.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))
          }
          onDeleted={(id) => setTasks((cur) => cur.filter((t) => t.id !== id))}
        />
      ) : null}
    </div>
  );
}
