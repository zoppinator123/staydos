"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  Flag,
  MessageSquare,
  Eye,
  Calendar,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateTask } from "@/lib/work/actions";
import type { Task, Status, CustomFieldDef, TaskPriority } from "@/lib/work/types";
import { StatusPill } from "./StatusPill";

interface TaskRowProps {
  task: Task;
  depth: number;
  statuses: Status[];
  customFields: CustomFieldDef[];
  selected: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onOpen: (id: string) => void;
  onChange: () => void;
  isDragging?: boolean;
  childCount?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#3b82f6",
  low: "#a1a1aa",
  none: "#d4d4d8",
};

const PRIORITY_OPTIONS: TaskPriority[] = ["urgent", "high", "normal", "low", "none"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(iso)
  );
}

function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date(new Date().toDateString());
}

function Avatar({ id, size = 22 }: { id: string; size?: number }) {
  const letter = id[0]?.toUpperCase() ?? "?";
  const hue = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${hue},55%,50%)` }}
    >
      {letter}
    </span>
  );
}

export function TaskRow({
  task,
  depth,
  statuses,
  customFields,
  selected,
  onSelect,
  onOpen,
  onChange,
  isDragging = false,
  childCount = 0,
  expanded = false,
  onToggleExpand,
}: TaskRowProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLSpanElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: `task:${task.id}`,
    data: { type: "task", task, depth },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging || isDragging ? 0.4 : 1,
  };

  const currentStatus = statuses.find((s) => s.id === task.status_id);

  async function saveTitle() {
    if (titleVal.trim() === task.title) {
      setEditingTitle(false);
      return;
    }
    await updateTask(task.id, { title: titleVal.trim() || task.title });
    router.refresh();
    onChange();
    setEditingTitle(false);
  }

  async function setPriority(p: TaskPriority) {
    setShowPriorityMenu(false);
    await updateTask(task.id, { priority: p });
    router.refresh();
    onChange();
  }

  async function setStatus(statusId: string) {
    setShowStatusMenu(false);
    await updateTask(task.id, { status_id: statusId });
    router.refresh();
    onChange();
  }

  async function setDueDate(val: string) {
    setShowDatePicker(false);
    await updateTask(task.id, { due_date: val || null });
    router.refresh();
    onChange();
  }

  const indentPx = depth * 24;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-border text-sm transition-colors hover:bg-muted/40 ${
        selected ? "bg-accent/5" : ""
      }`}
    >
      {/* Drag handle */}
      <td className="w-6 px-1" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
      </td>

      {/* Checkbox */}
      <td className="w-8 px-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(task.id, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded border-border accent-accent"
        />
      </td>

      {/* Title cell — sticky */}
      <td
        className="sticky left-0 z-10 min-w-[280px] bg-surface"
        style={{ paddingLeft: `${indentPx + 8}px` }}
      >
        <div className="flex items-center gap-1.5 py-2 pr-2">
          {/* Expand chevron */}
          <button
            className={`shrink-0 transition-opacity ${childCount > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitleVal(task.title);
                  setEditingTitle(false);
                }
              }}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none border-b border-accent"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              ref={titleRef}
              className="flex-1 cursor-pointer truncate text-foreground hover:text-accent transition-colors"
              onClick={(e) => {
                if (e.detail === 2) {
                  setEditingTitle(true);
                } else {
                  onOpen(task.id);
                }
              }}
            >
              {task.title}
            </span>
          )}

          {/* Subtask badge */}
          {childCount > 0 && (
            <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">
              {childCount}
            </span>
          )}
        </div>
      </td>

      {/* Assignees */}
      <td className="w-20 px-2">
        <div className="flex -space-x-1.5">
          {task.assignee_ids.slice(0, 3).map((id) => (
            <Avatar key={id} id={id} size={22} />
          ))}
          {task.assignee_ids.length > 3 && (
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-surface">
              +{task.assignee_ids.length - 3}
            </span>
          )}
        </div>
      </td>

      {/* Due date */}
      <td className="w-28 px-2">
        <div className="relative">
          <button
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-muted ${
              task.due_date && isOverdue(task.due_date)
                ? "text-danger font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
          >
            <Calendar className="h-3 w-3" />
            {task.due_date ? formatDate(task.due_date) : <span className="opacity-40">—</span>}
          </button>
          {showDatePicker && (
            <div
              className="absolute top-full left-0 z-30 mt-1 rounded-card border border-border bg-surface shadow-card-hover p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="date"
                defaultValue={task.due_date?.slice(0, 10) ?? ""}
                className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                onChange={(e) => setDueDate(e.target.value)}
              />
              {task.due_date && (
                <button
                  className="mt-1 block text-xs text-danger hover:underline"
                  onClick={() => setDueDate("")}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Priority */}
      <td className="w-12 px-2">
        <div className="relative">
          <button
            className="rounded p-1 hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowPriorityMenu(!showPriorityMenu); }}
          >
            <Flag className="h-3.5 w-3.5" style={{ color: PRIORITY_COLOR[task.priority] }} />
          </button>
          {showPriorityMenu && (
            <div
              className="absolute top-full left-0 z-30 mt-1 w-32 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  onClick={() => setPriority(p)}
                >
                  <Flag className="h-3 w-3 shrink-0" style={{ color: PRIORITY_COLOR[p] }} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="w-32 px-2">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
          >
            {currentStatus ? (
              <StatusPill status={currentStatus} size="sm" />
            ) : (
              <span className="rounded-pill px-2 py-1 text-[11px] text-muted-foreground bg-muted">
                No status
              </span>
            )}
          </button>
          {showStatusMenu && (
            <div
              className="absolute top-full left-0 z-30 mt-1 w-48 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {statuses.map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                  onClick={() => setStatus(s.id)}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Tags */}
      <td className="w-32 px-2">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      </td>

      {/* Custom fields */}
      {customFields.map((cf) => (
        <td key={cf.id} className="w-28 px-2">
          <CustomFieldCell task={task} field={cf} onChange={onChange} router={router} />
        </td>
      ))}

      {/* Meta icons */}
      <td className="w-16 px-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {/* Comment count placeholder */}
          <span className="flex items-center gap-0.5 text-[11px]">
            <MessageSquare className="h-3 w-3" />
          </span>
          <span className="flex items-center gap-0.5 text-[11px]">
            <Eye className="h-3 w-3" />
          </span>
        </div>
      </td>
    </tr>
  );
}

// ---- Inline custom field cell ----
function CustomFieldCell({
  task,
  field,
  onChange,
  router,
}: {
  task: Task;
  field: CustomFieldDef;
  onChange: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const val = task.custom_fields[field.id];

  async function save(newVal: unknown) {
    const { setTaskCustomField } = await import("@/lib/work/actions");
    await setTaskCustomField(task.id, field.id, newVal);
    router.refresh();
    onChange();
  }

  switch (field.field_type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={Boolean(val)}
          onChange={(e) => save(e.target.checked)}
          className="h-3.5 w-3.5 accent-accent"
          onClick={(e) => e.stopPropagation()}
        />
      );
    case "number":
    case "money":
    case "percent":
    case "rating":
    case "progress":
      return (
        <input
          type="number"
          defaultValue={typeof val === "number" ? val : ""}
          className="w-full bg-transparent text-xs text-foreground focus:outline-none"
          onBlur={(e) => save(parseFloat(e.target.value))}
          onClick={(e) => e.stopPropagation()}
        />
      );
    case "date":
      return (
        <input
          type="date"
          defaultValue={typeof val === "string" ? val.slice(0, 10) : ""}
          className="w-full bg-transparent text-xs text-foreground focus:outline-none"
          onChange={(e) => save(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      );
    case "dropdown":
    case "label": {
      const opts = Array.isArray((field.config as Record<string, unknown>)?.options)
        ? ((field.config as Record<string, unknown>).options as string[])
        : [];
      return (
        <select
          value={typeof val === "string" ? val : ""}
          onChange={(e) => { save(e.target.value); }}
          className="w-full bg-transparent text-xs text-foreground focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    default:
      return (
        <input
          type="text"
          defaultValue={typeof val === "string" ? val : ""}
          className="w-full bg-transparent text-xs text-foreground focus:outline-none"
          onBlur={(e) => save(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      );
  }
}
