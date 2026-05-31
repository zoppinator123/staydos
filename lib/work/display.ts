import type { TaskPriority } from "./types";

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#3b82f6",
  low: "#a1a1aa",
  none: "#d4d4d8",
};

/** Short "Jun 3" style date. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(iso)
  );
}

/** True when the date is strictly before today (date-only comparison). */
export function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date(new Date().toDateString());
}

/** Deterministic small avatar descriptor (letter + hue) for an id. */
export function avatarFor(id: string): { letter: string; hue: number } {
  const letter = id[0]?.toUpperCase() ?? "?";
  const hue = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return { letter, hue };
}
