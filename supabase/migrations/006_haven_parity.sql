-- Haven OS parity migration: time entries, watchers, tags (normalized), task hierarchy view.
-- All idempotent (create if not exists / drop policy if exists).

-- ---------------------------------------------------------------------------
-- time_entries
-- ---------------------------------------------------------------------------
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists time_entries_task_idx on time_entries(task_id);
create index if not exists time_entries_user_idx on time_entries(user_id);
-- Only one open (un-ended) timer per user
create unique index if not exists time_entries_open_per_user_idx
  on time_entries(user_id) where ended_at is null;

alter table time_entries enable row level security;

drop policy if exists "time_entries: read where task accessible" on time_entries;
create policy "time_entries: read where task accessible" on time_entries
  for select using (
    auth.uid() is not null and exists (
      select 1 from tasks t
      where t.id = time_entries.task_id
        and (
          t.created_by = auth.uid()
          or auth.uid() = any (t.assignee_ids)
          or exists (
            select 1 from lists l where l.id = t.list_id and (
              l.personal_owner_id = auth.uid()
              or exists (select 1 from list_members lm where lm.list_id = l.id and lm.profile_id = auth.uid())
              or (l.space_id is not null and exists (
                select 1 from space_members sm where sm.space_id = l.space_id and sm.profile_id = auth.uid()
              ))
              or l.type = 'public'
            )
          )
        )
    )
  );

drop policy if exists "time_entries: insert own" on time_entries;
create policy "time_entries: insert own" on time_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "time_entries: update own" on time_entries;
create policy "time_entries: update own" on time_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "time_entries: delete own" on time_entries;
create policy "time_entries: delete own" on time_entries
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- watchers
-- ---------------------------------------------------------------------------
create table if not exists task_watchers (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists task_watchers_user_idx on task_watchers(user_id);

alter table task_watchers enable row level security;

drop policy if exists "task_watchers: read where task accessible" on task_watchers;
create policy "task_watchers: read where task accessible" on task_watchers
  for select using (
    auth.uid() is not null and exists (
      select 1 from tasks t
      where t.id = task_watchers.task_id
        and (
          t.created_by = auth.uid()
          or auth.uid() = any (t.assignee_ids)
          or exists (
            select 1 from lists l where l.id = t.list_id and (
              l.personal_owner_id = auth.uid()
              or exists (select 1 from list_members lm where lm.list_id = l.id and lm.profile_id = auth.uid())
              or (l.space_id is not null and exists (
                select 1 from space_members sm where sm.space_id = l.space_id and sm.profile_id = auth.uid()
              ))
              or l.type = 'public'
            )
          )
        )
    )
  );

drop policy if exists "task_watchers: insert if accessible" on task_watchers;
create policy "task_watchers: insert if accessible" on task_watchers
  for insert with check (
    auth.uid() is not null and exists (
      select 1 from tasks t
      where t.id = task_watchers.task_id
        and (
          t.created_by = auth.uid()
          or auth.uid() = any (t.assignee_ids)
          or exists (
            select 1 from lists l where l.id = t.list_id and (
              l.personal_owner_id = auth.uid()
              or exists (select 1 from list_members lm where lm.list_id = l.id and lm.profile_id = auth.uid())
              or (l.space_id is not null and exists (
                select 1 from space_members sm where sm.space_id = l.space_id and sm.profile_id = auth.uid()
              ))
              or l.type = 'public'
            )
          )
        )
    )
  );

drop policy if exists "task_watchers: delete own" on task_watchers;
create policy "task_watchers: delete own" on task_watchers
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- tasks_with_meta view: rebuild to include subtask counts + time totals + watcher count
-- ---------------------------------------------------------------------------
drop view if exists tasks_with_meta;
create view tasks_with_meta as
select
  t.*,
  l.name as list_name,
  l.type as list_type,
  l.space_id as space_id,
  l.folder_id as folder_id,
  l.personal_owner_id as list_personal_owner_id,
  s.name as status_name,
  s.color as status_color,
  s.category as status_category,
  s."order" as status_order,
  (select count(*) from tasks st where st.parent_id = t.id and st.archived_at is null) as subtask_total,
  (select count(*) from tasks st where st.parent_id = t.id and st.archived_at is null and st.completed_at is not null) as subtask_done,
  (select coalesce(sum(coalesce(te.duration_seconds, 0)), 0) from time_entries te where te.task_id = t.id) as time_logged_seconds,
  (select count(*) from task_watchers w where w.task_id = t.id) as watcher_count,
  (select count(*) from comments c where c.task_id = t.id) as comment_count
from tasks t
left join lists l on l.id = t.list_id
left join statuses s on s.id = t.status_id;

-- ---------------------------------------------------------------------------
-- Convenience function: ensure a private personal list exists for current user
-- ---------------------------------------------------------------------------
create or replace function public.ensure_personal_list()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  list_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select id into list_id from lists
    where personal_owner_id = uid and type = 'private'
    order by created_at asc limit 1;

  if list_id is null then
    insert into lists (name, type, personal_owner_id, "order", created_by)
      values ('My Tasks', 'private', uid, 0, uid)
      returning id into list_id;

    -- Seed default statuses
    insert into statuses (list_id, name, color, category, "order") values
      (list_id, 'To Do', '#94A3B8', 'todo', 0),
      (list_id, 'In Progress', '#3B82F6', 'in_progress', 1),
      (list_id, 'Done', '#10B981', 'done', 2),
      (list_id, 'Closed', '#6B7280', 'closed', 3);
  end if;

  return list_id;
end;
$$;

grant execute on function public.ensure_personal_list() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Function: reassign tasks when deleting a status
-- ---------------------------------------------------------------------------
create or replace function public.delete_status_with_reassign(
  p_status_id uuid,
  p_target_status_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status_id = p_target_status_id then
    raise exception 'target status must differ from deleted status';
  end if;

  update tasks set status_id = p_target_status_id where status_id = p_status_id;
  delete from statuses where id = p_status_id;
end;
$$;

grant execute on function public.delete_status_with_reassign(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Indexes (idempotent) to keep group/sort fast on the big view
-- ---------------------------------------------------------------------------
create index if not exists tasks_parent_idx on tasks(parent_id);
create index if not exists tasks_list_status_order_idx on tasks(list_id, status_id, "order");
create index if not exists tasks_due_idx on tasks(due_date) where due_date is not null;
create index if not exists tasks_assignees_gin on tasks using gin (assignee_ids);
