"use server";

import { revalidatePath } from "next/cache";
import { db, admin, currentUserId, nextOrder, logActivity } from "./shared";
import { nextOccurrence, isValidRecurrenceRule } from "./recurrence";
import { requireListAccess } from "./permissions";
import type {
  Comment,
  CommentWithAuthor,
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
  DashboardSummary,
  Folder,
  List,
  MentionableUser,
  NotificationWithMeta,
  PaginatedTasks,
  Space,
  Status,
  Task,
  TaskActivityEntry,
  TaskQuery,
  TaskWithMeta,
  TimeEntry,
  TimeEntryWithUser,
  WatcherWithUser,
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

const CATEGORY_PRIORITY: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  closed: 3,
};

export async function getStatuses(listId: string): Promise<Status[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("statuses")
    .select("*")
    .eq("list_id", listId)
    .order("order");
  if (error) throw error;
  const rows = data ?? [];
  // Sort: category-priority first (todo → in_progress → done → closed), then by "order"
  rows.sort((a, b) => {
    const ca = CATEGORY_PRIORITY[a.category] ?? 99;
    const cb = CATEGORY_PRIORITY[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.order - b.order;
  });
  return rows;
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

  // Notify newly assigned users
  if (data.assignee_ids.length > 0) {
    try {
      await emitAssignedNotifications({
        newAssigneeIds: data.assignee_ids,
        actorId: userId,
        taskId: data.id,
        taskTitle: data.title,
      });
    } catch (err) {
      console.error("[notifications] createTask assign error", err);
    }
  }

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

  // Diff & log with semantic action names
  const fieldActionMap: Partial<Record<keyof UpdateTaskInput, string>> = {
    status_id: "status_changed",
    priority: "priority_changed",
    due_date: "due_date_changed",
    assignee_ids: "assignees_changed",
    title: "renamed",
    description: "description_changed",
    list_id: "moved",
  };
  for (const [k, action] of Object.entries(fieldActionMap) as [keyof UpdateTaskInput, string][]) {
    if (k in input) {
      const before = (prev as Record<string, unknown>)[k];
      const after = (data as Record<string, unknown>)[k];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        try {
          await logActivity({
            task_id: id,
            actor_id: userId,
            action,
            from_value: { [k]: before },
            to_value: { [k]: after },
          });
        } catch (err) {
          console.error("[activity] Failed to log", action, err);
        }
      }
    }
  }

  // Notify newly-added assignees
  if ("assignee_ids" in input && input.assignee_ids) {
    const prevIds = new Set(prev.assignee_ids as string[]);
    const newIds = (input.assignee_ids as string[]).filter((id) => !prevIds.has(id));
    if (newIds.length > 0) {
      try {
        await emitAssignedNotifications({
          newAssigneeIds: newIds,
          actorId: userId,
          taskId: id,
          taskTitle: data.title,
        });
      } catch (err) {
        console.error("[notifications] updateTask assign error", err);
      }
    }
  }

  // Notify watchers + assignees on status change
  if ("status_id" in input && JSON.stringify(prev.status_id) !== JSON.stringify(data.status_id)) {
    try {
      const allRecipients = new Set<string>([...((data.assignee_ids as string[]) ?? [])]);
      const { data: watcherRows } = await sb.from("task_watchers").select("user_id").eq("task_id", id);
      for (const w of watcherRows ?? []) allRecipients.add(w.user_id);
      allRecipients.delete(userId);
      await Promise.all(
        [...allRecipients].map((rid) =>
          insertNotification({
            recipient_id: rid,
            actor_id: userId,
            type: "task_status_changed",
            task_id: id,
            metadata: { task_title: data.title },
          })
        )
      );
    } catch (err) {
      console.error("[notifications] updateTask status error", err);
    }
  }

  // Notify watchers + assignees on due_date change
  if ("due_date" in input && JSON.stringify(prev.due_date) !== JSON.stringify(data.due_date)) {
    try {
      const allRecipients = new Set<string>([...((data.assignee_ids as string[]) ?? [])]);
      const { data: watcherRows } = await sb.from("task_watchers").select("user_id").eq("task_id", id);
      for (const w of watcherRows ?? []) allRecipients.add(w.user_id);
      allRecipients.delete(userId);
      await Promise.all(
        [...allRecipients].map((rid) =>
          insertNotification({
            recipient_id: rid,
            actor_id: userId,
            type: "task_due_changed",
            task_id: id,
            metadata: { task_title: data.title, due_date: data.due_date },
          })
        )
      );
    } catch (err) {
      console.error("[notifications] updateTask due_date error", err);
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

  // Notify watchers + assignees (excluding actor) with task_completed
  try {
    const allRecipients = new Set<string>([
      ...((task.assignee_ids as string[]) ?? []),
    ]);
    // Get watchers
    const { data: watcherRows } = await (await db())
      .from("task_watchers")
      .select("user_id")
      .eq("task_id", id);
    for (const w of watcherRows ?? []) allRecipients.add(w.user_id);
    allRecipients.delete(userId);
    await Promise.all(
      [...allRecipients].map((rid) =>
        insertNotification({
          recipient_id: rid,
          actor_id: userId,
          type: "task_completed",
          task_id: id,
          metadata: { task_title: task.title },
        })
      )
    );
  } catch (err) {
    console.error("[notifications] completeTask error", err);
  }

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

  // Load task for notification context
  const { data: task } = await sb.from("tasks").select("title, assignee_ids").eq("id", id).maybeSingle();

  const { error } = await sb
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logActivity({ task_id: id, actor_id: userId, action: "archived" });

  // Notify watchers + assignees (excluding actor) with task_archived
  if (task) {
    try {
      const allRecipients = new Set<string>([
        ...((task.assignee_ids as string[]) ?? []),
      ]);
      const { data: watcherRows } = await sb
        .from("task_watchers")
        .select("user_id")
        .eq("task_id", id);
      for (const w of watcherRows ?? []) allRecipients.add(w.user_id);
      allRecipients.delete(userId);
      await Promise.all(
        [...allRecipients].map((rid) =>
          insertNotification({
            recipient_id: rid,
            actor_id: userId,
            type: "task_archived",
            task_id: id,
            metadata: { task_title: task.title },
          })
        )
      );
    } catch (err) {
      console.error("[notifications] archiveTask error", err);
    }
  }

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

/**
 * Fetch comments for a task, hydrated with author email/name.
 */
export async function getComments(taskId: string): Promise<CommentWithAuthor[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  if (error) throw error;
  const rows: Comment[] = data ?? [];
  if (rows.length === 0) return [];

  // Hydrate author info via admin client
  const adminClient = await admin();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map<string, { email: string; name: string | null }>(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? "",
        name:
          (u.user_metadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | null ?? null,
      },
    ])
  );

  return rows.map((r) => ({
    ...r,
    author_email: userMap.get(r.author_id)?.email ?? null,
    author_name: userMap.get(r.author_id)?.name ?? null,
  }));
}

/**
 * Add a comment to a task. New signature: { taskId, body }.
 */
export async function addComment({
  taskId,
  body,
}: {
  taskId: string;
  body: string;
}): Promise<Comment> {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("comments")
    .insert({ task_id: taskId, author_id: userId, body })
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    task_id: taskId,
    actor_id: userId,
    action: "commented",
    to_value: { comment_id: data.id },
  });

  // Emit notifications (best-effort, non-blocking)
  try {
    // Collect mentioned emails before awaiting anything
    const mentionRegex = /@([A-Za-z0-9._%+-]+@stayd\.co)\b/g;
    const mentionedEmails: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(body)) !== null) {
      mentionedEmails.push(m[1]);
    }

    // Fetch task for assignee list
    const { data: task } = await sb
      .from("tasks")
      .select("assignee_ids")
      .eq("id", taskId)
      .single();
    const assigneeIds: string[] = (task?.assignee_ids as string[] | null) ?? [];

    // Get watchers and merge with assignees
    const { data: watcherRows } = await (await db())
      .from("task_watchers")
      .select("user_id")
      .eq("task_id", taskId);
    const watcherIds = (watcherRows ?? []).map((w: { user_id: string }) => w.user_id);
    const mergedIds = [...new Set([...assigneeIds, ...watcherIds])];

    await Promise.all([
      emitMentionNotifications({ body, actorId: userId, taskId, commentId: data.id }),
      emitCommentNotifications({
        assigneeIds: mergedIds,
        actorId: userId,
        taskId,
        commentId: data.id,
        mentionedEmails,
      }),
    ]);
  } catch (err) {
    console.error("[notifications] addComment error", err);
  }

  revalidatePath("/work");
  return data as Comment;
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  return addComment({ taskId: input.task_id, body: input.body });
}

export async function updateComment(id: string, body: string): Promise<Comment>;
export async function updateComment(id: string, input: UpdateCommentInput): Promise<Comment>;
export async function updateComment(
  id: string,
  bodyOrInput: string | UpdateCommentInput
): Promise<Comment> {
  const sb = await db();
  const userId = await currentUserId();
  const body = typeof bodyOrInput === "string" ? bodyOrInput : bodyOrInput.body;
  const { data, error } = await sb
    .from("comments")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", userId)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data as Comment;
}

export async function deleteComment(id: string): Promise<void> {
  const sb = await db();
  const userId = await currentUserId();
  const { error } = await sb.from("comments").delete().eq("id", id).eq("author_id", userId);
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== ACTIVITY ====================

/**
 * Fetch activity for a task, hydrated with actor email/name.
 */
export async function getActivity(taskId: string): Promise<TaskActivityEntry[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("task_activity")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Hydrate actor info via admin client
  const adminClient = await admin();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map<string, { email: string; name: string | null }>(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? "",
        name:
          (u.user_metadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | null ?? null,
      },
    ])
  );

  return rows.map((r) => ({
    ...r,
    actor_email: r.actor_id ? (userMap.get(r.actor_id)?.email ?? null) : null,
    actor_name: r.actor_id ? (userMap.get(r.actor_id)?.name ?? null) : null,
  })) as TaskActivityEntry[];
}

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

// ==================== NOTIFICATIONS ====================

// Module-level cache for mentionable users (30s TTL)
let _mentionableUsersCache: { users: MentionableUser[]; ts: number } | null = null;

export async function listMentionableUsers(): Promise<MentionableUser[]> {
  const now = Date.now();
  if (_mentionableUsersCache && now - _mentionableUsersCache.ts < 30_000) {
    return _mentionableUsersCache.users;
  }
  const adminClient = await admin();
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const users: MentionableUser[] = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name:
      ((u.user_metadata as Record<string, unknown> | undefined)?.full_name as
        | string
        | null) ?? null,
  }));
  _mentionableUsersCache = { users, ts: now };
  return users;
}

export async function getNotifications({
  limit = 20,
  unreadOnly = false,
}: {
  limit?: number;
  unreadOnly?: boolean;
} = {}): Promise<NotificationWithMeta[]> {
  const sb = await db();
  const userId = await currentUserId();

  let q = sb
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) q = q.is("read_at", null);

  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Hydrate actor info
  const adminClient = await admin();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map<string, { email: string; name: string | null }>(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? "",
        name:
          ((u.user_metadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | null) ?? null,
      },
    ])
  );

  // Hydrate task info
  const taskIds = [...new Set(rows.map((r) => r.task_id).filter(Boolean))] as string[];
  let taskMap = new Map<string, { title: string; list_id: string }>();
  if (taskIds.length > 0) {
    const { data: tasks } = await sb
      .from("tasks")
      .select("id, title, list_id")
      .in("id", taskIds);
    taskMap = new Map(
      (tasks ?? []).map((t) => [t.id, { title: t.title, list_id: t.list_id }])
    );
  }

  return rows.map((r) => ({
    ...r,
    actor_email: r.actor_id ? (userMap.get(r.actor_id)?.email ?? null) : null,
    actor_name: r.actor_id ? (userMap.get(r.actor_id)?.name ?? null) : null,
    task_title: r.task_id ? (taskMap.get(r.task_id)?.title ?? null) : null,
    task_list_id: r.task_id ? (taskMap.get(r.task_id)?.list_id ?? null) : null,
  })) as NotificationWithMeta[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const sb = await db();
  const userId = await currentUserId();
  const { count, error } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const sb = await db();
  const userId = await currentUserId();
  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

/**
 * Insert notifications using the admin (service role) client to bypass RLS.
 * Errors are caught so the caller action never fails.
 */
async function insertNotification(payload: {
  recipient_id: string;
  actor_id: string | null;
  type: string;
  task_id?: string | null;
  comment_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const adminClient = await admin();
    await adminClient.from("notifications").insert({
      recipient_id: payload.recipient_id,
      actor_id: payload.actor_id ?? null,
      type: payload.type,
      task_id: payload.task_id ?? null,
      comment_id: payload.comment_id ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    console.error("[notifications] Failed to insert", payload.type, err);
  }
}

/**
 * Emit mention notifications for each @email@stayd.co found in body.
 * Skips if the mentioned user is the actor.
 */
async function emitMentionNotifications({
  body,
  actorId,
  taskId,
  commentId,
}: {
  body: string;
  actorId: string;
  taskId: string;
  commentId: string;
}): Promise<void> {
  const mentionRegex = /@([A-Za-z0-9._%+-]+@stayd\.co)\b/g;
  const emails: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = mentionRegex.exec(body)) !== null) {
    emails.push(m[1]);
  }
  if (emails.length === 0) return;

  const users = await listMentionableUsers();
  const excerpt = body.slice(0, 200);

  await Promise.all(
    emails.map(async (email) => {
      const target = users.find((u) => u.email === email);
      if (!target || target.id === actorId) return;
      await insertNotification({
        recipient_id: target.id,
        actor_id: actorId,
        type: "mention",
        task_id: taskId,
        comment_id: commentId,
        metadata: { excerpt },
      });
    })
  );
}

/**
 * Emit assigned notifications for each newly-added assignee.
 */
async function emitAssignedNotifications({
  newAssigneeIds,
  actorId,
  taskId,
  taskTitle,
}: {
  newAssigneeIds: string[];
  actorId: string;
  taskId: string;
  taskTitle: string;
}): Promise<void> {
  await Promise.all(
    newAssigneeIds
      .filter((id) => id !== actorId)
      .map((recipientId) =>
        insertNotification({
          recipient_id: recipientId,
          actor_id: actorId,
          type: "assigned",
          task_id: taskId,
          metadata: { task_title: taskTitle },
        })
      )
  );
}

/**
 * Emit comment notifications for task assignees (except the comment author).
 * Does not double-notify users who were @mentioned.
 */
async function emitCommentNotifications({
  assigneeIds,
  actorId,
  taskId,
  commentId,
  mentionedEmails,
}: {
  assigneeIds: string[];
  actorId: string;
  taskId: string;
  commentId: string;
  mentionedEmails: string[];
}): Promise<void> {
  // Map mentioned emails to ids to avoid double-notifying
  const users = mentionedEmails.length > 0 ? await listMentionableUsers() : [];
  const mentionedIds = new Set(
    mentionedEmails
      .map((email) => users.find((u) => u.email === email)?.id)
      .filter((id): id is string => Boolean(id))
  );

  await Promise.all(
    assigneeIds
      .filter((id) => id !== actorId && !mentionedIds.has(id))
      .map((recipientId) =>
        insertNotification({
          recipient_id: recipientId,
          actor_id: actorId,
          type: "comment",
          task_id: taskId,
          comment_id: commentId,
        })
      )
  );
}

// ==================== DASHBOARD ====================

export async function getDashboardSummary(
  opts?: { spaceId?: string }
): Promise<DashboardSummary> {
  const adminClient = await admin();
  const userId = await currentUserId();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - today.getUTCDay());
  weekStart.setUTCHours(0, 0, 0, 0);

  // Fetch all non-archived tasks (use admin to avoid RLS issues on aggregate reads)
  let q = adminClient.from("tasks_with_meta").select("*").is("archived_at", null);
  if (opts?.spaceId) q = q.eq("space_id", opts.spaceId);
  const { data: allTasks, error: allErr } = await q;
  if (allErr) throw allErr;
  const tasks = allTasks ?? [];

  // Counts
  const openTasks = tasks.filter((t) => !t.completed_at);
  const overdueTasks = openTasks.filter(
    (t) => t.due_date && t.due_date.slice(0, 10) < todayStr
  );
  const completedThisWeek = tasks.filter(
    (t) => t.completed_at && new Date(t.completed_at) >= weekStart
  );
  const myOpenTasks = openTasks.filter(
    (t) => Array.isArray(t.assignee_ids) && (t.assignee_ids as string[]).includes(userId)
  );
  const dueTodayTasks = openTasks.filter(
    (t) => t.due_date && t.due_date.slice(0, 10) === todayStr
  );

  // By status (open tasks only)
  const statusMap = new Map<
    string,
    { status_id: string | null; status_name: string | null; status_color: string | null; count: number }
  >();
  for (const t of openTasks) {
    const key = t.status_id ?? "__null__";
    const existing = statusMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      statusMap.set(key, {
        status_id: t.status_id ?? null,
        status_name: (t.status_name as string | null) ?? null,
        status_color: (t.status_color as string | null) ?? null,
        count: 1,
      });
    }
  }
  const byStatus = [...statusMap.values()].sort((a, b) => b.count - a.count);

  // By priority (open tasks only)
  const priorityOrder = ["urgent", "high", "normal", "low"] as const;
  type PriorityKey = (typeof priorityOrder)[number];
  const priorityMap = new Map<PriorityKey, number>();
  for (const p of priorityOrder) priorityMap.set(p, 0);
  for (const t of openTasks) {
    const p = t.priority as string;
    if (p === "urgent" || p === "high" || p === "normal" || p === "low") {
      priorityMap.set(p, (priorityMap.get(p) ?? 0) + 1);
    }
  }
  const byPriority = priorityOrder.map((p) => ({ priority: p, count: priorityMap.get(p) ?? 0 }));

  // By assignee — top 10 (open tasks only)
  const assigneeCountMap = new Map<string, number>();
  for (const t of openTasks) {
    if (Array.isArray(t.assignee_ids)) {
      for (const aid of t.assignee_ids as string[]) {
        assigneeCountMap.set(aid, (assigneeCountMap.get(aid) ?? 0) + 1);
      }
    }
  }
  const top10Assignees = [...assigneeCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Hydrate assignee info
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map<string, { email: string; name: string | null }>(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? "",
        name:
          ((u.user_metadata as Record<string, unknown> | undefined)?.full_name as string | null) ??
          null,
      },
    ])
  );

  const byAssignee = top10Assignees.map(([aid, count]) => ({
    assignee_id: aid,
    assignee_email: userMap.get(aid)?.email ?? null,
    assignee_name: userMap.get(aid)?.name ?? null,
    count,
  }));

  // Completed per day, last 30 days
  const completedPerDayLast30: { date: string; count: number }[] = [];
  const dayCountMap = new Map<string, number>();
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - 29);
  cutoff.setUTCHours(0, 0, 0, 0);

  for (const t of tasks) {
    if (!t.completed_at) continue;
    const d = new Date(t.completed_at);
    if (d < cutoff) continue;
    const dateStr = d.toISOString().slice(0, 10);
    dayCountMap.set(dateStr, (dayCountMap.get(dateStr) ?? 0) + 1);
  }

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    completedPerDayLast30.push({ date: dateStr, count: dayCountMap.get(dateStr) ?? 0 });
  }

  return {
    counts: {
      total: tasks.length,
      open: openTasks.length,
      overdue: overdueTasks.length,
      completedThisWeek: completedThisWeek.length,
      myOpen: myOpenTasks.length,
      dueToday: dueTodayTasks.length,
    },
    byStatus,
    byPriority,
    byAssignee,
    completedPerDayLast30,
  };
}

// ==================== TIME ENTRIES ====================

export async function startTimer(
  taskId: string,
  description?: string
): Promise<TimeEntry> {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("time_entries")
    .insert({
      task_id: taskId,
      user_id: userId,
      description: description ?? null,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "You already have a running timer. Stop it before starting a new one."
      );
    }
    throw error;
  }
  revalidatePath("/work");
  return data as TimeEntry;
}

export async function stopTimer(entryId: string): Promise<TimeEntry> {
  const sb = await db();
  const userId = await currentUserId();
  // Load the entry first
  const { data: entry, error: fetchErr } = await sb
    .from("time_entries")
    .select("*")
    .eq("id", entryId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .single();
  if (fetchErr) throw fetchErr;

  const now = new Date();
  const startedAt = new Date(entry.started_at);
  const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  const { data, error } = await sb
    .from("time_entries")
    .update({
      ended_at: now.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data as TimeEntry;
}

export async function getOpenTimer(): Promise<TimeEntry | null> {
  const sb = await db();
  const userId = await currentUserId();
  const { data, error } = await sb
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as TimeEntry | null);
}

export async function getTimeEntries(taskId: string): Promise<TimeEntryWithUser[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("time_entries")
    .select("*")
    .eq("task_id", taskId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as TimeEntry[];
  if (rows.length === 0) return [];

  const adminClient = await admin();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map<string, { email: string; name: string | null }>(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? "",
        name:
          ((u.user_metadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | null) ?? null,
      },
    ])
  );

  return rows.map((r) => ({
    ...r,
    user_email: userMap.get(r.user_id)?.email ?? null,
    user_name: userMap.get(r.user_id)?.name ?? null,
  }));
}

export async function createManualTimeEntry({
  taskId,
  startedAt,
  endedAt,
  description,
}: {
  taskId: string;
  startedAt: string;
  endedAt: string;
  description?: string;
}): Promise<TimeEntry> {
  const sb = await db();
  const userId = await currentUserId();
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);

  const { data, error } = await sb
    .from("time_entries")
    .insert({
      task_id: taskId,
      user_id: userId,
      description: description ?? null,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: durationSeconds,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data as TimeEntry;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const sb = await db();
  const userId = await currentUserId();
  const { error } = await sb
    .from("time_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== WATCHERS ====================

export async function getWatchers(taskId: string): Promise<WatcherWithUser[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("task_watchers")
    .select("*")
    .eq("task_id", taskId);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const adminClient = await admin();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map<string, { email: string; name: string | null }>(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? "",
        name:
          ((u.user_metadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | null) ?? null,
      },
    ])
  );

  return rows.map((r) => ({
    task_id: r.task_id as string,
    user_id: r.user_id as string,
    created_at: r.created_at as string,
    user_email: userMap.get(r.user_id as string)?.email ?? null,
    user_name: userMap.get(r.user_id as string)?.name ?? null,
  }));
}

export async function addWatcher(taskId: string, userId: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("task_watchers")
    .upsert({ task_id: taskId, user_id: userId }, { onConflict: "task_id,user_id" });
  if (error) throw error;
  revalidatePath("/work");
}

export async function removeWatcher(taskId: string, userId: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("task_watchers")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== PERSONAL LIST / RPC ====================

export async function ensurePersonalList(): Promise<string> {
  const sb = await db();
  const { data, error } = await sb.rpc("ensure_personal_list");
  if (error) throw error;
  return data as string;
}

export async function deleteStatusWithReassign(
  statusId: string,
  targetStatusId: string
): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb.rpc("delete_status_with_reassign", {
    p_status_id: statusId,
    p_target_status_id: targetStatusId,
  });
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== CSV EXPORT ====================

export async function exportTasksCsv(query: TaskQuery): Promise<string> {
  // Fetch all tasks matching the query (no pagination)
  const unlimitedQuery: TaskQuery = {
    ...query,
    limit: 500,
    offset: 0,
  };
  const { tasks } = await queryTasks(unlimitedQuery);

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const str = String(v);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    "ID",
    "Title",
    "Status",
    "Priority",
    "Due",
    "Assignees",
    "List",
    "Space",
    "Created",
    "Completed",
  ];

  const rows = tasks.map((t) => [
    escape(t.id),
    escape(t.title),
    escape(t.status_name ?? ""),
    escape(t.priority),
    escape(t.due_date ? t.due_date.slice(0, 10) : ""),
    escape((t.assignee_ids ?? []).join("; ")),
    escape(t.list_name ?? ""),
    escape(t.list_space_id ?? ""),
    escape(t.created_at ? t.created_at.slice(0, 10) : ""),
    escape(t.completed_at ? t.completed_at.slice(0, 10) : ""),
  ]);

  const lines = [headers.join(","), ...rows.map((r) => r.join(","))];
  return lines.join("\n");
}

// Permission actions live in ./permissions and should be imported directly
// (re-exports are not allowed in "use server" files).

// ==================== AUTH HELPERS ====================

export async function getCurrentUserId(): Promise<string | null> {
  const { getCurrentUser } = await import("@/lib/auth/current-user");
  const user = await getCurrentUser();
  return user?.id ?? null;
}
