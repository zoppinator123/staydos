-- Full Work/Task Management Schema (Haven-OS parity)

create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#6366f1',
  icon text not null default 'folder',
  "order" integer not null default 0,
  privacy text not null default 'private' check (privacy in ('team', 'private')),
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists space_members (
  space_id uuid references spaces(id) on delete cascade,
  profile_id uuid not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  added_at timestamptz not null default now(),
  primary key (space_id, profile_id)
);

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  personal_owner_id uuid,
  name text not null,
  description text,
  "order" integer not null default 0,
  type text not null default 'shared' check (type in ('private', 'shared', 'public')),
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  status_id uuid,
  parent_id uuid references tasks(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low','none')),
  due_date timestamptz,
  start_date timestamptz,
  time_estimate integer,
  "order" numeric not null default 0,
  custom_fields jsonb not null default '{}',
  assignee_ids uuid[] not null default '{}',
  tags text[] not null default '{}',
  archived_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recurrence_rule jsonb,
  recurrence_count integer not null default 0
);

create table if not exists statuses (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  name text not null,
  color text not null,
  category text not null check (category in ('todo','in_progress','done','closed')),
  "order" integer not null default 0
);

create table if not exists custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  name text not null,
  field_type text not null,
  config jsonb not null default '{}',
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references checklists(id) on delete cascade,
  content text not null,
  completed boolean not null default false,
  assignee_id uuid,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  actor_id uuid,
  action text not null,
  from_value jsonb,
  to_value jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Updated at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();

create trigger update_lists_updated_at before update on lists
  for each row execute function update_updated_at_column();

create trigger update_spaces_updated_at before update on spaces
  for each row execute function update_updated_at_column();