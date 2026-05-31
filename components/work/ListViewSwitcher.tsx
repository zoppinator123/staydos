"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { List as ListIcon, Columns3, Calendar as CalendarIcon } from "lucide-react";
import type { Task, Status, CustomFieldDef } from "@/lib/work/types";
import { TaskDetailProvider } from "./TaskDetailProvider";
import { ListViewTable } from "./ListViewTable";
import { BoardView } from "./BoardView";
import { CalendarView } from "./CalendarView";

interface ListViewSwitcherProps {
  listId: string;
  tasks: Task[];
  statuses: Status[];
  customFields: CustomFieldDef[];
}

type ViewMode = "list" | "board" | "calendar";

const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "list", label: "List", icon: <ListIcon size={14} /> },
  { id: "board", label: "Board", icon: <Columns3 size={14} /> },
  { id: "calendar", label: "Calendar", icon: <CalendarIcon size={14} /> },
];

export function ListViewSwitcher({
  listId,
  tasks,
  statuses,
  customFields,
}: ListViewSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("view");
  const view: ViewMode = raw === "board" || raw === "calendar" ? raw : "list";

  function setView(next: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <TaskDetailProvider>
      <div className="flex h-full flex-col">
        {/* View switcher */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 py-2">
          {VIEWS.map((v) => {
            const active = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent-soft text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                {v.icon}
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Active view */}
        <div className="flex-1 overflow-auto">
          {view === "list" && (
            <ListViewTable
              listId={listId}
              tasks={tasks}
              statuses={statuses}
              customFields={customFields}
            />
          )}
          {view === "board" && <BoardView tasks={tasks} statuses={statuses} />}
          {view === "calendar" && <CalendarView tasks={tasks} statuses={statuses} />}
        </div>
      </div>
    </TaskDetailProvider>
  );
}
