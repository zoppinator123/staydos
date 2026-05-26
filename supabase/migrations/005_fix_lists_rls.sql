-- Fix: RLS policies on `lists` were calling helper functions (`user_can_read_list`,
-- `user_can_edit_list`) that select from the same `lists` table. Postgres `stable`
-- SQL functions can use a transaction snapshot that doesn't include the just-inserted
-- row, causing `INSERT ... RETURNING *` to fail with 42501 even though the user is
-- the creator and a member of the space. We inline the conditions directly into the
-- policies so they evaluate against the new row in scope.

-- --- LISTS ---
drop policy if exists "lists: readable when user has list access" on lists;
create policy "lists: readable when user has list access"
  on lists for select
  using (
    auth.uid() is not null
    and (
      personal_owner_id = auth.uid()
      or exists (
        select 1 from list_members lm
        where lm.list_id = lists.id and lm.profile_id = auth.uid()
      )
      or (
        space_id is not null
        and exists (
          select 1 from space_members sm
          where sm.space_id = lists.space_id and sm.profile_id = auth.uid()
        )
      )
      or type = 'public'
    )
  );

drop policy if exists "lists: editors can update" on lists;
create policy "lists: editors can update"
  on lists for update
  using (
    auth.uid() is not null
    and (
      personal_owner_id = auth.uid()
      or exists (
        select 1 from list_members lm
        where lm.list_id = lists.id and lm.profile_id = auth.uid()
          and lm.access_level in ('editor', 'admin')
      )
      or (
        space_id is not null
        and exists (
          select 1 from space_members sm
          where sm.space_id = lists.space_id and sm.profile_id = auth.uid()
            and sm.role in ('admin', 'member')
        )
      )
    )
  )
  with check (
    auth.uid() is not null
    and (
      personal_owner_id = auth.uid()
      or exists (
        select 1 from list_members lm
        where lm.list_id = lists.id and lm.profile_id = auth.uid()
          and lm.access_level in ('editor', 'admin')
      )
      or (
        space_id is not null
        and exists (
          select 1 from space_members sm
          where sm.space_id = lists.space_id and sm.profile_id = auth.uid()
            and sm.role in ('admin', 'member')
        )
      )
    )
  );

drop policy if exists "lists: editors can delete" on lists;
create policy "lists: editors can delete"
  on lists for delete
  using (
    auth.uid() is not null
    and (
      personal_owner_id = auth.uid()
      or exists (
        select 1 from list_members lm
        where lm.list_id = lists.id and lm.profile_id = auth.uid()
          and lm.access_level in ('editor', 'admin')
      )
      or (
        space_id is not null
        and exists (
          select 1 from space_members sm
          where sm.space_id = lists.space_id and sm.profile_id = auth.uid()
            and sm.role = 'admin'
        )
      )
    )
  );
