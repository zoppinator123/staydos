# Staydos

Full-featured work and task management platform — Haven-OS parity, zero features removed.

## Stack

- **Next.js 16** (App Router, Turbopack, server actions)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **Supabase** (auth + Postgres)

## Feature parity with Haven-OS

- Spaces → Folders → Lists → Tasks
- Statuses per list (with category: todo / in_progress / done / closed)
- Priorities (urgent / high / normal / low / none)
- Due/start dates, time estimate
- **Recurring tasks** — daily, weekly, monthly, yearly with interval, by-weekday/month-day/month, count, until
- Custom fields per list (jsonb config)
- Checklists with checklist items (assignable, ordered)
- Comments (with edit history via `updated_at`)
- Per-task activity log
- Attachments
- **Full permission system**
  - Space members (`admin` / `member` / `viewer`)
  - List members (`owner` / `member`) with access levels (`viewer` / `editor` / `admin`)
  - List visibility (`private` / `shared` / `public`)
  - Personal lists via `personal_owner_id`
- **Global task views**: cross-space querying with filtering (list, space, status category, priority, assignees, tags, due window, search) + sort + pagination
- Drag-and-drop ordering for tasks (HTML5 DnD; native, no extra deps)

## Project layout

```
app/
  (auth)/login            # Email/password auth
  (work)/                  # Authenticated app shell
    work/                  # Dashboard ("All Work")
    work/space/[id]        # Space overview
    work/list/[id]         # List view with task table
    my-tasks               # Tasks assigned to current user
components/
  ui/                      # Button / Input / Modal / Badge
  work/                    # Sidebar, TaskTable, TaskEditModal, etc.
lib/
  supabase/                # client.ts (browser) / server.ts (RSC) / admin.ts (service role)
  work/
    types.ts               # All Haven-OS types + input/query types
    actions.ts             # Server actions for every entity
    permissions.ts         # Space/list ACL + access-level resolver
    recurrence.ts          # Pure recurrence engine
    shared.ts              # db()/admin()/currentUserId()/logActivity()
supabase/
  migrations/
    001_full_work_system.sql   # Base tables (Haven-OS schema)
    002_indexes_and_extras.sql # list_members, attachments, indexes, view
  seed.sql                     # Optional sample data
```

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Apply migrations (Supabase CLI)
supabase db push
# or run the .sql files manually in the Supabase SQL editor, in order.

# 4. Run dev
npm run dev
```

Open <http://localhost:3000> → you'll be redirected to `/login`.
Sign up, then create your first Space from the sidebar `+` button.

## Recurrence

A task with a `recurrence_rule` will, on completion, spawn the next occurrence automatically — preserving its title, priority, assignees, tags, and custom fields, with the new `due_date` advanced via `nextOccurrence()`. The new task starts at the first `todo` status of the list. The original task is marked `completed_at` and rolled to a `done` status.

## Permissions

Effective list access is resolved as:

1. Personal list owner ⇒ `admin`
2. Explicit list_member ⇒ their `access_level` (owner role overrides to `admin`)
3. Space admin ⇒ `admin`
4. Space member ⇒ `editor`
5. Space viewer ⇒ `viewer`
6. Public list ⇒ `viewer`
7. Otherwise ⇒ no access

Server actions enforce minimum access where it matters (`createTask`, `updateTask`, `createStatus`, `createCustomField`, `moveTask`, etc.).

## License

Private — internal Stayd project.
