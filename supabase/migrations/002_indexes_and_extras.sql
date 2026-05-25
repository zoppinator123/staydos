-- Additional Haven-OS parity: list_members, attachments, indexes, and helpful views.

-- ==================== LIST MEMBERS ====================
create table if not exists list_members (
  list_id uuid references lists(id) on delete cascade,
  profile_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  access_level text not null default 'editor' check (access_level in ('viewer', 'editor', 'admin')),
  added_at timestamptz not null default now(),
  primary key (list_id, profile_id)
);

-- ==================== ATTACHMENTS ====================
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  uploaded_by uuid,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

-- ==================== INDEXES ====================
create index if not exists idx_spaces_archived on spaces (archived_at) where archived_at is null;
create index if not exists idx_spaces_order on spaces ("order");

create index if not exists idx_folders_space on folders (space_id);
create index if not exists idx_folders_archived on folders (archived_at) where archived_at is null;

create index if not exists idx_lists_space on lists (space_id);
create index if not exists idx_lists_folder on lists (folder_id);
create index if not exists idx_lists_owner on lists (personal_owner_id);
create index if not exists idx_lists_archived on lists (archived_at) where archived_at is null;

create index if not exists idx_tasks_list on tasks (list_id);
create index if not exists idx_tasks_parent on tasks (parent_id);
create index if not exists idx_tasks_status on tasks (status_id);
create index if not exists idx_tasks_due on tasks (due_date) where archived_at is null and completed_at is null;
create index if not exists idx_tasks_created_by on tasks (created_by);
create index if not exists idx_tasks_archived on tasks (archived_at) where archived_at is null;
create index if not exists idx_tasks_assignees on tasks using gin (assignee_ids);
create index if not exists idx_tasks_tags on tasks using gin (tags);

create index if not exists idx_statuses_list on statuses (list_id);
create index if not exists idx_custom_fields_list on custom_field_defs (list_id);
create index if not exists idx_checklists_task on checklists (task_id);
create index if not exists idx_checklist_items_checklist on checklist_items (checklist_id);
create index if not exists idx_comments_task on comments (task_id);
create index if not exists idx_activity_task on task_activity (task_id);
create index if not exists idx_activity_created on task_activity (created_at desc);

create index if not exists idx_space_members_profile on space_members (profile_id);
create index if not exists idx_list_members_profile on list_members (profile_id);
create index if not exists idx_attachments_task on attachments (task_id);

-- ==================== FOREIGN KEY ON STATUS_ID ====================
-- statuses.id was defined after tasks; add FK now if not present.
do $$
begin
  if not exists (
    select 1
    from   information_schema.table_constraints
    where  table_name = 'tasks'
    and    constraint_name = 'tasks_status_id_fkey'
  ) then
    alter table tasks
      add constraint tasks_status_id_fkey
      foreign key (status_id) references statuses(id) on delete set null;
  end if;
end $$;

-- ==================== UPDATED_AT TRIGGERS for missed tables ====================
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_folders_updated_at') then
    create trigger update_folders_updated_at before update on folders
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_comments_updated_at') then
    create trigger update_comments_updated_at before update on comments
      for each row execute function update_updated_at_column();
  end if;
end $$;

-- ==================== VIEWS ====================
-- Tasks with status info denormalized for global views.
create or replace view tasks_with_meta as
select
  t.*,
  s.name as status_name,
  s.color as status_color,
  s.category as status_category,
  l.name as list_name,
  l.space_id as list_space_id
from tasks t
left join statuses s on s.id = t.status_id
left join lists l on l.id = t.list_id;
