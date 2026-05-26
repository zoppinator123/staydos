"use client";

import { useRef, useState } from "react";
import type { Status, Task } from "@/lib/work/types";
import { TaskTable } from "./TaskTable";
import { NewTaskRow } from "./NewTaskRow";

interface Props {
  listId: string;
  tasks: Task[];
  statuses: Status[];
}

/**
 * Client wrapper that owns the refs for keyboard shortcuts:
 * - 'c' → focuses the NewTaskRow input
 * - '/' → focuses the filter search input in TaskFilterBar
 */
export function ListTaskView({ listId, tasks, statuses }: Props) {
  const newTaskRef = useRef<HTMLInputElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  return (
    <>
      <TaskTable
        listId={listId}
        tasks={localTasks}
        statuses={statuses}
        showKanbanToggle
        emptyMessage="This list has no tasks yet."
        newTaskInputRef={newTaskRef}
        filterInputRef={filterRef}
      />
      <NewTaskRow
        ref={newTaskRef}
        listId={listId}
        onCreated={(t) => setLocalTasks((cur) => [...cur, t])}
      />
    </>
  );
}
