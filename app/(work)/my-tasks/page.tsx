import { ensurePersonalList, queryTasks } from "@/lib/work/actions";

export default async function MyTasksPage() {
  // Get or create the user's personal private list
  let listId: string | null = null;
  try {
    listId = await ensurePersonalList();
  } catch {
    // If ensure_personal_list RPC isn't available yet, fall back gracefully
  }

  const data = listId
    ? await queryTasks({
        filter: { list_ids: [listId], include_completed: false },
        sort: [
          { field: "due_date", direction: "asc" },
          { field: "priority", direction: "asc" },
        ],
        limit: 200,
      })
    : { tasks: [], total: 0, has_more: false };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 bg-surface shrink-0">
        <h1 className="font-display text-lg font-bold text-foreground">My Tasks</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your personal task list — private to you.{" "}
          <span className="font-medium text-foreground">{data.total}</span>{" "}
          task{data.total !== 1 ? "s" : ""}
        </p>
      </header>

      {/* Task list */}
      <div className="flex-1 overflow-auto">
        {data.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft mx-auto">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-accent"
                aria-hidden
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">{"You're all caught up!"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add tasks to your personal list to track them here.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-2.5 w-8" />
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Task
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Priority
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((task) => {
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                const now = new Date();
                const isOverdue = dueDate && dueDate < now;
                return (
                  <tr
                    key={task.id}
                    className="border-b border-border hover:bg-surface-alt/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={!!task.completed_at}
                        readOnly
                        className="rounded accent-accent"
                        aria-label={`Toggle ${task.title}`}
                      />
                    </td>
                    <td className="px-2 py-2.5 max-w-xs">
                      <span className="text-sm text-foreground line-clamp-1">{task.title}</span>
                      {task.status_name && (
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: task.status_color ?? "#9ca3af" }}
                        >
                          {task.status_name}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-medium bg-surface-alt ${
                          task.priority === "urgent"
                            ? "text-danger"
                            : task.priority === "high"
                              ? "text-warning"
                              : "text-muted-foreground"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td
                      className={`px-2 py-2.5 text-xs whitespace-nowrap hidden md:table-cell ${
                        isOverdue ? "text-danger font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {dueDate ? dueDate.toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
