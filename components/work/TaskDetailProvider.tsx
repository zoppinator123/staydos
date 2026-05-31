"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface TaskDetailValue {
  openTask: (id: string) => void;
  closeTask: () => void;
  openTaskId: string | null;
}

const TaskDetailContext = createContext<TaskDetailValue | null>(null);

/**
 * Owns the single, lazily-loaded task detail slide-over so List, Board, and
 * Calendar views can all open task details without duplicating the dynamic
 * import. Wrap a view subtree in this provider and call `useTaskDetail()`.
 */
export function TaskDetailProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Lazy import the (large) detail component on mount.
  const [TaskDetailModal, setTaskDetailModal] = useState<React.ComponentType<{
    taskId: string | null;
    onClose: () => void;
    onChange: () => void;
  }> | null>(null);

  useEffect(() => {
    import("./TaskDetailModal").then((m) => setTaskDetailModal(() => m.TaskDetailModal));
  }, []);

  const openTask = useCallback((id: string) => setOpenTaskId(id), []);
  const closeTask = useCallback(() => setOpenTaskId(null), []);

  return (
    <TaskDetailContext.Provider value={{ openTask, closeTask, openTaskId }}>
      {children}
      {TaskDetailModal && (
        <TaskDetailModal
          taskId={openTaskId}
          onClose={closeTask}
          onChange={() => router.refresh()}
        />
      )}
    </TaskDetailContext.Provider>
  );
}

export function useTaskDetail(): TaskDetailValue {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) throw new Error("useTaskDetail must be used within a TaskDetailProvider");
  return ctx;
}
