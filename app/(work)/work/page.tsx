import { Sidebar } from "@/components/work/Sidebar";
import { queryTasks } from "@/lib/work/actions";
import { TaskTable } from "@/components/work/TaskTable";

export default async function WorkHomePage() {
  const { tasks, total } = await queryTasks({
    sort: [
      { field: "due_date", direction: "asc" },
      { field: "priority", direction: "asc" },
    ],
    limit: 100,
  });

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <h1 className="text-base font-semibold">All Work</h1>
          <p className="text-xs text-zinc-500">{total} tasks across all spaces</p>
        </header>
        <div className="px-6 py-4">
          <TaskTable listId="" tasks={tasks} showListColumn />
        </div>
      </main>
    </>
  );
}
