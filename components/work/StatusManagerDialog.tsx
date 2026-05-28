"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, X, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatusWithReassign,
  reorderStatuses,
} from "@/lib/work/actions";
import type { Status, TaskStatusCategory } from "@/lib/work/types";
import { Modal } from "@/components/ui/Modal";

interface StatusManagerDialogProps {
  listId: string;
  open: boolean;
  onClose: () => void;
  onChange: () => void;
}

const CATEGORIES: { value: TaskStatusCategory; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "closed", label: "Closed" },
];

// ---- Sortable status row ----
function StatusRow({
  status,
  otherStatuses,
  onDelete,
  onUpdate,
}: {
  status: Status;
  otherStatuses: Status[];
  onDelete: (id: string, targetId: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Status, "name" | "color" | "category">>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: status.id,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reassignTo, setReassignTo] = useState(otherStatuses[0]?.id ?? "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-2 border-b border-border">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color swatch */}
      <div className="relative">
        <input
          type="color"
          value={status.color}
          onChange={(e) => onUpdate(status.id, { color: e.target.value })}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 opacity-0 absolute inset-0"
          title="Pick color"
        />
        <span
          className="block h-6 w-6 rounded-full border border-border"
          style={{ backgroundColor: status.color }}
        />
      </div>

      {/* Name */}
      <input
        value={status.name}
        onChange={(e) => onUpdate(status.id, { name: e.target.value })}
        className="flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm text-foreground hover:border-border focus:border-accent focus:outline-none"
      />

      {/* Category */}
      <select
        value={status.category}
        onChange={(e) => onUpdate(status.id, { category: e.target.value as TaskStatusCategory })}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button
          className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-xs text-foreground">Move to:</span>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className="rounded border border-border bg-surface px-1 py-0.5 text-xs"
          >
            {otherStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            className="rounded px-2 py-0.5 text-xs text-danger border border-danger hover:bg-danger hover:text-white transition-colors"
            onClick={() => onDelete(status.id, reassignTo)}
          >
            Delete
          </button>
          <button
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function StatusManagerDialog({ listId, open, onClose, onChange }: StatusManagerDialogProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);

  // New status form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newCategory, setNewCategory] = useState<TaskStatusCategory>("todo");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Debounce timer ref for update calls
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!open) return;
    getStatuses(listId).then(setStatuses).catch(console.error);
  }, [open, listId]);

  function handleUpdate(id: string, patch: Partial<Pick<Status, "name" | "color" | "category">>) {
    // Optimistic update
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
    // Debounced server save
    clearTimeout(debounceRefs.current[id]);
    debounceRefs.current[id] = setTimeout(async () => {
      try {
        await updateStatus(id, patch);
        router.refresh();
        onChange();
      } catch (err) {
        console.error(err);
      }
    }, 500);
  }

  async function handleDelete(id: string, targetId: string) {
    setLoading(true);
    try {
      await deleteStatusWithReassign(id, targetId);
      setStatuses((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const s = await createStatus({
        list_id: listId,
        name: newName.trim(),
        color: newColor,
        category: newCategory,
      });
      setStatuses((prev) => [...prev, s]);
      setNewName("");
      router.refresh();
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = statuses.map((s) => s.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    ids.splice(from, 1);
    ids.splice(to, 0, active.id as string);
    setStatuses((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      return ids.map((id) => map.get(id)!);
    });
    await reorderStatuses(listId, ids);
    router.refresh();
    onChange();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Statuses"
      size="md"
      footer={
        <button
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="mb-4">
            {statuses.map((s) => (
              <StatusRow
                key={s.id}
                status={s}
                otherStatuses={statuses.filter((x) => x.id !== s.id)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new */}
      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Add Status
        </p>
        <div className="flex items-center gap-2">
          {/* Color */}
          <div className="relative h-7 w-7 shrink-0">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer rounded-full border-0 opacity-0"
            />
            <span
              className="block h-7 w-7 rounded-full border border-border"
              style={{ backgroundColor: newColor }}
            />
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Status name"
            className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as TaskStatusCategory)}
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={loading || !newName.trim()}
            className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
