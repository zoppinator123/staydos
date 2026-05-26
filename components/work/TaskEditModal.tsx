"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type {
  Comment,
  RecurrenceRule,
  Status,
  Task,
  TaskActivity,
  TaskPriority,
} from "@/lib/work/types";
import {
  deleteTask,
  getComments,
  getTask,
  getTaskActivity,
  updateTask,
  createComment,
  archiveTask,
} from "@/lib/work/actions";
import { ChecklistsPanel } from "./ChecklistsPanel";
import { CustomFieldsPanel } from "./CustomFieldsPanel";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { AssigneePicker } from "./AssigneePicker";

interface Props {
  taskId: string;
  statuses: Status[];
  onClose: () => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
}

const PRIORITIES: TaskPriority[] = ["urgent", "high", "normal", "low", "none"];

export function TaskEditModal({ taskId, statuses, onClose, onSaved, onDeleted }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [tab, setTab] = useState<
    "details" | "checklists" | "custom_fields" | "attachments" | "comments" | "activity"
  >("details");
  const [pending, startTransition] = useTransition();
  const [newComment, setNewComment] = useState("");

  // Cmd/Ctrl+Enter inside the modal → save & close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!task || pending) return;
        startTransition(async () => {
          const updated = await updateTask(task.id, {
            title: task.title,
            description: task.description,
            status_id: task.status_id,
            priority: task.priority,
            due_date: task.due_date,
            start_date: task.start_date,
            time_estimate: task.time_estimate,
            tags: task.tags,
            recurrence_rule: task.recurrence_rule,
            assignee_ids: task.assignee_ids,
          });
          setTask(updated);
          onSaved(updated);
          onClose();
        });
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [task, pending, onSaved, onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, c, a] = await Promise.all([
        getTask(taskId),
        getComments(taskId),
        getTaskActivity(taskId),
      ]);
      if (cancelled) return;
      setTask(t);
      setComments(c);
      setActivity(a);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  function patch<K extends keyof Task>(key: K, value: Task[K]) {
    if (!task) return;
    setTask({ ...task, [key]: value });
  }

  function save() {
    if (!task) return;
    startTransition(async () => {
      const updated = await updateTask(task.id, {
        title: task.title,
        description: task.description,
        status_id: task.status_id,
        priority: task.priority,
        due_date: task.due_date,
        start_date: task.start_date,
        time_estimate: task.time_estimate,
        tags: task.tags,
        recurrence_rule: task.recurrence_rule,
        assignee_ids: task.assignee_ids,
      });
      setTask(updated);
      onSaved(updated);
    });
  }

  function remove() {
    if (!task) return;
    if (!confirm("Delete this task permanently?")) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onDeleted(task.id);
      onClose();
    });
  }

  function archive() {
    if (!task) return;
    startTransition(async () => {
      await archiveTask(task.id);
      onDeleted(task.id);
      onClose();
    });
  }

  function postComment() {
    if (!task || !newComment.trim()) return;
    startTransition(async () => {
      const c = await createComment({ task_id: task.id, body: newComment.trim() });
      setComments((cur) => [...cur, c]);
      setNewComment("");
    });
  }

  if (!task) {
    return (
      <Modal open onClose={onClose} size="xl" title="Loading…">
        <div className="py-10 text-center text-sm text-zinc-500">Loading task…</div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <input
          value={task.title}
          onChange={(e) => patch("title", e.target.value)}
          onBlur={save}
          className="w-full bg-transparent text-base font-semibold focus:outline-none"
        />
      }
      footer={
        <>
          <Button variant="ghost" onClick={archive} disabled={pending}>
            Archive
          </Button>
          <Button variant="danger" onClick={remove} disabled={pending}>
            Delete
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(
          [
            ["details", "Details"],
            ["checklists", "Checklists"],
            ["custom_fields", "Custom fields"],
            ["attachments", "Attachments"],
            ["comments", "Comments"],
            ["activity", "Activity"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium ${
              tab === t
                ? "border-indigo-500 text-indigo-700 dark:text-indigo-300"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={task.description ?? ""}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="Add a description…"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={task.status_id ?? ""}
              onChange={(e) => patch("status_id", e.target.value || null)}
              options={[
                { value: "", label: "No status" },
                ...statuses.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Select
              value={task.priority}
              onChange={(e) => patch("priority", e.target.value as TaskPriority)}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
          </div>

          <div>
            <Label>Due date</Label>
            <Input
              type="datetime-local"
              value={toLocalDT(task.due_date)}
              onChange={(e) => patch("due_date", fromLocalDT(e.target.value))}
            />
          </div>

          <div>
            <Label>Start date</Label>
            <Input
              type="datetime-local"
              value={toLocalDT(task.start_date)}
              onChange={(e) => patch("start_date", fromLocalDT(e.target.value))}
            />
          </div>

          <div>
            <Label>Time estimate (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={task.time_estimate ?? ""}
              onChange={(e) =>
                patch("time_estimate", e.target.value ? parseInt(e.target.value, 10) : null)
              }
            />
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={task.tags.join(", ")}
              onChange={(e) =>
                patch(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <Label>Assignees</Label>
            <AssigneePicker
              listId={task.list_id}
              value={task.assignee_ids}
              onChange={(v) => patch("assignee_ids", v)}
            />
          </div>

          <div className="md:col-span-2">
            <RecurrenceEditor
              value={task.recurrence_rule}
              onChange={(v) => patch("recurrence_rule", v)}
            />
          </div>
        </div>
      ) : null}

      {tab === "checklists" ? <ChecklistsPanel taskId={task.id} /> : null}

      {tab === "custom_fields" ? (
        <CustomFieldsPanel
          taskId={task.id}
          listId={task.list_id}
          values={task.custom_fields ?? {}}
          onChange={(v) => patch("custom_fields", v)}
        />
      ) : null}

      {tab === "attachments" ? <AttachmentsPanel taskId={task.id} /> : null}

      {tab === "comments" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="text-xs text-zinc-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
            />
            <Button onClick={postComment} disabled={pending || !newComment.trim()}>
              Post
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="space-y-2">
          {activity.length === 0 ? (
            <p className="text-xs text-zinc-500">No activity yet.</p>
          ) : (
            activity.map((a) => (
              <div
                key={a.id}
                className="flex justify-between rounded border border-zinc-100 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-900 dark:text-zinc-300"
              >
                <span>{a.action}</span>
                <span className="text-zinc-500">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function toLocalDT(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDT(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceRule | null;
  onChange: (v: RecurrenceRule | null) => void;
}) {
  const enabled = !!value;
  const v: RecurrenceRule = value ?? { frequency: "weekly", interval: 1 };

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? v : null)}
          className="h-4 w-4 accent-indigo-600"
        />
        Recurring
      </label>
      {enabled ? (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <Label>Frequency</Label>
            <Select
              value={v.frequency}
              onChange={(e) =>
                onChange({ ...v, frequency: e.target.value as RecurrenceRule["frequency"] })
              }
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </div>
          <div>
            <Label>Interval</Label>
            <Input
              type="number"
              min={1}
              value={v.interval}
              onChange={(e) => onChange({ ...v, interval: Math.max(1, parseInt(e.target.value || "1", 10)) })}
            />
          </div>
          <div>
            <Label>Ends after (count)</Label>
            <Input
              type="number"
              min={0}
              value={v.count ?? ""}
              onChange={(e) =>
                onChange({ ...v, count: e.target.value ? parseInt(e.target.value, 10) : null })
              }
              placeholder="Never"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
