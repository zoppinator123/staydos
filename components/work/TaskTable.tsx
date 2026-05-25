"use client";

import { useMemo, useState, useTransition } from "react";
import { completeTask, reorderTasks, uncompleteTask } from "@/lib/work/actions";
import type { Status, Task, TaskWithMeta } from "@/lib/work/types";
import { PriorityBadge, StatusBadge, Tag } from "@/components/ui/Badge";
import { TaskEditModal } from "./TaskEditModal";
import {
  TaskFilterBar,
  DEFAULT_FILTER,
  type TaskFilterState,
} from "./TaskFilterBar";

type RowTask = Task | TaskWithMeta;

interface Props {
  listId: string;
  tasks: RowTask[];
  statuses?: Status[];
  showListColumn?: boolean;
  showFilters?: boolean;
  showKanbanToggle?: boolean;
  emptyMessage?: string;
}

export function TaskTable({
  listId,
  tasks: initial,
  statuses = [],
  showListColumn,
  showFilters = true,
  showKanbanToggle = false,
  emptyMessage = "No tasks yet.",
}: Props) {
  const [tasks, setTasks] = useState<RowTask[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<TaskFilterState>(DEFAULT_FILTER);

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

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!filter.showCompleted && t.completed_at) return false;
      if (filter.status && t.status_id !== filter.status) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (q) {
        const hay =
          (t.title ?? "") +
          " " +
          (t.description ?? "") +
          " " +
          (t.tags ?? []).join(" ");
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filter]);

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
    if (!dragId || dragId === targetId || !listId) return;
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

  const isKanban = showKanbanToggle && filter.view === "kanban";

  return (
    <div className="w-full">
      {showFilters ? (
        <TaskFilterBar
          value={filter}
          onChange={setFilter}
          statuses={statuses}
          showViewToggle={showKanbanToggle}
        />
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {tasks.length === 0 ? emptyMessage : "No tasks match your filters."}
          </p>
          {tasks.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              Add your first task using the row below.
            </p>
          ) : (
            <button
              onClick={() => setFilter(DEFAULT_FILTER)}
              className="mt-3 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : isKanban ? (
        <KanbanBoard
          tasks={filtered}
          statuses={statuses}
          onOpen={(id) => setEditing(id)}
          onToggleComplete={toggleComplete}
          pending={pending}
        />
      ) : (
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
            {filtered.map((t) => {
              const st = statusFor(t);
              const completed = !!t.completed_at;
              return (
                <tr
                  key={t.id}
                  draggable={!!listId}
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
            })}
          </tbody>
        </table>
      )}

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

interface KanbanProps {
  tasks: RowTask[];
  statuses: Status[];
  onOpen: (id: string) => void;
  onToggleComplete: (t: RowTask) => void;
  pending: boolean;
}

function KanbanBoard({ tasks, statuses, onOpen, onToggleComplete, pending }: KanbanProps) {
  const columns = useMemo(() => {
    const cols: Array<{ id: string | null; name: string; color: string | null; tasks: RowTask[] }> =
      statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, tasks: [] }));
    const noStatus: { id: null; name: string; color: null; tasks: RowTask[] } = {
      id: null,
      name: "No status",
      color: null,
      tasks: [],
    };
    for (const t of tasks) {
      const col = cols.find((c) => c.id === t.status_id);
      if (col) col.tasks.push(t);
      else noStatus.tasks.push(t);
    }
    return noStatus.tasks.length ? [noStatus, ...cols] : cols;
  }, [tasks, statuses]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div
          key={col.id ?? "none"}
          className="flex w-64 shrink-0 flex-col rounded-md border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-800">
            <span
              className="inline-flex items-center gap-2"
              style={col.color ? { color: col.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: col.color ?? "#a1a1aa" }}
              />
              {col.name}
            </span>
            <span className="text-[10px] text-zinc-500">{col.tasks.length}</span>
          </div>
          <div className="flex flex-col gap-2 p-2">
            {col.tasks.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-zinc-400">No tasks</p>
            ) : (
              col.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onOpen(t.id)}
                  className="rounded-md border border-zinc-200 bg-white p-2 text-left text-xs shadow-sm hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!t.completed_at}
                      onChange={() => onToggleComplete(t)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={pending}
                      className="mt-0.5 h-3.5 w-3.5 accent-indigo-600"
                    />
                    <span
                      className={`flex-1 ${
                        t.completed_at ? "text-zinc-400 line-through" : ""
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <PriorityBadge value={t.priority} />
                    <span>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
