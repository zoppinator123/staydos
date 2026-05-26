import Link from "next/link";
import { getSpaces, getFolders, getLists } from "@/lib/work/actions";
import type { Folder, List, Space } from "@/lib/work/types";
import { SidebarCreateMenu } from "./SidebarCreateMenu";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { getCurrentUser } from "@/lib/auth/actions";

interface Props {
  activeListId?: string;
  activeSpaceId?: string;
}

export async function Sidebar({ activeListId, activeSpaceId }: Props) {
  const [spaces, user] = await Promise.all([getSpaces(), getCurrentUser()]);

  // Pre-fetch folders + lists for all spaces, in parallel
  const perSpace = await Promise.all(
    spaces.map(async (sp) => {
      const [folders, lists] = await Promise.all([getFolders(sp.id), getLists({ spaceId: sp.id })]);
      return { space: sp, folders, lists };
    })
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-2 border-r border-zinc-200 bg-zinc-50 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 pb-2">
        <Link
          href="/work"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Staydos
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <SidebarCreateMenu />
        </div>
      </div>

      <nav className="space-y-0.5 px-2 pb-2">
        <SidebarLink href="/dashboard" label="Dashboard" />
        <SidebarLink href="/work" label="All Work" active={!activeListId && !activeSpaceId} />
        <SidebarLink href="/my-tasks" label="My Tasks" />
      </nav>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Spaces
        </div>
        {perSpace.length === 0 ? (
          <p className="px-2 py-3 text-xs text-zinc-500">
            No spaces yet. Click + to create one.
          </p>
        ) : (
          perSpace.map(({ space, folders, lists }) => (
            <SpaceItem
              key={space.id}
              space={space}
              folders={folders}
              lists={lists}
              activeListId={activeListId}
              activeSpaceId={activeSpaceId}
            />
          ))
        )}
      </div>

      <div className="border-t border-zinc-200 px-2 pt-2 dark:border-zinc-800">
        <UserMenu email={user?.email ?? null} />
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}

function SpaceItem({
  space,
  folders,
  lists,
  activeListId,
  activeSpaceId,
}: {
  space: Space;
  folders: Folder[];
  lists: List[];
  activeListId?: string;
  activeSpaceId?: string;
}) {
  const folderLists = folders.map((f) => ({
    folder: f,
    lists: lists.filter((l) => l.folder_id === f.id),
  }));
  const rootLists = lists.filter((l) => !l.folder_id);

  const spaceActive = space.id === activeSpaceId;

  return (
    <details open className="group mt-1">
      <summary className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: space.color }}
        />
        <Link
          href={`/work/space/${space.id}`}
          className={`flex-1 truncate ${spaceActive ? "text-indigo-700 dark:text-indigo-300" : ""}`}
        >
          {space.name}
        </Link>
      </summary>
      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
        {folderLists.map(({ folder, lists }) => (
          <details key={folder.id} open className="group">
            <summary className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900">
              {folder.name}
            </summary>
            <div className="ml-2 mt-0.5 space-y-0.5">
              {lists.map((l) => (
                <ListLink key={l.id} list={l} active={l.id === activeListId} />
              ))}
            </div>
          </details>
        ))}
        {rootLists.map((l) => (
          <ListLink key={l.id} list={l} active={l.id === activeListId} />
        ))}
        {rootLists.length === 0 && folderLists.length === 0 ? (
          <p className="px-2 py-1 text-[11px] text-zinc-400">No lists</p>
        ) : null}
      </div>
    </details>
  );
}

function ListLink({ list, active }: { list: List; active?: boolean }) {
  return (
    <Link
      href={`/work/list/${list.id}`}
      className={`block truncate rounded-md px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {list.name}
    </Link>
  );
}
