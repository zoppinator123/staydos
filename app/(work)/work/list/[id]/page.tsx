import { notFound } from "next/navigation";
import {
  getList,
  getStatuses,
  queryTasks,
  getCustomFields,
} from "@/lib/work/actions";
// NOTE: ListViewTable is owned by the other subagent.
// We import the stub here; the other subagent will replace it with the full implementation.
import { ListViewTable } from "@/components/work/ListViewTable";
import { ListHeaderActions } from "@/components/work/ListHeaderActions";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();

  const [statuses, { tasks }, customFields] = await Promise.all([
    getStatuses(list.id),
    queryTasks({
      filter: { list_ids: [list.id] },
      sort: [{ field: "order", direction: "asc" }],
      limit: 500,
    }),
    getCustomFields(list.id),
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* List header */}
      <header className="border-b border-border px-6 py-4 bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">{list.name}</h1>
            {list.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{list.description}</p>
            )}
          </div>
          <span className="inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-medium border border-border text-muted-foreground">
            {list.type}
          </span>
          <ListHeaderActions list={list} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </p>
      </header>

      {/* Task table — ListViewTable owned by other subagent */}
      <div className="flex-1 overflow-auto">
        <ListViewTable
          listId={list.id}
          tasks={tasks}
          statuses={statuses}
          customFields={customFields}
        />
      </div>
    </div>
  );
}
