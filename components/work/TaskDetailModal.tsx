"use client";

import {
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  X,
  MoreHorizontal,
  Flag,
  Play,
  Square,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  MessageSquare,
  Activity,
  Clock,
  ListChecks,
  FileText,
} from "lucide-react";
import {
  getTask,
  getComments,
  getActivity,
  getChecklists,
  getTimeEntries,
  getWatchers,
  getCustomFields,
  updateTask,
  addComment,
  createChecklist,
  renameChecklist,
  deleteChecklist,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  startTimer,
  stopTimer,
  getOpenTimer,
  createManualTimeEntry,
  deleteTimeEntry,
  addWatcher,
  removeWatcher,
  archiveTask,
  deleteTask,
  getStatuses,
} from "@/lib/work/actions";
import type {
  Task,
  Status,
  CustomFieldDef,
  CommentWithAuthor,
  TaskActivityEntry,
  TimeEntryWithUser,
  WatcherWithUser,
  TaskPriority,
  TimeEntry,
  RecurrenceRule,
  RecurrenceFrequency,
} from "@/lib/work/types";
import { Modal } from "@/components/ui/Modal";
import { MentionInput } from "./MentionInput";
import { StatusPill } from "./StatusPill";

// ---- Types for checklists (inferred from action return) ----
interface ChecklistWithItems {
  id: string;
  task_id: string;
  name: string;
  order: number;
  created_at: string;
  items: {
    id: string;
    checklist_id: string;
    content: string;
    completed: boolean;
    assignee_id: string | null;
    order: number;
    created_at: string;
    completed_at: string | null;
  }[];
}

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  onChange: () => void;
}

type TabKey = "details" | "checklist" | "comments" | "activity" | "time";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "urgent", label: "Urgent", color: "#ef4444" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "normal", label: "Normal", color: "#3b82f6" },
  { value: "low", label: "Low", color: "#a1a1aa" },
  { value: "none", label: "None", color: "#d4d4d8" },
];

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Render body text replacing @[Name](id) with styled chip */
function renderMentionBody(body: string): React.ReactNode {
  const parts = body.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = /^@\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (match) {
      return (
        <span
          key={i}
          className="inline-flex items-center rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent"
        >
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const letter = name[0]?.toUpperCase() ?? "?";
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${hue},55%,50%)` }}
    >
      {letter}
    </span>
  );
}

export function TaskDetailModal({ taskId, onClose, onChange }: TaskDetailModalProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [activity, setActivity] = useState<TaskActivityEntry[]>([]);
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithUser[]>([]);
  const [watchers, setWatchers] = useState<WatcherWithUser[]>([]);
  const [openTimer, setOpenTimer] = useState<TimeEntry | null>(null);

  const [tab, setTab] = useState<TabKey>("details");
  const [loading, setLoading] = useState(false);

  // Editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [description, setDescription] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);

  // Manual time entry form
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualNote, setManualNote] = useState("");

  // Tags
  const [tagInput, setTagInput] = useState("");

  // Recurrence
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);

  const saveDescTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load
  useEffect(() => {
    if (!taskId) return;
    (async () => {
      setLoading(true);
      try {
        const t = await getTask(taskId);
        if (!t) return;
        setTask(t);
        setTitleVal(t.title);
        setDescription(t.description ?? "");
        setRecurrenceEnabled(!!t.recurrence_rule);
        if (t.recurrence_rule) {
          setRecurrenceFreq(t.recurrence_rule.frequency);
          setRecurrenceInterval(t.recurrence_rule.interval);
        }
        const [c, a, cl, te, w, st, cf, ot] = await Promise.all([
          getComments(taskId),
          getActivity(taskId),
          getChecklists(taskId),
          getTimeEntries(taskId),
          getWatchers(taskId),
          getStatuses(t.list_id),
          getCustomFields(t.list_id),
          getOpenTimer(),
        ]);
        setComments(c);
        setActivity(a);
        setChecklists(cl as ChecklistWithItems[]);
        setTimeEntries(te);
        setWatchers(w);
        setStatuses(st);
        setCustomFields(cf);
        setOpenTimer(ot);
        setTimerRunning(!!ot);
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  async function save(patch: Parameters<typeof updateTask>[1]) {
    if (!task) return;
    await updateTask(task.id, patch);
    router.refresh();
    onChange();
  }

  async function saveTitle() {
    if (!task) return;
    setEditingTitle(false);
    if (titleVal.trim() !== task.title) {
      await save({ title: titleVal.trim() || task.title });
      setTask((prev) => prev ? { ...prev, title: titleVal.trim() } : prev);
    }
  }

  function handleDescriptionChange(v: string) {
    setDescription(v);
    if (saveDescTimer.current) clearTimeout(saveDescTimer.current);
    saveDescTimer.current = setTimeout(() => {
      save({ description: v });
    }, 800);
  }

  async function handleAddComment() {
    if (!task || !commentBody.trim()) return;
    await addComment({ taskId: task.id, body: commentBody.trim() });
    setCommentBody("");
    const c = await getComments(task.id);
    setComments(c);
    router.refresh();
  }

  async function handleToggleTimer() {
    if (!task) return;
    if (timerRunning && openTimer) {
      await stopTimer(openTimer.id);
      setTimerRunning(false);
      setOpenTimer(null);
    } else {
      const te = await startTimer(task.id);
      setTimerRunning(true);
      setOpenTimer(te);
    }
    const entries = await getTimeEntries(task.id);
    setTimeEntries(entries);
    router.refresh();
  }

  async function handleManualEntry() {
    if (!task || !manualStart || !manualEnd) return;
    await createManualTimeEntry({
      taskId: task.id,
      startedAt: manualStart,
      endedAt: manualEnd,
      description: manualNote || undefined,
    });
    setManualStart("");
    setManualEnd("");
    setManualNote("");
    const entries = await getTimeEntries(task.id);
    setTimeEntries(entries);
    router.refresh();
  }

  async function handleDeleteTimeEntry(id: string) {
    await deleteTimeEntry(id);
    setTimeEntries((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  async function handleArchive() {
    if (!task) return;
    if (!confirm("Archive this task?")) return;
    await archiveTask(task.id);
    router.refresh();
    onChange();
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm("Permanently delete this task?")) return;
    await deleteTask(task.id);
    router.refresh();
    onChange();
    onClose();
  }

  async function addTag(tag: string) {
    if (!task) return;
    const trimmed = tag.trim();
    if (!trimmed || task.tags.includes(trimmed)) return;
    const newTags = [...task.tags, trimmed];
    await save({ tags: newTags });
    setTask((prev) => prev ? { ...prev, tags: newTags } : prev);
  }

  async function removeTag(tag: string) {
    if (!task) return;
    const newTags = task.tags.filter((t) => t !== tag);
    await save({ tags: newTags });
    setTask((prev) => prev ? { ...prev, tags: newTags } : prev);
  }

  async function handleRecurrenceSave() {
    if (!task) return;
    if (!recurrenceEnabled) {
      await save({ recurrence_rule: null });
    } else {
      const rule: RecurrenceRule = { frequency: recurrenceFreq, interval: recurrenceInterval };
      await save({ recurrence_rule: rule });
    }
  }

  const currentStatus = statuses.find((s) => s.id === task?.status_id);
  const totalSecs = timeEntries.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0);

  if (!taskId) return null;

  return (
    <Modal open={!!taskId} onClose={onClose} size="xl">
      {loading && !task ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      ) : task ? (
        <div className="flex h-full max-h-[80vh] overflow-hidden -mx-5 -my-4">
          {/* Main column */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-2 border-b border-border px-5 py-4">
              <div className="flex-1">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleVal}
                    onChange={(e) => setTitleVal(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle();
                      if (e.key === "Escape") { setTitleVal(task.title); setEditingTitle(false); }
                    }}
                    className="w-full bg-transparent text-lg font-semibold text-foreground focus:outline-none border-b border-accent pb-1 font-display"
                  />
                ) : (
                  <h2
                    className="cursor-pointer text-lg font-semibold text-foreground hover:text-accent transition-colors font-display"
                    onClick={() => setEditingTitle(true)}
                  >
                    {task.title}
                  </h2>
                )}
                {task.parent_id && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Subtask of <span className="font-medium">{task.parent_id}</span>
                  </p>
                )}
              </div>

              {/* ... menu */}
              <div className="relative">
                <button
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={handleArchive}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Archive
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-5">
              {(
                [
                  { key: "details", icon: FileText, label: "Details" },
                  { key: "checklist", icon: ListChecks, label: "Checklist" },
                  { key: "comments", icon: MessageSquare, label: "Comments" },
                  { key: "activity", icon: Activity, label: "Activity" },
                  { key: "time", icon: Clock, label: "Time" },
                ] as const
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                    tab === key
                      ? "border-accent text-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setTab(key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === "details" && (
                <DetailsTab
                  task={task}
                  customFields={customFields}
                  description={description}
                  onDescriptionChange={handleDescriptionChange}
                  tags={task.tags}
                  tagInput={tagInput}
                  onTagInputChange={setTagInput}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                />
              )}

              {tab === "checklist" && (
                <ChecklistTab
                  taskId={task.id}
                  checklists={checklists}
                  onChange={async () => {
                    const cl = await getChecklists(task.id);
                    setChecklists(cl as ChecklistWithItems[]);
                    router.refresh();
                  }}
                />
              )}

              {tab === "comments" && (
                <CommentsTab
                  comments={comments}
                  commentBody={commentBody}
                  onCommentBodyChange={setCommentBody}
                  onAddComment={handleAddComment}
                />
              )}

              {tab === "activity" && <ActivityTab activity={activity} />}

              {tab === "time" && (
                <TimeTab
                  task={task}
                  timeEntries={timeEntries}
                  timerRunning={timerRunning}
                  totalSecs={totalSecs}
                  manualStart={manualStart}
                  manualEnd={manualEnd}
                  manualNote={manualNote}
                  onManualStartChange={setManualStart}
                  onManualEndChange={setManualEnd}
                  onManualNoteChange={setManualNote}
                  onToggleTimer={handleToggleTimer}
                  onManualEntry={handleManualEntry}
                  onDeleteEntry={handleDeleteTimeEntry}
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0 overflow-y-auto border-l border-border bg-surface-alt/30 px-4 py-4">
            <SidebarField label="Status">
              <div className="relative">
                <button
                  className="flex items-center gap-2"
                  onClick={() => setShowStatusPicker(!showStatusPicker)}
                >
                  {currentStatus ? (
                    <StatusPill status={currentStatus} size="sm" />
                  ) : (
                    <span className="rounded-pill bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                      No status
                    </span>
                  )}
                </button>
                {showStatusPicker && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden">
                    {statuses.map((s) => (
                      <button
                        key={s.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={async () => {
                          setShowStatusPicker(false);
                          await save({ status_id: s.id });
                          setTask((prev) => prev ? { ...prev, status_id: s.id } : prev);
                        }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SidebarField>

            <SidebarField label="Priority">
              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors"
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                >
                  <Flag
                    className="h-4 w-4"
                    style={{
                      color: PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color,
                    }}
                  />
                  <span className="text-sm capitalize text-foreground">{task.priority}</span>
                </button>
                {showPriorityPicker && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={async () => {
                          setShowPriorityPicker(false);
                          await save({ priority: p.value });
                          setTask((prev) => prev ? { ...prev, priority: p.value } : prev);
                        }}
                      >
                        <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: p.color }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SidebarField>

            <SidebarField label="Assignees">
              <div className="flex flex-wrap gap-1">
                {task.assignee_ids.map((id) => (
                  <Avatar key={id} name={id} size={24} />
                ))}
              </div>
            </SidebarField>

            <SidebarField label="Due Date">
              <input
                type="date"
                defaultValue={task.due_date?.slice(0, 10) ?? ""}
                className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                onBlur={async (e) => {
                  await save({ due_date: e.target.value || null });
                  setTask((prev) => prev ? { ...prev, due_date: e.target.value || null } : prev);
                }}
              />
            </SidebarField>

            <SidebarField label="Start Date">
              <input
                type="date"
                defaultValue={task.start_date?.slice(0, 10) ?? ""}
                className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                onBlur={async (e) => {
                  await save({ start_date: e.target.value || null });
                  setTask((prev) => prev ? { ...prev, start_date: e.target.value || null } : prev);
                }}
              />
            </SidebarField>

            <SidebarField label="Estimate (hrs)">
              <input
                type="number"
                defaultValue={task.time_estimate ?? ""}
                min={0}
                step={0.5}
                className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                onBlur={async (e) => {
                  const v = parseFloat(e.target.value);
                  await save({ time_estimate: isNaN(v) ? null : v });
                  setTask((prev) => prev ? { ...prev, time_estimate: isNaN(v) ? null : v } : prev);
                }}
              />
            </SidebarField>

            <SidebarField label="Watchers">
              <div className="flex flex-wrap gap-1">
                {watchers.map((w) => (
                  <button
                    key={w.user_id}
                    className="group relative"
                    title="Remove watcher"
                    onClick={async () => {
                      await removeWatcher(task.id, w.user_id);
                      setWatchers((prev) => prev.filter((x) => x.user_id !== w.user_id));
                      router.refresh();
                    }}
                  >
                    <Avatar name={w.user_name ?? w.user_email ?? w.user_id} size={24} />
                  </button>
                ))}
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/20 transition-colors"
                  title="Watch task"
                  onClick={async () => {
                    await addWatcher(task.id, "me");
                    const w = await getWatchers(task.id);
                    setWatchers(w);
                    router.refresh();
                  }}
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
            </SidebarField>

            <SidebarField label="Recurrence">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={recurrenceEnabled}
                    onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                    className="accent-accent"
                  />
                  Recurring
                </label>
                {recurrenceEnabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Every</span>
                      <input
                        type="number"
                        min={1}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="w-14 rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none"
                      />
                      <select
                        value={recurrenceFreq}
                        onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency)}
                        className="rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none"
                      >
                        <option value="daily">Day(s)</option>
                        <option value="weekly">Week(s)</option>
                        <option value="monthly">Month(s)</option>
                        <option value="yearly">Year(s)</option>
                      </select>
                    </div>
                    <button
                      className="self-start rounded-md bg-accent px-3 py-1 text-xs text-white hover:opacity-90 transition-opacity"
                      onClick={handleRecurrenceSave}
                    >
                      Save
                    </button>
                  </>
                )}
                {!recurrenceEnabled && task.recurrence_rule && (
                  <button
                    className="self-start text-xs text-danger hover:underline"
                    onClick={handleRecurrenceSave}
                  >
                    Remove recurrence
                  </button>
                )}
              </div>
            </SidebarField>

            <SidebarField label="Created By">
              <span className="text-sm text-muted-foreground">
                {task.created_by ?? "Unknown"}
              </span>
            </SidebarField>

            <SidebarField label="Created At">
              <span className="text-sm text-muted-foreground">
                {formatDateShort(task.created_at)}
              </span>
            </SidebarField>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ---- Sub-components ----

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function DetailsTab({
  task,
  customFields,
  description,
  onDescriptionChange,
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}: {
  task: Task;
  customFields: CustomFieldDef[];
  description: string;
  onDescriptionChange: (v: string) => void;
  tags: string[];
  tagInput: string;
  onTagInputChange: (v: string) => void;
  onAddTag: (t: string) => void;
  onRemoveTag: (t: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Description */}
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Description
        </p>
        <MentionInput
          value={description}
          onChange={onDescriptionChange}
          placeholder="Add a description…"
          minRows={4}
        />
      </div>

      {/* Tags */}
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tags
        </p>
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="text-muted-foreground hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          placeholder="Add tag (Enter)"
          className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const val = tagInput.replace(",", "").trim();
              if (val) { onAddTag(val); onTagInputChange(""); }
            }
          }}
        />
      </div>

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Custom Fields
          </p>
          <div className="flex flex-col gap-2">
            {customFields.map((cf) => (
              <div key={cf.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">{cf.name}</span>
                <CustomFieldInput task={task} field={cf} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomFieldInput({
  task,
  field,
}: {
  task: Task;
  field: CustomFieldDef;
}) {
  const val = task.custom_fields[field.id];

  async function save(v: unknown) {
    const { setTaskCustomField } = await import("@/lib/work/actions");
    await setTaskCustomField(task.id, field.id, v);
  }

  const inputClass =
    "rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none";

  switch (field.field_type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={Boolean(val)}
          onChange={(e) => save(e.target.checked)}
          className="accent-accent"
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
          className={inputClass}
          onBlur={(e) => save(parseFloat(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          type="date"
          defaultValue={typeof val === "string" ? val.slice(0, 10) : ""}
          className={inputClass}
          onChange={(e) => save(e.target.value)}
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
          onChange={(e) => save(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    default:
      return (
        <input
          type={field.field_type === "email" ? "email" : field.field_type === "url" ? "url" : field.field_type === "phone" ? "tel" : "text"}
          defaultValue={typeof val === "string" ? val : ""}
          className={inputClass}
          onBlur={(e) => save(e.target.value)}
        />
      );
  }
}

function ChecklistTab({
  taskId,
  checklists,
  onChange,
}: {
  taskId: string;
  checklists: ChecklistWithItems[];
  onChange: () => void;
}) {
  const [newChecklistName, setNewChecklistName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {checklists.map((cl) => (
        <ChecklistBlock key={cl.id} checklist={cl} onChange={onChange} />
      ))}

      {/* Add new checklist */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <input
          value={newChecklistName}
          onChange={(e) => setNewChecklistName(e.target.value)}
          placeholder="New checklist name…"
          className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && newChecklistName.trim()) {
              await createChecklist({ task_id: taskId, name: newChecklistName.trim() });
              setNewChecklistName("");
              onChange();
            }
          }}
        />
        <button
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:opacity-90"
          onClick={async () => {
            if (!newChecklistName.trim()) return;
            await createChecklist({ task_id: taskId, name: newChecklistName.trim() });
            setNewChecklistName("");
            onChange();
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

function ChecklistBlock({
  checklist,
  onChange,
}: {
  checklist: ChecklistWithItems;
  onChange: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(checklist.name);
  const [newItem, setNewItem] = useState("");

  const done = checklist.items.filter((i) => i.completed).length;
  const total = checklist.items.length;

  return (
    <div className="rounded-card border border-border p-3">
      <div className="flex items-center gap-2 mb-2">
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-foreground focus:outline-none border-b border-accent"
            onBlur={async () => {
              setEditingName(false);
              if (nameVal.trim() !== checklist.name) {
                await renameChecklist(checklist.id, nameVal.trim() || checklist.name);
                onChange();
              }
            }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold text-foreground hover:text-accent transition-colors"
            onClick={() => setEditingName(true)}
          >
            {checklist.name}
          </button>
        )}
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
        <button
          className="rounded p-0.5 text-muted-foreground hover:text-danger transition-colors"
          onClick={async () => {
            if (!confirm("Delete this checklist?")) return;
            await deleteChecklist(checklist.id);
            onChange();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-2 h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-success transition-all"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      )}

      {/* Items */}
      <div className="flex flex-col gap-1">
        {checklist.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={async (e) => {
                await updateChecklistItem(item.id, { completed: e.target.checked });
                onChange();
              }}
              className="accent-accent shrink-0"
            />
            <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.content}
            </span>
            <button
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-danger transition-colors"
              onClick={async () => {
                await deleteChecklistItem(item.id);
                onChange();
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border focus:border-accent pb-0.5"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && newItem.trim()) {
              await createChecklistItem({ checklist_id: checklist.id, content: newItem.trim() });
              setNewItem("");
              onChange();
            }
          }}
        />
      </div>
    </div>
  );
}

function CommentsTab({
  comments,
  commentBody,
  onCommentBodyChange,
  onAddComment,
}: {
  comments: CommentWithAuthor[];
  commentBody: string;
  onCommentBodyChange: (v: string) => void;
  onAddComment: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Existing comments */}
      <div className="flex flex-col gap-3">
        {comments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar name={c.author_name ?? c.author_email ?? c.author_id} size={28} />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">
                  {c.author_name ?? c.author_email ?? "Unknown"}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatTimeAgo(c.created_at)}</span>
              </div>
              <div className="mt-0.5 text-sm text-foreground leading-relaxed">
                {renderMentionBody(c.body)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New comment */}
      <div className="border-t border-border pt-3">
        <MentionInput
          value={commentBody}
          onChange={onCommentBodyChange}
          placeholder="Write a comment… (Ctrl+Enter to submit)"
          minRows={2}
          onSubmit={onAddComment}
        />
        <div className="mt-2 flex justify-end">
          <button
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            onClick={onAddComment}
            disabled={!commentBody.trim()}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: TaskActivityEntry[] }) {
  function actionLabel(action: string): string {
    const labels: Record<string, string> = {
      created: "created this task",
      renamed: "renamed to",
      status_changed: "changed status",
      priority_changed: "changed priority",
      assignees_changed: "updated assignees",
      due_date_changed: "changed due date",
      description_changed: "updated description",
      completed: "completed this task",
      uncompleted: "uncompleted this task",
      archived: "archived this task",
      commented: "added a comment",
      moved: "moved this task",
      updated_custom_field: "updated a custom field",
      recurrence_spawned: "spawned from recurrence",
      attachment_added: "added an attachment",
    };
    return labels[action] ?? action.replace(/_/g, " ");
  }

  return (
    <div className="flex flex-col gap-2">
      {activity.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">No activity yet.</p>
      )}
      {activity.map((a) => (
        <div key={a.id} className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
            <Activity className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <span className="text-sm text-foreground">
              <span className="font-medium">{a.actor_name ?? a.actor_email ?? "Someone"}</span>
              {" "}{actionLabel(a.action)}
            </span>
            <div className="text-[11px] text-muted-foreground mt-0.5">{formatTimeAgo(a.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeTab({
  task,
  timeEntries,
  timerRunning,
  totalSecs,
  manualStart,
  manualEnd,
  manualNote,
  onManualStartChange,
  onManualEndChange,
  onManualNoteChange,
  onToggleTimer,
  onManualEntry,
  onDeleteEntry,
}: {
  task: Task;
  timeEntries: TimeEntryWithUser[];
  timerRunning: boolean;
  totalSecs: number;
  manualStart: string;
  manualEnd: string;
  manualNote: string;
  onManualStartChange: (v: string) => void;
  onManualEndChange: (v: string) => void;
  onManualNoteChange: (v: string) => void;
  onToggleTimer: () => void;
  onManualEntry: () => void;
  onDeleteEntry: (id: string) => void;
}) {
  void task; // kept for future use
  return (
    <div className="flex flex-col gap-4">
      {/* Timer control */}
      <div className="flex items-center gap-3 rounded-card border border-border p-3">
        <button
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
            timerRunning ? "bg-danger hover:bg-danger/90" : "bg-success hover:bg-success/90"
          }`}
          onClick={onToggleTimer}
        >
          {timerRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {timerRunning ? "Stop Timer" : "Start Timer"}
        </button>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatDuration(totalSecs)}</span>
        </div>
      </div>

      {/* Manual entry */}
      <div className="rounded-card border border-border p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Manual Entry
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="w-16 text-xs text-muted-foreground">Start</label>
            <input
              type="datetime-local"
              value={manualStart}
              onChange={(e) => onManualStartChange(e.target.value)}
              className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 text-xs text-muted-foreground">End</label>
            <input
              type="datetime-local"
              value={manualEnd}
              onChange={(e) => onManualEndChange(e.target.value)}
              className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 text-xs text-muted-foreground">Note</label>
            <input
              type="text"
              value={manualNote}
              onChange={(e) => onManualNoteChange(e.target.value)}
              placeholder="Optional note"
              className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            className="self-end rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            onClick={onManualEntry}
            disabled={!manualStart || !manualEnd}
          >
            <RefreshCw className="inline h-3 w-3 mr-1" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex flex-col gap-1">
        {timeEntries.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <Avatar name={e.user_name ?? e.user_email ?? e.user_id} size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">
                {e.description ?? formatDateShort(e.started_at)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {e.duration_seconds != null ? formatDuration(e.duration_seconds) : "running…"}
              </p>
            </div>
            <button
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-danger transition-colors"
              onClick={() => onDeleteEntry(e.id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
