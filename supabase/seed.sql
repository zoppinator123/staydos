-- Optional seed data for local Supabase development.
-- Run AFTER the migrations and AFTER creating a user via Supabase Auth.
-- Replace :user_id with the actual auth.users.id you want to seed for.

-- Example (psql variables):
--   psql ... -v user_id="'<uuid>'" -f supabase/seed.sql

begin;

-- A demo space
insert into spaces (name, description, color, icon, "order", privacy, created_by)
values ('Demo Space', 'Sample data for getting started', '#6366f1', 'folder', 0, 'private', :user_id)
returning id \gset

insert into space_members (space_id, profile_id, role)
values (:'id', :user_id, 'admin');

-- A folder
insert into folders (space_id, name, "order", created_by)
values (:'id', 'Onboarding', 0, :user_id)
returning id as folder_id \gset

-- A list
insert into lists (space_id, folder_id, name, type, "order", created_by)
values (:'id', :'folder_id', 'Getting Started', 'shared', 0, :user_id)
returning id as list_id \gset

-- Default statuses
insert into statuses (list_id, name, color, category, "order") values
  (:'list_id', 'To Do', '#9ca3af', 'todo', 0),
  (:'list_id', 'In Progress', '#3b82f6', 'in_progress', 1),
  (:'list_id', 'Done', '#22c55e', 'done', 2),
  (:'list_id', 'Closed', '#64748b', 'closed', 3);

-- List ownership
insert into list_members (list_id, profile_id, role, access_level)
values (:'list_id', :user_id, 'owner', 'admin');

-- Sample tasks
insert into tasks (list_id, title, description, priority, "order", created_by, status_id)
values
  (:'list_id', 'Welcome to Staydos', 'Edit or delete me. Click to open task details.', 'high', 0, :user_id,
    (select id from statuses where list_id = :'list_id' and category = 'todo' limit 1)),
  (:'list_id', 'Try drag-and-drop ordering', 'Drag rows to reorder.', 'normal', 1, :user_id,
    (select id from statuses where list_id = :'list_id' and category = 'todo' limit 1)),
  (:'list_id', 'Add a checklist or comment', null, 'low', 2, :user_id,
    (select id from statuses where list_id = :'list_id' and category = 'in_progress' limit 1));

commit;
