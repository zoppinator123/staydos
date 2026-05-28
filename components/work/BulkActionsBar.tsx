"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Flag, Calendar, Archive, Trash2, UserPlus } from "lucide-react";
import { updateTask, archiveTask, deleteTask } from "@/lib/work/actions";
import { AssigneePicker } from "./AssigneePicker";
import type { Status, TaskPriority } from "@/lib/work/types";

interface BulkActionsBarProps {
  selectedIds: string[];
  statuses: Status[];
  listId: string;
  onClear: () => void;
  onChange: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "urgent", label: "Urgent", color: "#ef4444" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "normal", label: "Normal", color: "#3b82f6" },
  { value: "low", label: "Low", color: "#a1a1aa" },
  { value: "none", label: "None", color: "#d4d4d8" },
];

export function BulkActionsBar({ selectedIds, statuses, listId, onClear, onChange }: BulkActionsBarProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<"status" | "priority" | "date" | "assignees" | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigneeValues, setAssigneeValues] = useState<string[]>([]);

  const assigneeMenuRef = useRef<HTMLDivElement>(null);

  // Close assignee popover on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(e.target as Node)) {
        if (openMenu === "assignees") setOpenMenu(null);
      }
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openMenu]);

  if (selectedIds.length === 0) return null;

  async function applyUpdate(input: Parameters<typeof updateTask>[1]) {
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => updateTask(id, input)));
      router.refresh();
      onChange();
    } finally {
      setLoading(false);
      setOpenMenu(null);
    }
  }

  async function handleAssigneeChange(ids: string[]) {
    setAssigneeValues(ids);
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => updateTask(id, { assignee_ids: ids })));
      router.refresh();
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive ${selectedIds.length} tasks?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => archiveTask(id)));
      router.refresh();
      onChange();
      onClear();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${selectedIds.length} tasks?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteTask(id)));
      router.refresh();
      onChange();
      onClear();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-slide-up">
      <div className="flex items-center gap-2 rounded-pill bg-surface px-4 py-2 shadow-card-hover ring-1 ring-border">
        <span className="text-sm font-semibold text-foreground">
          {selectedIds.length} selected
        </span>
        <div className="h-4 w-px bg-border mx-1" />

        {/* Status picker */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
            disabled={loading}
          >
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            Status
          </button>
          {openMenu === "status" && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-44 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                  onClick={() => applyUpdate({ status_id: s.id })}
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

        {/* Priority picker */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
            disabled={loading}
          >
            <Flag className="h-3.5 w-3.5" />
            Priority
          </button>
          {openMenu === "priority" && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-36 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                  onClick={() => applyUpdate({ priority: p.value })}
                >
                  <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: p.color }} />
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due Date picker */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setOpenMenu(openMenu === "date" ? null : "date")}
            disabled={loading}
          >
            <Calendar className="h-3.5 w-3.5" />
            Due Date
          </button>
          {openMenu === "date" && (
            <div className="absolute bottom-full mb-2 left-0 z-50 rounded-card border border-border bg-surface shadow-card-hover p-3">
              <input
                type="date"
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                onChange={(e) => {
                  if (e.target.value) applyUpdate({ due_date: e.target.value });
                }}
              />
            </div>
          )}
        </div>

        {/* Gap 4: Assignees picker */}
        <div className="relative" ref={assigneeMenuRef}>
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setOpenMenu(openMenu === "assignees" ? null : "assignees")}
            disabled={loading}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assignees
          </button>
          {openMenu === "assignees" && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-64 rounded-card border border-border bg-surface shadow-card-hover">
              <AssigneePicker
                listId={listId}
                value={assigneeValues}
                onChange={handleAssigneeChange}
              />
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={handleArchive}
          disabled={loading}
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </button>

        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
