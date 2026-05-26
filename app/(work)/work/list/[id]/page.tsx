import { notFound } from "next/navigation";
import { Sidebar } from "@/components/work/Sidebar";
import { getList, getStatuses, getTasks } from "@/lib/work/actions";
import { ListTaskView } from "@/components/work/ListTaskView";
import { ListHeader } from "@/components/work/ListHeader";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();

  const [statuses, tasks] = await Promise.all([getStatuses(list.id), getTasks(list.id)]);

  return (
    <>
      <Sidebar activeListId={list.id} activeSpaceId={list.space_id ?? undefined} />
      <main className="flex-1 overflow-y-auto">
        <ListHeader list={list} />
        <div className="px-6 py-4">
          <ListTaskView listId={list.id} tasks={tasks} statuses={statuses} />
        </div>
      </main>
    </>
  );
}
