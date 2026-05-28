"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  Flag,
  MessageSquare,
  Eye,
  Calendar,
  MoreHorizontal,
  Plus,
  Check,
  Copy,
  Archive,
  Trash2,
  Move,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  updateTask,
  createTask,
  completeTask,
  uncompleteTask,
  archiveTask,
  deleteTask,
  moveTask,
  getLists,
} from "@/lib/work/actions";
import type { Task, Status, CustomFieldDef, TaskPriority, List } from "@/lib/work/types";
import { StatusPill } from "./StatusPill";
import { AssigneePicker } from "./AssigneePicker";

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

/** Hook: close popover on outside click */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
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

  // Gap 1: subtask
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // Gap 1: ... menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));

  // Gap 1: Move to list picker
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [availableLists, setAvailableLists] = useState<List[]>([]);

  // Gap 1: Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Gap 2: Assignee picker
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const assigneePickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(assigneePickerRef, () => setShowAssigneePicker(false));

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

  // Gap 1: Add subtask
  async function handleAddSubtask() {
    const t = subtaskTitle.trim();
    if (!t) return;
    await createTask({
      list_id: task.list_id,
      title: t,
      parent_id: task.id,
      status_id: task.status_id,
    });
    setSubtaskTitle("");
    setShowSubtaskInput(false);
    onChange();
    router.refresh();
    onToggleExpand?.();
  }

  // Gap 1: Complete/uncomplete
  async function handleToggleComplete() {
    setShowMoreMenu(false);
    if (task.completed_at) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
    router.refresh();
    onChange();
  }

  // Gap 1: Duplicate
  async function handleDuplicate() {
    setShowMoreMenu(false);
    await createTask({
      list_id: task.list_id,
      title: task.title + " (copy)",
      status_id: task.status_id,
      priority: task.priority,
      assignee_ids: task.assignee_ids,
      tags: task.tags,
      due_date: task.due_date ?? undefined,
      description: task.description ?? undefined,
    });
    router.refresh();
    onChange();
  }

  // Gap 1: Move to list
  async function handleOpenMoveMenu() {
    setShowMoveMenu(true);
    const lists = await getLists();
    setAvailableLists(lists.filter((l) => l.id !== task.list_id));
  }

  async function handleMoveToList(targetListId: string) {
    setShowMoveMenu(false);
    setShowMoreMenu(false);
    await moveTask(task.id, targetListId);
    router.refresh();
    onChange();
  }

  // Gap 1: Archive
  async function handleArchive() {
    setShowMoreMenu(false);
    await archiveTask(task.id);
    router.refresh();
    onChange();
  }

  // Gap 1: Delete (with confirm)
  async function handleDelete() {
    setConfirmDelete(false);
    setShowMoreMenu(false);
    await deleteTask(task.id);
    router.refresh();
    onChange();
  }

  // Gap 2: Update assignees
  async function handleAssigneeChange(ids: string[]) {
    await updateTask(task.id, { assignee_ids: ids });
    router.refresh();
    onChange();
  }

  const indentPx = depth * 24;

  return (
    <>
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
                className={`flex-1 cursor-pointer truncate text-foreground hover:text-accent transition-colors ${task.completed_at ? "line-through text-muted-foreground" : ""}`}
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

            {/* Gap 1: Add subtask button (show on hover) */}
            <button
              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-muted transition-all"
              title="Add subtask"
              onClick={(e) => { e.stopPropagation(); setShowSubtaskInput(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>

        {/* Gap 2: Assignees — clickable to open picker */}
        <td className="w-20 px-2">
          <div className="relative" ref={assigneePickerRef}>
            <button
              className="flex -space-x-1.5 hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowAssigneePicker((v) => !v); }}
              title="Edit assignees"
            >
              {task.assignee_ids.length === 0 ? (
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-2.5 w-2.5" />
                </span>
              ) : (
                <>
                  {task.assignee_ids.slice(0, 3).map((id) => (
                    <Avatar key={id} id={id} size={22} />
                  ))}
                  {task.assignee_ids.length > 3 && (
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-surface">
                      +{task.assignee_ids.length - 3}
                    </span>
                  )}
                </>
              )}
            </button>
            {showAssigneePicker && (
              <div
                className="absolute top-full left-0 z-40 mt-1 w-64 rounded-card border border-border bg-surface shadow-card-hover"
                onClick={(e) => e.stopPropagation()}
              >
                <AssigneePicker
                  listId={task.list_id}
                  value={task.assignee_ids}
                  onChange={handleAssigneeChange}
                />
              </div>
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

        {/* Meta icons + ... menu */}
        <td className="w-20 px-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageSquare className="h-3 w-3" />
            </span>
            <span className="flex items-center gap-0.5 text-[11px]">
              <Eye className="h-3 w-3" />
            </span>

            {/* Gap 1: ... menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                title="More options"
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu((v) => !v); }}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-full z-40 mt-1 w-44 rounded-card border border-border bg-surface shadow-card-hover overflow-visible"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Complete / Uncomplete */}
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={handleToggleComplete}
                  >
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.completed_at ? "Uncomplete" : "Complete"}
                  </button>

                  {/* Duplicate */}
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={handleDuplicate}
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    Duplicate
                  </button>

                  {/* Move to list */}
                  <div className="relative">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={handleOpenMoveMenu}
                    >
                      <Move className="h-3.5 w-3.5 text-muted-foreground" />
                      Move to list…
                    </button>
                    {showMoveMenu && availableLists.length > 0 && (
                      <div className="absolute left-full top-0 z-50 ml-1 w-48 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden max-h-48 overflow-y-auto">
                        {availableLists.map((l) => (
                          <button
                            key={l.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => handleMoveToList(l.id)}
                          >
                            {l.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-border" />

                  {/* Archive */}
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={handleArchive}
                  >
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    Archive
                  </button>

                  {/* Delete */}
                  {confirmDelete ? (
                    <div className="px-3 py-2">
                      <p className="text-xs text-foreground mb-1.5">Delete this task?</p>
                      <div className="flex gap-1.5">
                        <button
                          className="flex-1 rounded bg-danger px-2 py-1 text-xs text-white hover:opacity-90"
                          onClick={handleDelete}
                        >
                          Delete
                        </button>
                        <button
                          className="flex-1 rounded bg-muted px-2 py-1 text-xs text-foreground hover:bg-muted/80"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Gap 1: Inline subtask input row */}
      {showSubtaskInput && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={9 + customFields.length} style={{ paddingLeft: `${indentPx + 32}px` }}>
            <div className="flex items-center gap-2 py-1.5 pr-4">
              <input
                autoFocus
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Subtask title…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-accent pb-0.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") { setShowSubtaskInput(false); setSubtaskTitle(""); }
                }}
              />
              <button
                className="rounded-md bg-accent px-2.5 py-1 text-xs text-white hover:opacity-90 transition-opacity"
                onClick={handleAddSubtask}
              >
                Add
              </button>
              <button
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => { setShowSubtaskInput(false); setSubtaskTitle(""); }}
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
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
