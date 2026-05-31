"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Flag } from "lucide-react";
import { updateTask } from "@/lib/work/actions";
import { groupTasksByStatus } from "@/lib/work/grouping";
import { PRIORITY_COLOR, formatDate, isOverdue, avatarFor } from "@/lib/work/display";
import type { Task, Status } from "@/lib/work/types";
import { StatusPill } from "./StatusPill";
import { useTaskDetail } from "./TaskDetailProvider";

interface BoardViewProps {
  tasks: Task[];
  statuses: Status[];
}

function MiniAvatar({ id }: { id: string }) {
  const { letter, hue } = avatarFor(id);
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
      style={{ background: `hsl(${hue},55%,50%)` }}
    >
      {letter}
    </span>
  );
}

function BoardCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-card-hover ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="block w-full text-left text-sm font-medium text-foreground hover:text-accent"
      >
        {task.title}
      </button>

      <div className="mt-2 flex items-center gap-2">
        {/* Drag handle area */}
        <span
          {...listeners}
          {...attributes}
          className="cursor-grab text-[10px] text-muted-foreground/50 select-none active:cursor-grabbing"
          aria-label="Drag task"
        >
          ⠿
        </span>

        {task.priority !== "none" && (
          <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: PRIORITY_COLOR[task.priority] }} />
        )}

        {task.due_date && (
          <span
            className={`text-xs ${
              isOverdue(task.due_date) ? "text-danger font-medium" : "text-muted-foreground"
            }`}
          >
            {formatDate(task.due_date)}
          </span>
        )}

        {task.assignee_ids.length > 0 && (
          <div className="ml-auto flex -space-x-1">
            {task.assignee_ids.slice(0, 3).map((id) => (
              <MiniAvatar key={id} id={id} />
            ))}
            {task.assignee_ids.length > 3 && (
              <span className="text-[10px] text-muted-foreground ml-1.5 self-center">
                +{task.assignee_ids.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  tasks,
  onOpen,
}: {
  status: Status;
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${status.id}` });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <StatusPill status={status} size="sm" />
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-xl p-2 transition-colors ${
          isOver ? "bg-accent-soft" : "bg-muted/40"
        }`}
      >
        {tasks.map((task) => (
          <BoardCard key={task.id} task={task} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tasks</p>
        )}
      </div>
    </div>
  );
}

export function BoardView({ tasks, statuses }: BoardViewProps) {
  const router = useRouter();
  const { openTask } = useTaskDetail();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columns = useMemo(() => groupTasksByStatus(tasks, statuses), [tasks, statuses]);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = (active.id as string).replace("task:", "");
    const overId = over.id as string;
    if (overId.startsWith("group:")) {
      const statusId = overId.replace("group:", "");
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status_id === statusId) return;
      await updateTask(taskId, { status_id: statusId });
      router.refresh();
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {columns.map(({ status, tasks: colTasks }) => (
          <BoardColumn key={status.id} status={status} tasks={colTasks} onOpen={openTask} />
        ))}
      </div>
    </DndContext>
  );
}
