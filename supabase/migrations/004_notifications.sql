-- Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid,
  type text not null check (type in ('mention','assigned','comment','due_soon')),
  task_id uuid references tasks(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on notifications(recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on notifications(recipient_id) where read_at is null;
create index if not exists notifications_task_idx on notifications(task_id);

alter table notifications enable row level security;

drop policy if exists "Recipients can read their notifications" on notifications;
create policy "Recipients can read their notifications" on notifications
  for select using (auth.uid() = recipient_id);

drop policy if exists "Recipients can update their notifications" on notifications;
create policy "Recipients can update their notifications" on notifications
  for update using (auth.uid() = recipient_id);

-- Inserts happen from server with service role; no insert policy needed.
