"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginatedTasks, TaskWithMeta, TaskPriority } from "@/lib/work/types";

// ==================== PRIORITY DISPLAY ====================

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-zinc-100 text-zinc-500",
  none: "bg-zinc-100 text-zinc-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
  none: "None",
};

// ==================== TASK ROW ====================

function TaskRowItem({ task }: { task: TaskWithMeta }) {
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && !task.completed_at;

  return (
    <tr className="group border-b border-border hover:bg-surface-alt/50 transition-colors">
      <td className="px-4 py-2.5 w-8">
        <input
          type="checkbox"
          checked={!!task.completed_at}
          readOnly
          className="rounded accent-accent"
          aria-label={`Toggle ${task.title}`}
        />
      </td>
      <td className="px-2 py-2.5 max-w-xs">
        <span className="text-sm text-foreground line-clamp-1">{task.title}</span>
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap hidden sm:table-cell">
        {task.status_name && (
          <span
            className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium"
            style={{
              background: `${task.status_color ?? "#9ca3af"}20`,
              color: task.status_color ?? "#9ca3af",
            }}
          >
            {task.status_name}
          </span>
        )}
      </td>
      <td className="px-2 py-2.5 hidden md:table-cell">
        <span
          className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}
        >
          {PRIORITY_LABELS[task.priority] ?? task.priority}
        </span>
      </td>
      <td
        className={`px-2 py-2.5 text-xs whitespace-nowrap hidden lg:table-cell ${
          isOverdue ? "text-danger font-medium" : "text-muted-foreground"
        }`}
      >
        {dueDate ? dueDate.toLocaleDateString() : "—"}
      </td>
      <td className="px-2 py-2.5 text-xs text-muted-foreground hidden xl:table-cell truncate max-w-[120px]">
        {task.list_name ?? "—"}
      </td>
    </tr>
  );
}

// ==================== FILTER CHIP ====================

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`}>
        <X size={10} />
      </button>
    </span>
  );
}

// ==================== MAIN COMPONENT ====================

interface AllTasksViewProps {
  initialData: PaginatedTasks;
  initialSearch: string;
  initialStatuses: string[];
  initialPriorities: TaskPriority[];
  page: number;
  pageSize: number;
}

export function AllTasksView({
  initialData,
  initialSearch,
  initialStatuses,
  initialPriorities,
  page,
  pageSize,
}: AllTasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showFilters, setShowFilters] = useState(
    initialStatuses.length > 0 || initialPriorities.length > 0
  );
  const [view, setView] = useState<"list" | "grid">("list");

  const { tasks, total } = initialData;
  const totalPages = Math.ceil(total / pageSize);

  // ---- Helpers ----

  function pushQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    params.delete("page"); // reset pagination on filter change
    startTransition(() => {
      router.push(`/work/tasks?${params.toString()}`);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushQuery({ search: searchInput.trim() || null });
  }

  function handleExportCsv() {
    const params = new URLSearchParams(searchParams.toString());
    window.open(`/api/tasks/export-csv?${params.toString()}`, "_blank");
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    startTransition(() => {
      router.push(`/work/tasks?${params.toString()}`);
    });
  }

  const activeFilters: Array<{ label: string; onRemove: () => void }> = [];

  if (initialSearch) {
    activeFilters.push({
      label: `Search: "${initialSearch}"`,
      onRemove: () => pushQuery({ search: null }),
    });
  }
  for (const s of initialStatuses) {
    activeFilters.push({
      label: `Status: ${s}`,
      onRemove: () => {
        const next = initialStatuses.filter((x) => x !== s);
        pushQuery({ statuses: next.join(",") || null });
      },
    });
  }
  for (const p of initialPriorities) {
    activeFilters.push({
      label: `Priority: ${PRIORITY_LABELS[p] ?? p}`,
      onRemove: () => {
        const next = initialPriorities.filter((x) => x !== p);
        pushQuery({ priorities: next.join(",") || null });
      },
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <header className="border-b border-border px-6 py-4 bg-surface shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">All Tasks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total.toLocaleString()} task{total !== 1 ? "s" : ""} across all spaces
            </p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="hidden sm:flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-accent text-accent-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "grid" ? "bg-accent text-accent-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                Grid
              </button>
            </div>

            {/* CSV export */}
            <button
              onClick={handleExportCsv}
              aria-label="Export CSV"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="mt-3 flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks…"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring transition-colors"
            />
          </form>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showFilters || activeFilters.length > 0
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter size={13} />
            Filters
            {activeFilters.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3 flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <div className="flex flex-wrap gap-1">
                {(["urgent", "high", "normal", "low"] as TaskPriority[]).map((p) => {
                  const active = initialPriorities.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        const next = active
                          ? initialPriorities.filter((x) => x !== p)
                          : [...initialPriorities, p];
                        pushQuery({ priorities: next.join(",") || null });
                      }}
                      className={`rounded-pill px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-alt text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Include
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: "include_completed", label: "Completed" },
                  { key: "include_archived", label: "Archived" },
                ].map(({ key, label }) => {
                  const active = searchParams.get(key) === "true";
                  return (
                    <button
                      key={key}
                      onClick={() => pushQuery({ [key]: active ? null : "true" })}
                      className={`rounded-pill px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-alt text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeFilters.map((chip, i) => (
              <FilterChip key={i} label={chip.label} onRemove={chip.onRemove} />
            ))}
            <button
              onClick={() => router.push("/work/tasks")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          </div>
        )}
      </header>

      {/* Table */}
      <div className={`flex-1 overflow-auto ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
            <Search size={32} className="text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">
              {initialSearch
                ? `No tasks found matching "${initialSearch}"`
                : "No tasks match your current filters."}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-2.5 w-8" />
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Priority
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Due
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                  List
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: TaskWithMeta) => (
                <TaskRowItem key={task.id} task={task} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 border-t border-border bg-surface px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} &mdash; {total.toLocaleString()} tasks
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isPending}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  disabled={isPending}
                  aria-current={p === page ? "page" : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-accent text-accent-foreground"
                      : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isPending}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
