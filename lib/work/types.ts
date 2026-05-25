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
  recurrence_rule: any | null;
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
