"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  completeTask,
  deleteTask,
  reorderTasks,
  uncompleteTask,
  updateTask,
} from "@/lib/work/actions";
import type { Status, Task, TaskPriority, TaskWithMeta } from "@/lib/work/types";
import { PriorityBadge, StatusBadge, Tag } from "@/components/ui/Badge";
import { TaskEditModal } from "./TaskEditModal";
import {
  TaskFilterBar,
  DEFAULT_FILTER,
  type TaskFilterState,
} from "./TaskFilterBar";
import { AssigneePicker } from "./AssigneePicker";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowTask = Task | TaskWithMeta;

type InlineUpdateFn = (id: string, patch: Partial<RowTask>) => void;

interface Props {
  listId: string;
  tasks: RowTask[];
  statuses?: Status[];
  showListColumn?: boolean;
  showFilters?: boolean;
  showKanbanToggle?: boolean;
  emptyMessage?: string;
  /** Ref forwarded so parent (via NewTaskRow) can expose focus handle */
  newTaskInputRef?: React.RefObject<HTMLInputElement | null>;
  filterInputRef?: React.RefObject<HTMLInputElement | null>;
}

const PRIORITIES: TaskPriority[] = ["urgent", "high", "normal", "low", "none"];



// ─── Drag handle icon ─────────────────────────────────────────────────────────

function DragHandle({ listeners, attributes }: { listeners?: object; attributes?: object }) {
  return (
    <span
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(listeners as any)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(attributes as any)}
      className="inline-flex cursor-grab select-none items-center text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="2.5" cy="2.5" r="1.2" />
        <circle cx="7.5" cy="2.5" r="1.2" />
        <circle cx="2.5" cy="7" r="1.2" />
        <circle cx="7.5" cy="7" r="1.2" />
        <circle cx="2.5" cy="11.5" r="1.2" />
        <circle cx="7.5" cy="11.5" r="1.2" />
      </svg>
    </span>
  );
}

// ─── Popover helper ───────────────────────────────────────────────────────────

function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 min-w-[140px] rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

// ─── Inline quick-action cells ────────────────────────────────────────────────

function InlinePriority({ task, onUpdate }: { task: RowTask; onUpdate: InlineUpdateFn }) {
  const [open, setOpen] = useState(false);
  const { addToast } = useToast();
  const [, startTransition] = useTransition();

  function pick(p: TaskPriority) {
    setOpen(false);
    const prev = task.priority;
    onUpdate(task.id, { priority: p });
    startTransition(async () => {
      try {
        await updateTask(task.id, { priority: p });
      } catch (e) {
        onUpdate(task.id, { priority: prev });
        addToast(e instanceof Error ? e.message : "Failed to update priority", "error");
      }
    });
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((x) => !x); }}
        className="inline-flex items-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Change priority"
      >
        <PriorityBadge value={task.priority} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => pick(p)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${task.priority === p ? "font-semibold text-indigo-600" : ""}`}
          >
            <PriorityBadge value={p} />
          </button>
        ))}
      </Popover>
    </div>
  );
}

function InlineStatus({ task, statuses, onUpdate }: { task: RowTask; statuses: Status[]; onUpdate: InlineUpdateFn }) {
  const [open, setOpen] = useState(false);
  const { addToast } = useToast();
  const [, startTransition] = useTransition();
  const st = useMemo(() => {
    const m = new Map<string, Status>();
    for (const s of statuses) m.set(s.id, s);
    return m;
  }, [statuses]);

  function pick(statusId: string | null) {
    setOpen(false);
    const prev = task.status_id;
    onUpdate(task.id, { status_id: statusId });
    startTransition(async () => {
      try {
        await updateTask(task.id, { status_id: statusId });
      } catch (e) {
        onUpdate(task.id, { status_id: prev });
        addToast(e instanceof Error ? e.message : "Failed to update status", "error");
      }
    });
  }

  const cur = task.status_id ? st.get(task.status_id) : null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((x) => !x); }}
        className="inline-flex items-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Change status"
      >
        <StatusBadge name={cur?.name ?? null} color={cur?.color ?? null} category={cur?.category ?? null} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        <button
          onClick={() => pick(null)}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          No status
        </button>
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => pick(s.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${task.status_id === s.id ? "font-semibold" : ""}`}
            style={{ color: s.color }}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}
      </Popover>
    </div>
  );
}

function InlineDueDate({ task, onUpdate }: { task: RowTask; onUpdate: InlineUpdateFn }) {
  const { addToast } = useToast();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  // Format ISO → YYYY-MM-DD for <input type="date">
  const dateVal = task.due_date ? task.due_date.slice(0, 10) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const val = e.target.value; // YYYY-MM-DD or ""
    const newDate = val ? `${val}T00:00:00.000Z` : null;
    const prev = task.due_date;
    onUpdate(task.id, { due_date: newDate });
    setEditing(false);
    startTransition(async () => {
      try {
        await updateTask(task.id, { due_date: newDate });
      } catch (err) {
        onUpdate(task.id, { due_date: prev });
        addToast(err instanceof Error ? err.message : "Failed to update due date", "error");
      }
    });
  }

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={dateVal}
        autoFocus
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
      />
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="w-full text-left text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      title="Set due date"
    >
      {task.due_date ? new Date(task.due_date).toLocaleDateString() : <span className="text-zinc-400">—</span>}
    </button>
  );
}

function InlineAssignees({ task, onUpdate }: { task: RowTask; onUpdate: InlineUpdateFn }) {
  const [open, setOpen] = useState(false);
  const { addToast } = useToast();
  const [, startTransition] = useTransition();
  // localIds is a draft copy used only while the popover is open
  const [localIds, setLocalIds] = useState<string[]>(task.assignee_ids ?? []);
  const popRef = useRef<HTMLDivElement>(null);
  // Track last known assignees to sync when popover reopens
  const latestAssignees = useRef<string[]>(task.assignee_ids ?? []);
  latestAssignees.current = task.assignee_ids ?? [];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        save();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localIds]);

  function save() {
    setOpen(false);
    const prev = task.assignee_ids ?? [];
    onUpdate(task.id, { assignee_ids: localIds });
    startTransition(async () => {
      try {
        await updateTask(task.id, { assignee_ids: localIds });
      } catch (e) {
        onUpdate(task.id, { assignee_ids: prev });
        addToast(e instanceof Error ? e.message : "Failed to update assignees", "error");
      }
    });
  }

  const count = localIds.length;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setLocalIds(latestAssignees.current); setOpen((x) => !x); }}
        className="w-full text-left text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        title="Set assignees"
      >
        {count > 0 ? `${count} assigned` : <span className="text-zinc-400">—</span>}
      </button>
      {open ? (
        <div
          ref={popRef}
          className="absolute left-0 z-50 mt-1 w-56 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <AssigneePicker
            listId={task.list_id}
            value={localIds}
            onChange={setLocalIds}
          />
          <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
            <button
              onClick={save}
              className="w-full rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Completion circle button ─────────────────────────────────────────────────

function CompletionCircle({
  completed,
  pending,
  onClick,
}: {
  completed: boolean;
  pending: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={completed ? "Mark incomplete" : "Mark complete"}
      className={[
        "h-4 w-4 shrink-0 rounded-full border-2 transition-all",
        completed
          ? "border-indigo-600 bg-indigo-600"
          : "border-zinc-300 bg-transparent hover:border-indigo-400 dark:border-zinc-600",
      ].join(" ")}
      aria-label={completed ? "Mark incomplete" : "Mark complete"}
    >
      {completed ? (
        <svg
          className="h-full w-full text-white"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6l2.5 2.5 4.5-5" />
        </svg>
      ) : null}
    </button>
  );
}

// ─── Sortable table row ───────────────────────────────────────────────────────

interface SortableRowProps {
  task: RowTask;
  statuses: Status[];
  selected: boolean;
  focused: boolean;
  pending: boolean;
  showListColumn: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (t: RowTask) => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RowTask>) => void;
  isDragging?: boolean;
}

function SortableRow({
  task,
  statuses,
  selected,
  focused,
  pending,
  showListColumn,
  onToggleSelect,
  onToggleComplete,
  onOpen,
  onUpdate,
  isDragging = false,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const completed = !!task.completed_at;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-task-id={task.id}
      onClick={() => onOpen(task.id)}
      className={[
        "group cursor-pointer border-b border-zinc-100 transition-colors",
        "dark:border-zinc-900",
        focused ? "ring-2 ring-inset ring-indigo-400" : "",
        selected ? "bg-indigo-50/60 dark:bg-indigo-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
        isDragging ? "shadow-lg scale-[1.01]" : "",
      ].join(" ")}
    >
      {/* Col 0: selection checkbox + drag handle */}
      <td
        className="w-10 px-2 py-2 align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <DragHandle listeners={listeners} attributes={attributes} />
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(task.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 cursor-pointer accent-indigo-600"
            aria-label="Select task"
          />
        </div>
      </td>

      {/* Col 1: title with completion circle */}
      <td className="px-2 py-2 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <CompletionCircle
            completed={completed}
            pending={pending}
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
          />
          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              completed ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {task.title}
          </span>
          {task.tags?.length ? (
            <span className="inline-flex gap-1 shrink-0">
              {task.tags.slice(0, 2).map((tag) => (
                <Tag key={tag} value={tag} />
              ))}
            </span>
          ) : null}
          {task.recurrence_rule ? (
            <span
              className="shrink-0 inline-block rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
              title={`Recurring (${task.recurrence_rule.frequency})`}
            >
              ↻
            </span>
          ) : null}
        </div>
      </td>

      {/* Col 2: status (inline popover) */}
      <td className="w-32 px-2 py-2 align-middle">
        <InlineStatus task={task} statuses={statuses} onUpdate={onUpdate} />
      </td>

      {/* Col 3: assignees */}
      <td className="w-32 px-2 py-2 align-middle">
        <InlineAssignees task={task} onUpdate={onUpdate} />
      </td>

      {/* Col 4: due date */}
      <td className="w-28 px-2 py-2 align-middle">
        <InlineDueDate task={task} onUpdate={onUpdate} />
      </td>

      {/* Col 5: priority (inline popover) */}
      <td className="w-28 px-2 py-2 align-middle">
        <InlinePriority task={task} onUpdate={onUpdate} />
      </td>

      {/* Col 6: list (if shown) */}
      {showListColumn ? (
        <td className="w-32 truncate px-2 py-2 align-middle text-xs text-zinc-500">
          {"list_name" in task ? task.list_name : ""}
        </td>
      ) : null}
    </tr>
  );
}

// ─── Bulk toolbar ─────────────────────────────────────────────────────────────

interface BulkToolbarProps {
  count: number;
  statuses: Status[];
  onBulkStatus: (statusId: string | null) => void;
  onBulkPriority: (p: TaskPriority) => void;
  onBulkDueDate: (d: string | null) => void;
  onBulkComplete: () => void;
  onBulkDelete: () => void;
  onClear: () => void;
}

function BulkToolbar({
  count,
  statuses,
  onBulkStatus,
  onBulkPriority,
  onBulkDueDate,
  onBulkComplete,
  onBulkDelete,
  onClear,
}: BulkToolbarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/30">
      <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
        {count} selected
      </span>
      <div className="ml-2 flex flex-wrap items-center gap-1.5">
        {/* Status */}
        <div className="relative">
          <button
            onClick={() => { setStatusOpen((x) => !x); setPriorityOpen(false); setDueDateOpen(false); }}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Status ▾
          </button>
          <Popover open={statusOpen} onClose={() => setStatusOpen(false)}>
            <button
              onClick={() => { onBulkStatus(null); setStatusOpen(false); }}
              className="flex w-full rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              No status
            </button>
            {statuses.map((s) => (
              <button
                key={s.id}
                onClick={() => { onBulkStatus(s.id); setStatusOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                style={{ color: s.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </Popover>
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => { setPriorityOpen((x) => !x); setStatusOpen(false); setDueDateOpen(false); }}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Priority ▾
          </button>
          <Popover open={priorityOpen} onClose={() => setPriorityOpen(false)}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => { onBulkPriority(p); setPriorityOpen(false); }}
                className="flex w-full items-center rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <PriorityBadge value={p} />
              </button>
            ))}
          </Popover>
        </div>

        {/* Due date */}
        <div className="relative">
          <button
            onClick={() => { setDueDateOpen((x) => !x); setStatusOpen(false); setPriorityOpen(false); }}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Due date
          </button>
          <Popover open={dueDateOpen} onClose={() => setDueDateOpen(false)}>
            <div className="p-2">
              <input
                type="date"
                className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                onChange={(e) => {
                  const val = e.target.value;
                  onBulkDueDate(val ? `${val}T00:00:00.000Z` : null);
                  setDueDateOpen(false);
                }}
              />
            </div>
          </Popover>
        </div>

        {/* Complete */}
        <button
          onClick={onBulkComplete}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          Complete
        </button>

        {/* Delete */}
        {deleteConfirm ? (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            Confirm?{" "}
            <button
              onClick={() => { onBulkDelete(); setDeleteConfirm(false); }}
              className="font-semibold underline"
            >
              Yes
            </button>{" "}
            <button onClick={() => setDeleteConfirm(false)} className="underline">
              No
            </button>
          </span>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
          >
            Delete
          </button>
        )}

        {/* Clear */}
        <button
          onClick={onClear}
          className="ml-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── Improved empty state ─────────────────────────────────────────────────────

function EmptyState({ message, hasFilter, onClear }: { message: string; hasFilter: boolean; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 px-8 py-16 text-center dark:border-zinc-700">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <svg
          className="h-6 w-6 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{message}</p>
      {hasFilter ? (
        <>
          <p className="mt-1 text-xs text-zinc-400">Try changing your filters.</p>
          <button
            onClick={onClear}
            className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Clear filters
          </button>
        </>
      ) : (
        <p className="mt-1 text-xs text-zinc-400">Add your first task using the input below.</p>
      )}
    </div>
  );
}

// ─── Main TaskTable ───────────────────────────────────────────────────────────

export function TaskTable({
  listId,
  tasks: initial,
  statuses = [],
  showListColumn = false,
  showFilters = true,
  showKanbanToggle = false,
  emptyMessage = "No tasks yet.",
  newTaskInputRef,
  filterInputRef,
}: Props) {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<RowTask[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilterState>(DEFAULT_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!filter.showCompleted && t.completed_at) return false;
      if (filter.status && t.status_id !== filter.status) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (q) {
        const hay =
          (t.title ?? "") + " " + (t.description ?? "") + " " + (t.tags ?? []).join(" ");
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filter]);

  // ── Optimistic update helper ───────────────────────────────────────────────

  function applyUpdate(id: string, patch: Partial<RowTask>) {
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // ── Toggle complete ────────────────────────────────────────────────────────

  const [completePending, startCompleteTransition] = useTransition();

  function toggleComplete(t: RowTask) {
    startCompleteTransition(async () => {
      try {
        if (t.completed_at) {
          const updated = await uncompleteTask(t.id);
          setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, ...updated } : x)));
        } else {
          const updated = await completeTask(t.id);
          setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, ...updated } : x)));
        }
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Failed to update task", "error");
      }
    });
  }

  // ── Select all ────────────────────────────────────────────────────────────

  const allFilteredIds = filtered.map((t) => t.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allFilteredIds));
    }
  }

  function toggleSelect(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  function bulkUpdate(patch: Parameters<typeof updateTask>[1]) {
    const ids = [...selected];
    // Optimistic
    setTasks((cur) =>
      cur.map((t) => (selected.has(t.id) ? { ...t, ...patch } : t))
    );
    startTransition(async () => {
      try {
        await Promise.all(ids.map((id) => updateTask(id, patch)));
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Bulk update failed", "error");
        // Revert not feasible here for simplicity — user can undo via individual edits
      }
    });
  }

  function handleBulkStatus(statusId: string | null) {
    bulkUpdate({ status_id: statusId });
  }

  function handleBulkPriority(p: TaskPriority) {
    bulkUpdate({ priority: p });
  }

  function handleBulkDueDate(d: string | null) {
    bulkUpdate({ due_date: d });
  }

  function handleBulkComplete() {
    const ids = [...selected];
    setTasks((cur) =>
      cur.map((t) => (selected.has(t.id) ? { ...t, completed_at: new Date().toISOString() } : t))
    );
    setSelected(new Set());
    startTransition(async () => {
      try {
        await Promise.all(ids.map((id) => completeTask(id)));
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Bulk complete failed", "error");
      }
    });
  }

  function handleBulkDelete() {
    const ids = [...selected];
    setTasks((cur) => cur.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
    startTransition(async () => {
      try {
        await Promise.all(ids.map((id) => deleteTask(id)));
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Bulk delete failed", "error");
      }
    });
  }

  // ── DnD sensors ──────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(tasks, oldIndex, newIndex);
    setTasks(reordered);

    if (listId) {
      const orderedIds = reordered.map((t) => t.id);
      startTransition(async () => {
        try {
          await reorderTasks(listId, orderedIds);
        } catch (e) {
          // Revert
          setTasks(tasks);
          addToast(e instanceof Error ? e.message : "Reorder failed", "error");
        }
      });
    }
  }

  const activeDragTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null;

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip if modal is open
      if (editing) return;
      // Skip when target is editable
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.tagName === "SELECT"
      )
        return;

      switch (e.key) {
        case "c":
          e.preventDefault();
          newTaskInputRef?.current?.focus();
          break;
        case "/":
          e.preventDefault();
          filterInputRef?.current?.focus();
          break;
        case "j":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "k":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          if (focusedIndex >= 0 && filtered[focusedIndex]) {
            e.preventDefault();
            setEditing(filtered[focusedIndex].id);
          }
          break;
        case "x":
          if (focusedIndex >= 0 && filtered[focusedIndex]) {
            e.preventDefault();
            toggleSelect(filtered[focusedIndex].id);
          }
          break;
        case "Escape":
          if (selected.size > 0) {
            e.preventDefault();
            setSelected(new Set());
          }
          break;
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editing, filtered, focusedIndex, selected, newTaskInputRef, filterInputRef]);

  const isKanban = showKanbanToggle && filter.view === "kanban";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {showFilters ? (
        <TaskFilterBar
          value={filter}
          onChange={setFilter}
          statuses={statuses}
          showViewToggle={showKanbanToggle}
          filterInputRef={filterInputRef}
        />
      ) : null}

      {selected.size > 0 && !isKanban ? (
        <BulkToolbar
          count={selected.size}
          statuses={statuses}
          onBulkStatus={handleBulkStatus}
          onBulkPriority={handleBulkPriority}
          onBulkDueDate={handleBulkDueDate}
          onBulkComplete={handleBulkComplete}
          onBulkDelete={handleBulkDelete}
          onClear={() => setSelected(new Set())}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          message={tasks.length === 0 ? emptyMessage : "No tasks match your filters."}
          hasFilter={tasks.length > 0}
          onClear={() => setFilter(DEFAULT_FILTER)}
        />
      ) : isKanban ? (
        <KanbanBoard
          tasks={filtered}
          statuses={statuses}
          onOpen={(id) => setEditing(id)}
          onToggleComplete={toggleComplete}
          pending={completePending}
          onUpdate={applyUpdate}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
                {showListColumn ? <col className="w-32" /> : null}
              </colgroup>
              <thead className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                      title="Select all"
                    />
                  </th>
                  <th className="px-2 py-2">Task</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Assignees</th>
                  <th className="px-2 py-2">Due</th>
                  <th className="px-2 py-2">Priority</th>
                  {showListColumn ? <th className="px-2 py-2">List</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <SortableRow
                    key={t.id}
                    task={t}
                    statuses={statuses}
                    selected={selected.has(t.id)}
                    focused={focusedIndex === idx}
                    pending={completePending}
                    showListColumn={showListColumn}
                    onToggleSelect={toggleSelect}
                    onToggleComplete={toggleComplete}
                    onOpen={(id) => setEditing(id)}
                    onUpdate={applyUpdate}
                    isDragging={activeDragId === t.id}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>

          <DragOverlay>
            {activeDragTask ? (
              <div className="rounded-md border border-indigo-300 bg-white px-3 py-2 shadow-xl dark:border-indigo-700 dark:bg-zinc-900">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {activeDragTask.title}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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

// ─── Kanban board with DnD ────────────────────────────────────────────────────

interface KanbanProps {
  tasks: RowTask[];
  statuses: Status[];
  onOpen: (id: string) => void;
  onToggleComplete: (t: RowTask) => void;
  pending: boolean;
  onUpdate: (id: string, patch: Partial<RowTask>) => void;
}

function KanbanBoard({
  tasks,
  statuses,
  onOpen,
  onToggleComplete,
  pending,
  onUpdate,
}: KanbanProps) {
  const { addToast } = useToast();
  // Optimistic status overrides: taskId -> status_id | null
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string | null>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Merge overrides into tasks without setState-in-effect
  const effectiveTasks = useMemo(
    () => tasks.map((t) => (t.id in statusOverrides ? { ...t, status_id: statusOverrides[t.id] } : t)),
    [tasks, statusOverrides]
  );

  const columns = useMemo(() => {
    const cols: Array<{ id: string | null; name: string; color: string | null; tasks: RowTask[] }> =
      statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, tasks: [] }));
    const noStatus: { id: null; name: string; color: null; tasks: RowTask[] } = {
      id: null,
      name: "No status",
      color: null,
      tasks: [],
    };
    for (const t of effectiveTasks) {
      const col = cols.find((c) => c.id === t.status_id);
      if (col) col.tasks.push(t);
      else noStatus.tasks.push(t);
    }
    return noStatus.tasks.length ? [noStatus, ...cols] : cols;
  }, [effectiveTasks, statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    // Determine target column — over.id might be a column id or a task id
    const overIsColumn = statuses.some((s) => s.id === overId) || overId === "none";
    const targetStatusId = overIsColumn
      ? (overId === "none" ? null : overId)
      : (effectiveTasks.find((t) => t.id === overId)?.status_id ?? null);

    const draggedTask = effectiveTasks.find((t) => t.id === draggedId);
    if (!draggedTask) return;

    const sameColumn = draggedTask.status_id === targetStatusId;

    if (!sameColumn) {
      const prevStatusId = draggedTask.status_id;
      // Optimistic override
      setStatusOverrides((cur) => ({ ...cur, [draggedId]: targetStatusId }));
      onUpdate(draggedId, { status_id: targetStatusId });
      startTransition(async () => {
        try {
          await updateTask(draggedId, { status_id: targetStatusId });
          // On success, remove override — parent tasks will update via onUpdate callback
          setStatusOverrides((cur) => {
            const next = { ...cur };
            delete next[draggedId];
            return next;
          });
        } catch (e) {
          // Revert optimistic override
          setStatusOverrides((cur) => ({ ...cur, [draggedId]: prevStatusId }));
          addToast(e instanceof Error ? e.message : "Failed to move task", "error");
        }
      });
    }
    // Reorder within column — no persistence needed
  }

  const activeDragTask = activeDragId ? effectiveTasks.find((t) => t.id === activeDragId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colId = col.id ?? "none";
          return (
            <KanbanColumn
              key={colId}
              name={col.name}
              color={col.color}
              tasks={col.tasks}
              onOpen={onOpen}
              onToggleComplete={onToggleComplete}
              pending={pending}
              activeDragId={activeDragId}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeDragTask ? (
          <div className="w-60 rounded-md border border-indigo-300 bg-white p-2 shadow-xl dark:border-indigo-700 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {activeDragTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  name,
  color,
  tasks,
  onOpen,
  onToggleComplete,
  pending,
  activeDragId,
}: {
  name: string;
  color: string | null;
  tasks: RowTask[];
  onOpen: (id: string) => void;
  onToggleComplete: (t: RowTask) => void;
  pending: boolean;
  activeDragId: string | null;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-md border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-800">
        <span
          className="inline-flex items-center gap-2"
          style={color ? { color } : undefined}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: color ?? "#a1a1aa" }} />
          {name}
        </span>
        <span className="text-[10px] text-zinc-500">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 min-h-[60px]">
          {tasks.length === 0 ? (
            <p className="px-2 py-4 text-center text-[11px] text-zinc-400">No tasks</p>
          ) : (
            tasks.map((t) => (
              <KanbanCard
                key={t.id}
                task={t}
                onOpen={onOpen}
                onToggleComplete={onToggleComplete}
                pending={pending}
                isDragging={activeDragId === t.id}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanCard({
  task,
  onOpen,
  onToggleComplete,
  pending,
  isDragging,
}: {
  task: RowTask;
  onOpen: (id: string) => void;
  onToggleComplete: (t: RowTask) => void;
  pending: boolean;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group rounded-md border border-zinc-200 bg-white p-2 text-left text-xs shadow-sm",
        "dark:border-zinc-800 dark:bg-zinc-900",
        "hover:border-indigo-400 transition-colors",
        isDragging ? "shadow-lg scale-[1.02]" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <span
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 text-zinc-400 active:cursor-grabbing"
        >
          <svg width="8" height="12" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2.5" cy="2.5" r="1.2" />
            <circle cx="7.5" cy="2.5" r="1.2" />
            <circle cx="2.5" cy="7" r="1.2" />
            <circle cx="7.5" cy="7" r="1.2" />
            <circle cx="2.5" cy="11.5" r="1.2" />
            <circle cx="7.5" cy="11.5" r="1.2" />
          </svg>
        </span>
        <CompletionCircle
          completed={!!task.completed_at}
          pending={pending}
          onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
        />
        <button
          onClick={() => onOpen(task.id)}
          className={`flex-1 text-left ${task.completed_at ? "text-zinc-400 line-through" : ""}`}
        >
          {task.title}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <PriorityBadge value={task.priority} />
        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : ""}</span>
      </div>
    </div>
  );
}
