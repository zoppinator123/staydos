import type { TaskPriority, TaskStatusCategory } from "@/lib/work/types";

const PRIORITY_STYLE: Record<TaskPriority, { dot: string; label: string }> = {
  urgent: { dot: "bg-red-500", label: "Urgent" },
  high: { dot: "bg-orange-500", label: "High" },
  normal: { dot: "bg-blue-500", label: "Normal" },
  low: { dot: "bg-zinc-400", label: "Low" },
  none: { dot: "bg-transparent ring-1 ring-zinc-300", label: "None" },
};

export function PriorityBadge({ value }: { value: TaskPriority }) {
  const s = PRIORITY_STYLE[value];
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function StatusBadge({
  name,
  color,
  category,
}: {
  name: string | null;
  color: string | null;
  category: TaskStatusCategory | null;
}) {
  if (!name) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        No status
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ color: color ?? "#3f3f46" }}
      title={category ?? ""}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color ?? "#a1a1aa" }}
      />
      {name}
    </span>
  );
}

export function Tag({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {value}
    </span>
  );
}
