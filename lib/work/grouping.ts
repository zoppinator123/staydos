import type { Status } from "./types";

/** Minimal shape needed for grouping — satisfied by Task and TaskWithMeta. */
interface GroupableTask {
  status_id: string | null;
  parent_id: string | null;
}

export interface StatusGroup<T> {
  status: Status;
  tasks: T[];
}

/** Top-level (non-subtask) tasks only. */
export function getTopLevelTasks<T extends GroupableTask>(tasks: T[]): T[] {
  return tasks.filter((t) => !t.parent_id);
}

/** Map of parent task id → its subtasks. */
export function buildSubtaskMap<T extends GroupableTask & { parent_id: string | null }>(
  tasks: T[]
): Record<string, T[]> {
  const m: Record<string, T[]> = {};
  for (const t of tasks) {
    if (t.parent_id) {
      (m[t.parent_id] ??= []).push(t);
    }
  }
  return m;
}

/**
 * Group top-level tasks by status, ordered by Status.order. Used by both the
 * list view and the board view so the grouping logic lives in one place.
 */
export function groupTasksByStatus<T extends GroupableTask>(
  tasks: T[],
  statuses: Status[]
): StatusGroup<T>[] {
  const topLevel = getTopLevelTasks(tasks);
  const sorted = [...statuses].sort((a, b) => a.order - b.order);
  return sorted.map((s) => ({
    status: s,
    tasks: topLevel.filter((t) => t.status_id === s.id),
  }));
}
