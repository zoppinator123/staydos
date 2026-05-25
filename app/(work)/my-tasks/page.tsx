import { Sidebar } from "@/components/work/Sidebar";
import { getMyTasks } from "@/lib/work/actions";
import { TaskTable } from "@/components/work/TaskTable";

export default async function MyTasksPage() {
  const tasks = await getMyTasks();

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <h1 className="text-base font-semibold">My Tasks</h1>
          <p className="text-xs text-zinc-500">
            Tasks assigned to you, sorted by due date.
          </p>
        </header>
        <div className="px-6 py-4">
          <TaskTable listId="" tasks={tasks} showListColumn />
        </div>
      </main>
    </>
  );
}
