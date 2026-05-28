"use client";

import { Circle, Loader, CheckCircle, XCircle } from "lucide-react";
import type { Status, TaskStatusCategory } from "@/lib/work/types";

interface StatusPillProps {
  status: Status;
  size?: "sm" | "md";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function CategoryIcon({ category, size }: { category: TaskStatusCategory; size: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  switch (category) {
    case "todo":
      return <Circle className={cls} />;
    case "in_progress":
      return <Loader className={cls} />;
    case "done":
      return <CheckCircle className={cls} />;
    case "closed":
      return <XCircle className={cls} />;
    default:
      return <Circle className={cls} />;
  }
}

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  const rgb = hexToRgb(status.color);
  const bg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)` : "rgba(0,0,0,0.08)";
  const fg = status.color;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-[11px] font-medium uppercase tracking-wider select-none"
      style={{ backgroundColor: bg, color: fg }}
    >
      <CategoryIcon category={status.category} size={size} />
      {status.name}
    </span>
  );
}
