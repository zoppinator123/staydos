"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task, Status } from "@/lib/work/types";
import { isOverdue } from "@/lib/work/display";
import { useTaskDetail } from "./TaskDetailProvider";

interface CalendarViewProps {
  tasks: Task[];
  statuses: Status[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local YYYY-MM-DD key for a Date. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function CalendarView({ tasks, statuses }: CalendarViewProps) {
  const { openTask } = useTaskDetail();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const statusColor = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of statuses) m[s.id] = s.color;
    return m;
  }, [statuses]);

  // Bucket tasks by their due-date day key.
  const { byDay, unscheduled } = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const none: Task[] = [];
    for (const t of tasks) {
      if (t.parent_id) continue;
      if (!t.due_date) {
        none.push(t);
        continue;
      }
      const key = dayKey(new Date(t.due_date));
      (map[key] ??= []).push(t);
    }
    return { byDay: map, unscheduled: none };
  }, [tasks]);

  // Build the 6-week grid starting on the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const todayKey = dayKey(new Date());
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(cursor);

  return (
    <div className="flex h-full flex-col p-4">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-display text-base font-bold text-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Next month"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => {
            const n = new Date();
            setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
          }}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Today
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-auto">
        {cells.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayTasks = byDay[key] ?? [];
          return (
            <div
              key={key}
              className={`min-h-[88px] border-b border-r border-border p-1 ${
                inMonth ? "" : "bg-muted/30"
              }`}
            >
              <div
                className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  key === todayKey
                    ? "bg-accent text-accent-foreground font-semibold"
                    : inMonth
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTask(t.id)}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-foreground hover:bg-muted transition-colors"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: t.status_id ? statusColor[t.status_id] : "#d4d4d8" }}
                    />
                    <span
                      className={`truncate ${
                        t.due_date && isOverdue(t.due_date) && !t.completed_at
                          ? "text-danger"
                          : ""
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>
                ))}
                {dayTasks.length > 4 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayTasks.length - 4} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled tray */}
      {unscheduled.length > 0 && (
        <details className="mt-3 shrink-0">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Unscheduled ({unscheduled.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTask(t.id)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground hover:border-accent transition-colors"
              >
                {t.title}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
