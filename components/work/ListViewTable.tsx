"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, Columns3, ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { createTask, updateTask, reorderTasks } from "@/lib/work/actions";
import type { Task, Status, CustomFieldDef, TaskPriority } from "@/lib/work/types";
import { TaskRow } from "./TaskRow";
import { StatusPill } from "./StatusPill";
import { BulkActionsBar } from "./BulkActionsBar";
import { StatusManagerDialog } from "./StatusManagerDialog";
import { CustomFieldsManagerDialog } from "./CustomFieldsManagerDialog";

interface ListViewTableProps {
  listId: string;
  tasks: Task[];
  statuses: Status[];
  customFields: CustomFieldDef[];
}

// ---- TaskRowGroup: renders a parent + its subtasks (avoids fragment-as-expression ESLint issue) ----
function TaskRowGroup({
  task,
  children_,
  isExpanded,
  statuses,
  customFields,
  selectedIds,
  activeTaskId,
  onSelect,
  onOpen,
  onChange,
  onToggleExpand,
}: {
  task: Task;
  children_: Task[];
  isExpanded: boolean;
  statuses: Status[];
  customFields: CustomFieldDef[];
  selectedIds: Set<string>;
  activeTaskId: string | null;
  onSelect: (id: string, shift: boolean) => void;
  onOpen: (id: string) => void;
  onChange: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <TaskRow
        task={task}
        depth={0}
        statuses={statuses}
        customFields={customFields}
        selected={selectedIds.has(task.id)}
        onSelect={onSelect}
        onOpen={onOpen}
        onChange={onChange}
        isDragging={activeTaskId === task.id}
        childCount={children_.length}
        expanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
      {isExpanded &&
        children_.map((sub) => (
          <TaskRow
            key={sub.id}
            task={sub}
            depth={1}
            statuses={statuses}
            customFields={customFields}
            selected={selectedIds.has(sub.id)}
            onSelect={onSelect}
            onOpen={onOpen}
            onChange={onChange}
            isDragging={activeTaskId === sub.id}
          />
        ))}
    </>
  );
}

// ---- Droppable group area ----
// (Removed: standalone GroupDropZone — GroupHeaderRow is now the drop target.)

// ---- Droppable group header row (also catches drops to reassign status) ----
function GroupHeaderRow({
  status,
  count,
  isCollapsed,
  colCount,
  onToggle,
}: {
  status: Status;
  count: number;
  isCollapsed: boolean;
  colCount: number;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${status.id}` });
  return (
    <tr
      ref={setNodeRef}
      className={`border-b border-border transition-colors ${
        isOver ? "bg-accent/10" : "bg-surface-alt/50"
      }`}
    >
      <td colSpan={colCount} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <StatusPill status={status} size="sm" />
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
      </td>
    </tr>
  );
}

// ---- Inline add task row ----
function AddTaskRow({
  listId,
  statusId,
  onCreated,
}: {
  listId: string;
  statusId: string;
  onCreated: () => void;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const router = useRouter();

  async function submit() {
    const t = title.trim();
    if (!t) {
      setActive(false);
      return;
    }
    setTitle("");
    setActive(false);
    await createTask({ list_id: listId, title: t, status_id: statusId });
    router.refresh();
    onCreated();
  }

  if (!active) {
    return (
      <tr>
        <td colSpan={20}>
          <button
            className="flex w-full items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => setActive(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={20} className="px-4 py-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setActive(false); setTitle(""); }
          }}
          onBlur={() => { if (!title.trim()) setActive(false); }}
          placeholder="Task name…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-accent pb-1"
        />
      </td>
    </tr>
  );
}

export function ListViewTable({ listId, tasks, statuses, customFields }: ListViewTableProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Dialogs
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [cfDialogOpen, setCfDialogOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Lazy import TaskDetailModal to avoid circular issues
  const [TaskDetailModal, setTaskDetailModal] = useState<React.ComponentType<{
    taskId: string | null;
    onClose: () => void;
    onChange: () => void;
  }> | null>(null);

  useEffect(() => {
    import("./TaskDetailModal").then((m) => setTaskDetailModal(() => m.TaskDetailModal));
  }, []);

  // Group tasks by status
  const topLevelTasks = useMemo(
    () => tasks.filter((t) => !t.parent_id),
    [tasks]
  );
  const subtaskMap = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (t.parent_id) {
        if (!m[t.parent_id]) m[t.parent_id] = [];
        m[t.parent_id].push(t);
      }
    }
    return m;
  }, [tasks]);

  const groupedByStatus = useMemo(() => {
    const sorted = [...statuses].sort((a, b) => a.order - b.order);
    return sorted.map((s) => ({
      status: s,
      tasks: topLevelTasks.filter((t) => t.status_id === s.id),
    }));
  }, [statuses, topLevelTasks]);

  // Flat ordered list for keyboard navigation
  const flatTaskIds = useMemo(() => {
    const ids: string[] = [];
    for (const { status, tasks: grpTasks } of groupedByStatus) {
      if (collapsed[status.id]) continue;
      for (const t of grpTasks) {
        ids.push(t.id);
        if (expandedSubtasks[t.id]) {
          subtaskMap[t.id]?.forEach((st) => ids.push(st.id));
        }
      }
    }
    return ids;
  }, [groupedByStatus, collapsed, expandedSubtasks, subtaskMap]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onChange() {
    router.refresh();
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        setSelectedIds(new Set());
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIds(new Set(flatTaskIds));
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        // Focus first add input — trigger by clicking the first add row button
        const btn = containerRef.current?.querySelector<HTMLButtonElement>(
          "button[data-add-task]"
        );
        btn?.click();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, flatTaskIds.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === " " && focusedIdx >= 0) {
        e.preventDefault();
        const tid = flatTaskIds[focusedIdx];
        if (tid) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(tid)) { next.delete(tid); } else { next.add(tid); }
            return next;
          });
        }
        return;
      }
      // Priority shortcuts 1-5
      if (["1", "2", "3", "4", "5"].includes(e.key)) {
        const priorityMap: Record<string, TaskPriority> = {
          "1": "urgent", "2": "high", "3": "normal", "4": "low", "5": "none",
        };
        const p = priorityMap[e.key];
        const targets = selectedIds.size > 0
          ? [...selectedIds]
          : focusedIdx >= 0 && flatTaskIds[focusedIdx]
          ? [flatTaskIds[focusedIdx]]
          : [];
        if (targets.length > 0) {
          Promise.all(targets.map((id) => updateTask(id, { priority: p }))).then(() => {
            router.refresh();
          });
        }
      }
    },
    [flatTaskIds, selectedIds, focusedIdx, router]
  );

  function handleSelect(id: string, shift: boolean) {
    if (shift && lastSelectedId) {
      const from = flatTaskIds.indexOf(lastSelectedId);
      const to = flatTaskIds.indexOf(id);
      const [lo, hi] = from < to ? [from, to] : [to, from];
      const range = flatTaskIds.slice(lo, hi + 1);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        range.forEach((tid) => next.add(tid));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        return next;
      });
      setLastSelectedId(id);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const activeId = active.id as string; // "task:${id}"
    const overId = over.id as string;

    const taskId = activeId.replace("task:", "");

    // Drop on group → reassign status
    if (overId.startsWith("group:")) {
      const statusId = overId.replace("group:", "");
      await updateTask(taskId, { status_id: statusId });
      router.refresh();
      return;
    }

    // Drop on task → make subtask (nest)
    if (overId.startsWith("nest:")) {
      const parentId = overId.replace("nest:", "");
      if (parentId !== taskId) {
        await updateTask(taskId, { parent_id: parentId });
        router.refresh();
      }
      return;
    }

    // Same group reorder
    if (overId.startsWith("task:")) {
      const overTaskId = overId.replace("task:", "");
      // Find the group for active task
      const activeTask = tasks.find((t) => t.id === taskId);
      if (!activeTask) return;
      const groupTasks = topLevelTasks.filter((t) => t.status_id === activeTask.status_id);
      const ids = groupTasks.map((t) => t.id);
      const fromIdx = ids.indexOf(taskId);
      const toIdx = ids.indexOf(overTaskId);
      if (fromIdx === -1 || toIdx === -1) return;
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, taskId);
      await reorderTasks(listId, ids);
      router.refresh();
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveTaskId((event.active.id as string).replace("task:", ""));
  }

  const colCount = 9 + customFields.length;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: "none" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {selectedIds.size > 0 && (
            <span className="font-medium text-foreground">{selectedIds.size} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setStatusDialogOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage Statuses
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setCfDialogOpen(true)}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Custom Fields
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <table className="w-full border-collapse text-sm">
            {/* Sticky header */}
            <thead className="sticky top-0 z-20 bg-surface border-b border-border">
              <tr>
                <th className="w-6 px-1" />
                <th className="w-8 px-1" />
                <th className="sticky left-0 z-10 bg-surface min-w-[280px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Title
                </th>
                <th className="w-20 px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Assignees
                </th>
                <th className="w-28 px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Due Date
                </th>
                <th className="w-12 px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Priority
                </th>
                <th className="w-32 px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="w-32 px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Tags
                </th>
                {customFields.map((cf) => (
                  <th key={cf.id} className="w-28 px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                    {cf.name}
                  </th>
                ))}
                <th className="w-16 px-2 py-2" />
              </tr>
            </thead>

            <tbody>
              {groupedByStatus.map(({ status, tasks: grpTasks }) => {
                const isCollapsed = collapsed[status.id];
                const sortableIds = grpTasks.map((t) => `task:${t.id}`);

                return (
                  <SortableContext
                    key={status.id}
                    items={sortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {/* Group header (also a drop target for status reassignment) */}
                    <GroupHeaderRow
                      status={status}
                      count={grpTasks.length}
                      isCollapsed={isCollapsed}
                      colCount={colCount}
                      onToggle={() =>
                        setCollapsed((prev) => ({
                          ...prev,
                          [status.id]: !prev[status.id],
                        }))
                      }
                    />

                    {!isCollapsed && (
                      <>
                        {grpTasks.map((task) => {
                          const children = subtaskMap[task.id] ?? [];
                          const isExpanded = expandedSubtasks[task.id] ?? false;
                          return (
                            <TaskRowGroup
                              key={task.id}
                              task={task}
                              children_={children}
                              isExpanded={isExpanded}
                              statuses={statuses}
                              customFields={customFields}
                              selectedIds={selectedIds}
                              activeTaskId={activeTaskId}
                              onSelect={handleSelect}
                              onOpen={setOpenTaskId}
                              onChange={onChange}
                              onToggleExpand={() =>
                                setExpandedSubtasks((prev) => ({
                                  ...prev,
                                  [task.id]: !prev[task.id],
                                }))
                              }
                            />
                          );
                        })}

                        {/* Inline add (group header above is the empty-state drop target) */}
                        <AddTaskRow
                          listId={listId}
                          statusId={status.id}
                          onCreated={onChange}
                        />
                      </>
                    )}
                  </SortableContext>
                );
              })}
            </tbody>
          </table>
        </DndContext>
      </div>

      {/* Bulk actions */}
      <BulkActionsBar
        selectedIds={[...selectedIds]}
        statuses={statuses}
        listId={listId}
        onClear={() => setSelectedIds(new Set())}
        onChange={onChange}
      />

      {/* Dialogs */}
      <StatusManagerDialog
        listId={listId}
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onChange={onChange}
      />
      <CustomFieldsManagerDialog
        listId={listId}
        open={cfDialogOpen}
        onClose={() => setCfDialogOpen(false)}
        onChange={onChange}
      />

      {/* Task detail modal */}
      {TaskDetailModal && (
        <TaskDetailModal
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onChange={onChange}
        />
      )}
    </div>
  );
}
