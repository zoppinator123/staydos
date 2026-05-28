import { queryTasks } from "@/lib/work/actions";
import { AllTasksView } from "@/components/work/AllTasksView";
import type { TaskPriority, TaskStatusCategory } from "@/lib/work/types";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(val: string | string[] | undefined): string {
  if (!val) return "";
  return Array.isArray(val) ? val[0] : val;
}

function getStringArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  const str = Array.isArray(val) ? val[0] : val;
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function AllTasksPage({ searchParams }: Props) {
  const params = await searchParams;

  const search = getString(params.search);
  const statusStr = getStringArray(params.statuses);
  const priorityStr = getStringArray(params.priorities);
  const assigneeIds = getStringArray(params.assignee_ids);
  const listIds = getStringArray(params.list_ids);
  const spaceIds = getStringArray(params.space_ids);
  const includeArchived = getString(params.include_archived) === "true";
  const includeCompleted = getString(params.include_completed) === "true";
  const page = Math.max(1, parseInt(getString(params.page) || "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(getString(params.page_size) || "50", 10)));

  const statuses = statusStr as TaskStatusCategory[];
  const priorities = priorityStr as TaskPriority[];

  const data = await queryTasks({
    filter: {
      search: search || undefined,
      status_categories: statuses.length ? statuses : undefined,
      priorities: priorities.length ? priorities : undefined,
      assignee_ids: assigneeIds.length ? assigneeIds : undefined,
      list_ids: listIds.length ? listIds : undefined,
      space_ids: spaceIds.length ? spaceIds : undefined,
      include_archived: includeArchived,
      include_completed: includeCompleted,
    },
    sort: [{ field: "updated_at", direction: "desc" }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return (
    <AllTasksView
      initialData={data}
      initialSearch={search}
      initialStatuses={statuses}
      initialPriorities={priorities}
      page={page}
      pageSize={pageSize}
    />
  );
}
