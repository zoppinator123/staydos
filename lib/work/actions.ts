"use server";

import { revalidatePath } from "next/cache";
import { db, currentUserId, nextOrder, logActivity } from "./shared";
import { nextOccurrence, isValidRecurrenceRule } from "./recurrence";
import { requireListAccess } from "./permissions";
import type {
  CreateAttachmentInput,
  CreateChecklistInput,
  CreateChecklistItemInput,
  CreateCommentInput,
  CreateCustomFieldInput,
  CreateFolderInput,
  CreateListInput,
  CreateSpaceInput,
  CreateStatusInput,
  CreateTaskInput,
  Folder,
  List,
  PaginatedTasks,
  Space,
  Status,
  Task,
  TaskQuery,
  TaskWithMeta,
  UpdateChecklistItemInput,
  UpdateCommentInput,
  UpdateFolderInput,
  UpdateListInput,
  UpdateSpaceInput,
  UpdateStatusInput,
  UpdateTaskInput,
} from "./types";

// ==================== SPACES ====================

export async function getSpaces(opts?: { includeArchived?: boolean }): Promise<Space[]> {
  const sb = await db();
  let q = sb.from("spaces").select("*").order("order");
  if (!opts?.includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getSpace(id: string): Promise<Space | null> {
  const sb = await db();
  const { data, error } = await sb.from("spaces").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSpace(input: CreateSpaceInput): Promise<Space> {
  const sb = await db();
  const userId = await currentUserId();
  const order = await nextOrder("spaces", {});

  const { data, error } = await sb
    .from("spaces")
    .insert({
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      icon: input.icon ?? "folder",
      privacy: input.privacy ?? "private",
      order,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  // Creator becomes admin
  await sb.from("space_members").upsert(
    {
      space_id: data.id,
      profile_id: userId,
      role: "admin",
    },
    { onConflict: "space_id,profile_id" }
  );

  revalidatePath("/work");
  return data;
}

export async function updateSpace(id: string, input: UpdateSpaceInput): Promise<Space> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb.from("spaces").update(input).eq("id", id).select().single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function archiveSpace(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("spaces")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function unarchiveSpace(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("spaces").update({ archived_at: null }).eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function deleteSpace(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("spaces").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function reorderSpaces(orderedIds: string[]): Promise<void> {
  const sb = await db();
  await currentUserId();
  await Promise.all(
    orderedIds.map((id, idx) => sb.from("spaces").update({ order: idx }).eq("id", id))
  );
  revalidatePath("/work");
}

// ==================== FOLDERS ====================

export async function getFolders(spaceId: string): Promise<Folder[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("folders")
    .select("*")
    .eq("space_id", spaceId)
    .is("archived_at", null)
    .order("order");
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const sb = await db();
  const userId = await currentUserId();
  const order = await nextOrder("folders", { space_id: input.space_id });
  const { data, error } = await sb
    .from("folders")
    .insert({
      space_id: input.space_id,
      name: input.name,
      order,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function updateFolder(id: string, input: UpdateFolderInput): Promise<Folder> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb.from("folders").update(input).eq("id", id).select().single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function archiveFolder(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("folders")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function deleteFolder(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("folders").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function reorderFolders(spaceId: string, orderedIds: string[]): Promise<void> {
  const sb = await db();
  await currentUserId();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb.from("folders").update({ order: idx }).eq("id", id).eq("space_id", spaceId)
    )
  );
  revalidatePath("/work");
}

// ==================== LISTS ====================

const DEFAULT_STATUSES: Array<{
  name: string;
  color: string;
  category: "todo" | "in_progress" | "done" | "closed";
}> = [
  { name: "To Do", color: "#9ca3af", category: "todo" },
  { name: "In Progress", color: "#3b82f6", category: "in_progress" },
  { name: "Done", color: "#22c55e", category: "done" },
  { name: "Closed", color: "#64748b", category: "closed" },
];

export async function getLists(opts?: {
  spaceId?: string;
  folderId?: string;
  personalOwnerId?: string;
}): Promise<List[]> {
  const sb = await db();
  let q = sb.from("lists").select("*").is("archived_at", null).order("order");
  if (opts?.spaceId) q = q.eq("space_id", opts.spaceId);
  if (opts?.folderId) q = q.eq("folder_id", opts.folderId);
  if (opts?.personalOwnerId) q = q.eq("personal_owner_id", opts.personalOwnerId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getList(id: string): Promise<List | null> {
  const sb = await db();
  const { data, error } = await sb.from("lists").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createList(input: CreateListInput): Promise<List> {
  const sb = await db();
  const userId = await currentUserId();

  const order = await nextOrder("lists", {
    space_id: input.space_id ?? null,
    folder_id: input.folder_id ?? null,
  });

  const { data, error } = await sb
    .from("lists")
    .insert({
      space_id: input.space_id ?? null,
      folder_id: input.folder_id ?? null,
      personal_owner_id: input.personal_owner_id ?? null,
      name: input.name,
      description: input.description ?? null,
      type: input.type ?? "shared",
      order,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  // Seed default statuses
  await sb.from("statuses").insert(
    DEFAULT_STATUSES.map((s, idx) => ({
      list_id: data.id,
      name: s.name,
      color: s.color,
      category: s.category,
      order: idx,
    }))
  );

  // Creator is list owner with admin access
  await sb.from("list_members").upsert(
    {
      list_id: data.id,
      profile_id: userId,
      role: "owner",
      access_level: "admin",
    },
    { onConflict: "list_id,profile_id" }
  );

  revalidatePath("/work");
  return data;
}

export async function updateList(id: string, input: UpdateListInput): Promise<List> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb.from("lists").update(input).eq("id", id).select().single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function archiveList(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("lists")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function deleteList(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("lists").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function reorderLists(
  scope: { spaceId?: string | null; folderId?: string | null },
  orderedIds: string[]
): Promise<void> {
  const sb = await db();
  await currentUserId();
  await Promise.all(
    orderedIds.map((id, idx) => sb.from("lists").update({ order: idx }).eq("id", id))
  );
  // scope param kept for future per-scope authorization
  void scope;
  revalidatePath("/work");
}

// ==================== STATUSES ====================

export async function getStatuses(listId: string): Promise<Status[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("statuses")
    .select("*")
    .eq("list_id", listId)
    .order("order");
  if (error) throw error;
  return data ?? [];
}

export async function createStatus(input: CreateStatusInput): Promise<Status> {
  const sb = await db();
  await requireListAccess(input.list_id, "admin");
  const order = await nextOrder("statuses", { list_id: input.list_id });
  const { data, error } = await sb
    .from("statuses")
    .insert({ ...input, order })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function updateStatus(id: string, input: UpdateStatusInput): Promise<Status> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb.from("statuses").update(input).eq("id", id).select().single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function deleteStatus(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("statuses").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function reorderStatuses(listId: string, orderedIds: string[]): Promise<void> {
  const sb = await db();
  await currentUserId();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb.from("statuses").update({ order: idx }).eq("id", id).eq("list_id", listId)
    )
  );
  revalidatePath("/work");
}

// ==================== TASKS ====================

export async function getTasks(listId: string): Promise<Task[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .eq("list_id", listId)
    .is("archived_at", null)
    .order("order");
  if (error) throw error;
  return data ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const sb = await db();
  const { data, error } = await sb.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const sb = await db();
  const userId = await currentUserId();
  await requireListAccess(input.list_id, "editor");

  // Default status to the first 'todo' status on the list if not provided.
  let statusId = input.status_id ?? null;
  if (!statusId) {
    const { data: st } = await sb
      .from("statuses")
      .select("id")
      .eq("list_id", input.list_id)
      .eq("category", "todo")
      .order("order")
      .limit(1)
      .maybeSingle();
    statusId = st?.id ?? null;
  }

  if (input.recurrence_rule && !isValidRecurrenceRule(input.recurrence_rule)) {
    throw new Error("Invalid recurrence_rule");
  }

  const order = await nextOrder("tasks", { list_id: input.list_id });

  const { data, error } = await sb
    .from("tasks")
    .insert({
      list_id: input.list_id,
      status_id: statusId,
      parent_id: input.parent_id ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "normal",
      due_date: input.due_date ?? null,
      start_date: input.start_date ?? null,
      time_estimate: input.time_estimate ?? null,
      order,
      custom_fields: input.custom_fields ?? {},
      assignee_ids: input.assignee_ids ?? [],
      tags: input.tags ?? [],
      recurrence_rule: input.recurrence_rule ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    task_id: data.id,
    actor_id: userId,
    action: "created",
    to_value: { title: data.title },
  });

  revalidatePath("/work");
  return data;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const sb = await db();
  const userId = await currentUserId();

  // Load current task for access check + activity diff
  const { data: prev, error: prevErr } = await sb
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (prevErr) throw prevErr;
  await requireListAccess(prev.list_id, "editor");

  if (input.recurrence_rule && !isValidRecurrenceRule(input.recurrence_rule)) {
    throw new Error("Invalid recurrence_rule");
  }

  const { data, error } = await sb.from("tasks").update(input).eq("id", id).select().single();
  if (error) throw error;

  // Diff & log
  const tracked: (keyof UpdateTaskInput)[] = [
    "title",
    "description",
    "status_id",
    "priority",
    "due_date",
    "start_date",
    "assignee_ids",
    "tags",
    "list_id",
  ];
  for (const k of tracked) {
    if (k in input) {
      const before = (prev as Record<string, unknown>)[k];
      const after = (data as Record<string, unknown>)[k];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await logActivity({
          task_id: id,
          actor_id: userId,
          action: `updated_${k}`,
          from_value: { [k]: before },
          to_value: { [k]: after },
        });
      }
    }
  }

  revalidatePath("/work");
  return data;
}

/**
 * Mark a task complete. If the task has a recurrence rule, spawn the next
 * occurrence by cloning the task with the next due_date.
 */
export async function completeTask(id: string): Promise<Task> {
  const sb = await db();
  const userId = await currentUserId();

  const { data: task, error: tErr } = await sb.from("tasks").select("*").eq("id", id).single();
  if (tErr) throw tErr;
  await requireListAccess(task.list_id, "editor");

  const now = new Date().toISOString();

  // Find a 'done' status on the list to set
  const { data: doneStatus } = await sb
    .from("statuses")
    .select("id")
    .eq("list_id", task.list_id)
    .eq("category", "done")
    .order("order")
    .limit(1)
    .maybeSingle();

  const { data: updated, error: uErr } = await sb
    .from("tasks")
    .update({
      completed_at: now,
      status_id: doneStatus?.id ?? task.status_id,
    })
    .eq("id", id)
    .select()
    .single();
  if (uErr) throw uErr;

  await logActivity({
    task_id: id,
    actor_id: userId,
    action: "completed",
    to_value: { completed_at: now },
  });

  // Spawn next occurrence if recurring.
  if (task.recurrence_rule && task.due_date) {
    const next = nextOccurrence(
      task.recurrence_rule,
      new Date(task.due_date),
      (task.recurrence_count ?? 0) + 1
    );
    if (next) {
      const { data: spawned } = await sb
        .from("tasks")
        .insert({
          list_id: task.list_id,
          status_id: null,
          parent_id: task.parent_id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: next.toISOString(),
          start_date: task.start_date,
          time_estimate: task.time_estimate,
          order: task.order,
          custom_fields: task.custom_fields,
          assignee_ids: task.assignee_ids,
          tags: task.tags,
          recurrence_rule: task.recurrence_rule,
          recurrence_count: (task.recurrence_count ?? 0) + 1,
          created_by: userId,
        })
        .select()
        .single();

      if (spawned) {
        await logActivity({
          task_id: spawned.id,
          actor_id: userId,
          action: "recurrence_spawned",
          metadata: { source_task_id: id },
        });
      }
    }
  }

  revalidatePath("/work");
  return updated;
}

export async function uncompleteTask(id: string): Promise<Task> {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("tasks")
    .update({ completed_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ task_id: id, actor_id: userId, action: "uncompleted" });
  revalidatePath("/work");
  return data;
}

export async function archiveTask(id: string): Promise<void> {
  const sb = await db();
  const userId = await currentUserId();
  const { error } = await sb
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logActivity({ task_id: id, actor_id: userId, action: "archived" });
  revalidatePath("/work");
}

export async function deleteTask(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function reorderTasks(listId: string, orderedIds: string[]): Promise<void> {
  const sb = await db();
  await currentUserId();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb.from("tasks").update({ order: idx }).eq("id", id).eq("list_id", listId)
    )
  );
  revalidatePath("/work");
}

/**
 * Move a task to a different list (and optional status).
 */
export async function moveTask(
  id: string,
  toListId: string,
  toStatusId?: string | null
): Promise<Task> {
  const sb = await db();
  const userId = await currentUserId();
  await requireListAccess(toListId, "editor");
  const order = await nextOrder("tasks", { list_id: toListId });
  const { data, error } = await sb
    .from("tasks")
    .update({ list_id: toListId, status_id: toStatusId ?? null, order })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    task_id: id,
    actor_id: userId,
    action: "moved",
    to_value: { list_id: toListId, status_id: toStatusId ?? null },
  });
  revalidatePath("/work");
  return data;
}

// ==================== GLOBAL TASK QUERY ====================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
  none: 4,
};

export async function queryTasks(query: TaskQuery = {}): Promise<PaginatedTasks> {
  const sb = await db();
  await currentUserId();
  const f = query.filter ?? {};

  let q = sb.from("tasks_with_meta").select("*", { count: "exact" });

  if (!f.include_archived) q = q.is("archived_at", null);
  if (!f.include_completed) q = q.is("completed_at", null);
  if (f.list_ids && f.list_ids.length) q = q.in("list_id", f.list_ids);
  if (f.space_ids && f.space_ids.length) q = q.in("list_space_id", f.space_ids);
  if (f.status_categories && f.status_categories.length)
    q = q.in("status_category", f.status_categories);
  if (f.priorities && f.priorities.length) q = q.in("priority", f.priorities);
  if (f.assignee_ids && f.assignee_ids.length) q = q.overlaps("assignee_ids", f.assignee_ids);
  if (f.tags && f.tags.length) q = q.overlaps("tags", f.tags);
  if (f.due_before) q = q.lte("due_date", f.due_before);
  if (f.due_after) q = q.gte("due_date", f.due_after);
  if (f.created_by) q = q.eq("created_by", f.created_by);
  if (f.search) q = q.ilike("title", `%${f.search}%`);

  const sorts = query.sort ?? [{ field: "order", direction: "asc" as const }];
  for (const s of sorts) {
    q = q.order(s.field, { ascending: s.direction === "asc" });
  }

  const limit = Math.min(query.limit ?? 100, 500);
  const offset = query.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;

  const tasks = (data ?? []) as TaskWithMeta[];

  // Priority sort needs custom ordering when requested
  const priIdx = sorts.findIndex((s) => s.field === "priority");
  if (priIdx >= 0) {
    const dir = sorts[priIdx].direction === "asc" ? 1 : -1;
    tasks.sort((a, b) => dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]));
  }

  return {
    tasks,
    total: count ?? tasks.length,
    has_more: (count ?? 0) > offset + tasks.length,
  };
}

export async function getMyTasks(): Promise<TaskWithMeta[]> {
  const userId = await currentUserId();
  const { tasks } = await queryTasks({
    filter: { assignee_ids: [userId] },
    sort: [
      { field: "due_date", direction: "asc" },
      { field: "priority", direction: "asc" },
    ],
    limit: 200,
  });
  return tasks;
}

// ==================== CUSTOM FIELDS ====================

export async function getCustomFields(listId: string) {
  const sb = await db();
  const { data, error } = await sb
    .from("custom_field_defs")
    .select("*")
    .eq("list_id", listId)
    .order("order");
  if (error) throw error;
  return data ?? [];
}

export async function createCustomField(input: CreateCustomFieldInput) {
  const sb = await db();
  await requireListAccess(input.list_id, "admin");
  const order = await nextOrder("custom_field_defs", { list_id: input.list_id });
  const { data, error } = await sb
    .from("custom_field_defs")
    .insert({
      list_id: input.list_id,
      name: input.name,
      field_type: input.field_type,
      config: input.config ?? {},
      order,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function deleteCustomField(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("custom_field_defs").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function setTaskCustomField(
  taskId: string,
  fieldId: string,
  value: unknown
): Promise<Task> {
  const sb = await db();
  const userId = await currentUserId();
  const { data: t, error: e1 } = await sb
    .from("tasks")
    .select("custom_fields, list_id")
    .eq("id", taskId)
    .single();
  if (e1) throw e1;
  const updated = { ...(t.custom_fields ?? {}), [fieldId]: value };
  const { data, error } = await sb
    .from("tasks")
    .update({ custom_fields: updated })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    task_id: taskId,
    actor_id: userId,
    action: "updated_custom_field",
    to_value: { field_id: fieldId, value },
  });
  revalidatePath("/work");
  return data;
}

// ==================== CHECKLISTS ====================

export async function getChecklists(taskId: string) {
  const sb = await db();
  const { data: lists, error } = await sb
    .from("checklists")
    .select("*")
    .eq("task_id", taskId)
    .order("order");
  if (error) throw error;
  if (!lists || lists.length === 0) return [];

  const ids = lists.map((l) => l.id);
  const { data: items } = await sb
    .from("checklist_items")
    .select("*")
    .in("checklist_id", ids)
    .order("order");

  type CL = (typeof lists)[number] & { items: NonNullable<typeof items> };
  return lists.map(
    (l) =>
      ({
        ...l,
        items: (items ?? []).filter((i) => i.checklist_id === l.id),
      }) as CL
  );
}

export async function createChecklist(input: CreateChecklistInput) {
  const sb = await db();
  await currentUserId();
  const order = await nextOrder("checklists", { task_id: input.task_id });
  const { data, error } = await sb
    .from("checklists")
    .insert({ task_id: input.task_id, name: input.name, order })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function deleteChecklist(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("checklists").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function renameChecklist(id: string, name: string) {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb
    .from("checklists")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function createChecklistItem(input: CreateChecklistItemInput) {
  const sb = await db();
  await currentUserId();
  const order = await nextOrder("checklist_items", { checklist_id: input.checklist_id });
  const { data, error } = await sb
    .from("checklist_items")
    .insert({
      checklist_id: input.checklist_id,
      content: input.content,
      assignee_id: input.assignee_id ?? null,
      order,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function updateChecklistItem(id: string, input: UpdateChecklistItemInput) {
  const sb = await db();
  await currentUserId();
  const patch: UpdateChecklistItemInput & { completed_at?: string | null } = { ...input };
  if (input.completed === true) patch.completed_at = new Date().toISOString();
  if (input.completed === false) patch.completed_at = null;
  const { data, error } = await sb
    .from("checklist_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("checklist_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

export async function reorderChecklistItems(
  checklistId: string,
  orderedIds: string[]
): Promise<void> {
  const sb = await db();
  await currentUserId();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb
        .from("checklist_items")
        .update({ order: idx })
        .eq("id", id)
        .eq("checklist_id", checklistId)
    )
  );
  revalidatePath("/work");
}

// ==================== COMMENTS ====================

export async function getComments(taskId: string) {
  const sb = await db();
  const { data, error } = await sb
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createComment(input: CreateCommentInput) {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("comments")
    .insert({ task_id: input.task_id, author_id: userId, body: input.body })
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    task_id: input.task_id,
    actor_id: userId,
    action: "commented",
    to_value: { comment_id: data.id },
  });
  revalidatePath("/work");
  return data;
}

export async function updateComment(id: string, input: UpdateCommentInput) {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("comments")
    .update({ body: input.body })
    .eq("id", id)
    .eq("author_id", userId)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  const sb = await db();
  const userId = await currentUserId();
  const { error } = await sb.from("comments").delete().eq("id", id).eq("author_id", userId);
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== ACTIVITY ====================

export async function getTaskActivity(taskId: string, limit = 100) {
  const sb = await db();
  const { data, error } = await sb
    .from("task_activity")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ==================== ATTACHMENTS ====================

export async function getAttachments(taskId: string) {
  const sb = await db();
  const { data, error } = await sb
    .from("attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAttachment(input: CreateAttachmentInput) {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("attachments")
    .insert({
      task_id: input.task_id,
      file_name: input.file_name,
      file_url: input.file_url,
      file_size: input.file_size ?? null,
      mime_type: input.mime_type ?? null,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    task_id: input.task_id,
    actor_id: userId,
    action: "attachment_added",
    to_value: { attachment_id: data.id, file_name: data.file_name },
  });
  revalidatePath("/work");
  return data;
}

export async function deleteAttachment(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.from("attachments").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/work");
}

// Permission actions live in ./permissions and should be imported directly
// (re-exports are not allowed in "use server" files).
