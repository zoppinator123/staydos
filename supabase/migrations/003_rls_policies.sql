-- Row Level Security policies for Staydos.
-- Strategy: enable RLS on every table and grant access via membership rules.
-- The service_role bypasses RLS automatically, which is what server actions
-- using lib/supabase/admin.ts rely on for trusted operations.

-- ==================== ENABLE RLS ====================
alter table spaces            enable row level security;
alter table space_members     enable row level security;
alter table folders           enable row level security;
alter table lists             enable row level security;
alter table list_members      enable row level security;
alter table tasks             enable row level security;
alter table statuses          enable row level security;
alter table custom_field_defs enable row level security;
alter table checklists        enable row level security;
alter table checklist_items   enable row level security;
alter table comments          enable row level security;
alter table task_activity     enable row level security;
alter table attachments       enable row level security;

-- ==================== HELPER PREDICATES ====================
-- Whether the calling user has any membership in the given space.
create or replace function user_in_space(p_space uuid)
returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from space_members
    where space_id = p_space
      and profile_id = auth.uid()
  );
$$;

-- Whether the calling user is a space admin.
create or replace function user_is_space_admin(p_space uuid)
returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from space_members
    where space_id = p_space
      and profile_id = auth.uid()
      and role = 'admin'
  );
$$;

-- Whether the calling user has any access (any source) to the given list.
create or replace function user_can_read_list(p_list uuid)
returns boolean
language sql stable security definer as $$
  with l as (
    select space_id, personal_owner_id, type
    from lists where id = p_list
  )
  select
    coalesce(
      (select personal_owner_id = auth.uid() from l),
      false
    )
    or exists (select 1 from list_members where list_id = p_list and profile_id = auth.uid())
    or exists (
      select 1 from l
      where space_id is not null
        and user_in_space(space_id)
    )
    or exists (select 1 from l where type = 'public');
$$;

-- Whether the calling user can edit the list (editor or higher).
create or replace function user_can_edit_list(p_list uuid)
returns boolean
language sql stable security definer as $$
  with l as (
    select space_id, personal_owner_id from lists where id = p_list
  )
  select
    coalesce((select personal_owner_id = auth.uid() from l), false)
    or exists (
      select 1 from list_members
      where list_id = p_list
        and profile_id = auth.uid()
        and access_level in ('editor', 'admin')
    )
    or exists (
      select 1 from l
      where space_id is not null
        and exists (
          select 1 from space_members
          where space_id = l.space_id
            and profile_id = auth.uid()
            and role in ('admin', 'member')
        )
    );
$$;

-- ==================== SPACES ====================
create policy "spaces: members read"
  on spaces for select
  using (user_in_space(id) or created_by = auth.uid());

create policy "spaces: any signed-in can create"
  on spaces for insert
  with check (auth.uid() is not null);

create policy "spaces: admin update"
  on spaces for update
  using (user_is_space_admin(id))
  with check (user_is_space_admin(id));

create policy "spaces: admin delete"
  on spaces for delete
  using (user_is_space_admin(id));

-- ==================== SPACE_MEMBERS ====================
create policy "space_members: members can read"
  on space_members for select
  using (user_in_space(space_id) or profile_id = auth.uid());

create policy "space_members: admins manage"
  on space_members for all
  using (user_is_space_admin(space_id))
  with check (user_is_space_admin(space_id));

-- Allow user to self-add when creating a space (the createSpace action does this)
create policy "space_members: self insert on first member"
  on space_members for insert
  with check (
    profile_id = auth.uid()
    and not exists (select 1 from space_members sm where sm.space_id = space_members.space_id)
  );

-- ==================== FOLDERS ====================
create policy "folders: space members read"
  on folders for select
  using (user_in_space(space_id));

create policy "folders: space members write"
  on folders for all
  using (user_in_space(space_id))
  with check (user_in_space(space_id));

-- ==================== LISTS ====================
create policy "lists: readable when user has list access"
  on lists for select
  using (user_can_read_list(id));

create policy "lists: any signed-in can create"
  on lists for insert
  with check (auth.uid() is not null);

create policy "lists: editors can update"
  on lists for update
  using (user_can_edit_list(id))
  with check (user_can_edit_list(id));

create policy "lists: editors can delete"
  on lists for delete
  using (user_can_edit_list(id));

-- ==================== LIST_MEMBERS ====================
create policy "list_members: readable when user can read list"
  on list_members for select
  using (user_can_read_list(list_id) or profile_id = auth.uid());

create policy "list_members: list editors manage"
  on list_members for all
  using (user_can_edit_list(list_id))
  with check (user_can_edit_list(list_id));

-- Allow self-insert during list creation
create policy "list_members: self insert on first member"
  on list_members for insert
  with check (
    profile_id = auth.uid()
    and not exists (select 1 from list_members lm where lm.list_id = list_members.list_id)
  );

-- ==================== TASKS ====================
create policy "tasks: readable when user can read list"
  on tasks for select
  using (user_can_read_list(list_id));

create policy "tasks: editors can write"
  on tasks for all
  using (user_can_edit_list(list_id))
  with check (user_can_edit_list(list_id));

-- ==================== STATUSES ====================
create policy "statuses: readable with list"
  on statuses for select
  using (user_can_read_list(list_id));

create policy "statuses: editors write"
  on statuses for all
  using (user_can_edit_list(list_id))
  with check (user_can_edit_list(list_id));

-- ==================== CUSTOM FIELD DEFS ====================
create policy "custom_fields: readable with list"
  on custom_field_defs for select
  using (user_can_read_list(list_id));

create policy "custom_fields: editors write"
  on custom_field_defs for all
  using (user_can_edit_list(list_id))
  with check (user_can_edit_list(list_id));

-- ==================== CHECKLISTS / ITEMS ====================
create policy "checklists: read via task"
  on checklists for select
  using (exists (
    select 1 from tasks t where t.id = task_id and user_can_read_list(t.list_id)
  ));

create policy "checklists: write via task"
  on checklists for all
  using (exists (
    select 1 from tasks t where t.id = task_id and user_can_edit_list(t.list_id)
  ))
  with check (exists (
    select 1 from tasks t where t.id = task_id and user_can_edit_list(t.list_id)
  ));

create policy "checklist_items: read via checklist"
  on checklist_items for select
  using (exists (
    select 1 from checklists c
    join tasks t on t.id = c.task_id
    where c.id = checklist_id and user_can_read_list(t.list_id)
  ));

create policy "checklist_items: write via checklist"
  on checklist_items for all
  using (exists (
    select 1 from checklists c
    join tasks t on t.id = c.task_id
    where c.id = checklist_id and user_can_edit_list(t.list_id)
  ))
  with check (exists (
    select 1 from checklists c
    join tasks t on t.id = c.task_id
    where c.id = checklist_id and user_can_edit_list(t.list_id)
  ));

-- ==================== COMMENTS ====================
create policy "comments: read via task"
  on comments for select
  using (exists (
    select 1 from tasks t where t.id = task_id and user_can_read_list(t.list_id)
  ));

create policy "comments: write own via task"
  on comments for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from tasks t where t.id = task_id and user_can_read_list(t.list_id))
  );

create policy "comments: update own"
  on comments for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "comments: delete own"
  on comments for delete
  using (author_id = auth.uid());

-- ==================== TASK ACTIVITY ====================
create policy "activity: read via task"
  on task_activity for select
  using (exists (
    select 1 from tasks t where t.id = task_id and user_can_read_list(t.list_id)
  ));

-- Writes happen through the service-role admin client; no policy needed,
-- but allow self-attribution from regular clients too.
create policy "activity: insert own actor"
  on task_activity for insert
  with check (actor_id = auth.uid() or actor_id is null);

-- ==================== ATTACHMENTS ====================
create policy "attachments: read via task"
  on attachments for select
  using (exists (
    select 1 from tasks t where t.id = task_id and user_can_read_list(t.list_id)
  ));

create policy "attachments: write via task"
  on attachments for all
  using (exists (
    select 1 from tasks t where t.id = task_id and user_can_edit_list(t.list_id)
  ))
  with check (exists (
    select 1 from tasks t where t.id = task_id and user_can_edit_list(t.list_id)
  ));
