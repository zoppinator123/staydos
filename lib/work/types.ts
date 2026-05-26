/**
 * Full Work/Task Management Types
 * Replicated from Haven-OS with no features removed
 */

export type TaskStatusCategory = "todo" | "in_progress" | "done" | "closed";
export type ListType = "private" | "shared" | "public";
export type ListMemberRole = "owner" | "member";
export type ListAccessLevel = "viewer" | "editor" | "admin";
export type TaskPriority = "urgent" | "high" | "normal" | "low" | "none";
export type SpacePrivacy = "team" | "private";
export type SpaceMemberRole = "admin" | "member" | "viewer";

export interface Space {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  order: number;
  privacy: SpacePrivacy;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  space_id: string;
  profile_id: string;
  role: SpaceMemberRole;
  added_at: string;
}

export interface Folder {
  id: string;
  space_id: string;
  name: string;
  order: number;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  space_id: string | null;
  folder_id: string | null;
  personal_owner_id: string | null;
  name: string;
  description: string | null;
  order: number;
  type: ListType;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  list_id: string;
  status_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  start_date: string | null;
  time_estimate: number | null;
  order: number;
  custom_fields: Record<string, unknown>;
  assignee_ids: string[];
  tags: string[];
  archived_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  recurrence_rule: RecurrenceRule | null;
  recurrence_count: number;
}

export interface Status {
  id: string;
  list_id: string;
  name: string;
  color: string;
  category: TaskStatusCategory;
  order: number;
}

export interface CustomFieldDef {
  id: string;
  list_id: string;
  name: string;
  field_type: string;
  config: Record<string, unknown>;
  order: number;
  created_at: string;
}

export interface Checklist {
  id: string;
  task_id: string;
  name: string;
  order: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  completed: boolean;
  assignee_id: string | null;
  order: number;
  created_at: string;
  completed_at: string | null;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author_email: string | null;
  author_name: string | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  from_value: Record<string, unknown> | null;
  to_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TaskActivityEntry extends TaskActivity {
  actor_email: string | null;
  actor_name: string | null;
}

export interface ListMember {
  list_id: string;
  profile_id: string;
  role: ListMemberRole;
  access_level: ListAccessLevel;
  added_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

// ==================== RECURRENCE ====================
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 2 weeks
  by_weekday?: number[]; // 0=Sun .. 6=Sat
  by_month_day?: number[]; // 1..31
  by_month?: number[]; // 1..12
  count?: number | null; // total occurrences, null = forever
  until?: string | null; // ISO date string
}

// ==================== INPUT TYPES ====================
export interface CreateSpaceInput {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
  privacy?: SpacePrivacy;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  privacy?: SpacePrivacy;
  order?: number;
}

export interface CreateFolderInput {
  space_id: string;
  name: string;
}

export interface UpdateFolderInput {
  name?: string;
  order?: number;
}

export interface CreateListInput {
  space_id?: string | null;
  folder_id?: string | null;
  personal_owner_id?: string | null;
  name: string;
  description?: string | null;
  type?: ListType;
}

export interface UpdateListInput {
  name?: string;
  description?: string | null;
  type?: ListType;
  order?: number;
  folder_id?: string | null;
}

export interface CreateTaskInput {
  list_id: string;
  title: string;
  description?: string | null;
  status_id?: string | null;
  parent_id?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  time_estimate?: number | null;
  custom_fields?: Record<string, unknown>;
  assignee_ids?: string[];
  tags?: string[];
  recurrence_rule?: RecurrenceRule | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status_id?: string | null;
  parent_id?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  time_estimate?: number | null;
  order?: number;
  list_id?: string;
  custom_fields?: Record<string, unknown>;
  assignee_ids?: string[];
  tags?: string[];
  archived_at?: string | null;
  completed_at?: string | null;
  recurrence_rule?: RecurrenceRule | null;
}

export interface CreateStatusInput {
  list_id: string;
  name: string;
  color: string;
  category: TaskStatusCategory;
}

export interface UpdateStatusInput {
  name?: string;
  color?: string;
  category?: TaskStatusCategory;
  order?: number;
}

export interface CreateCustomFieldInput {
  list_id: string;
  name: string;
  field_type: string;
  config?: Record<string, unknown>;
}

export interface CreateChecklistInput {
  task_id: string;
  name: string;
}

export interface CreateChecklistItemInput {
  checklist_id: string;
  content: string;
  assignee_id?: string | null;
}

export interface UpdateChecklistItemInput {
  content?: string;
  completed?: boolean;
  assignee_id?: string | null;
  order?: number;
}

export interface CreateCommentInput {
  task_id: string;
  body: string;
}

export interface UpdateCommentInput {
  body: string;
}

export interface AddSpaceMemberInput {
  space_id: string;
  profile_id: string;
  role: SpaceMemberRole;
}

export interface AddListMemberInput {
  list_id: string;
  profile_id: string;
  role?: ListMemberRole;
  access_level?: ListAccessLevel;
}

export interface CreateAttachmentInput {
  task_id: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
}

// ==================== QUERY / VIEW TYPES ====================
export interface TaskFilter {
  list_ids?: string[];
  space_ids?: string[];
  status_categories?: TaskStatusCategory[];
  priorities?: TaskPriority[];
  assignee_ids?: string[];
  tags?: string[];
  due_before?: string;
  due_after?: string;
  search?: string;
  include_archived?: boolean;
  include_completed?: boolean;
  created_by?: string;
}

export interface TaskQuery {
  filter?: TaskFilter;
  sort?: { field: "order" | "due_date" | "priority" | "created_at" | "updated_at" | "title"; direction: "asc" | "desc" }[];
  limit?: number;
  offset?: number;
}

export interface TaskWithMeta extends Task {
  status_name: string | null;
  status_color: string | null;
  status_category: TaskStatusCategory | null;
  list_name: string | null;
  list_space_id: string | null;
}

export interface PaginatedTasks {
  tasks: TaskWithMeta[];
  total: number;
  has_more: boolean;
}
