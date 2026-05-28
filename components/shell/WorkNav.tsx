"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Lock,
  Users,
  Globe,
  Plus,
  Settings,
  LayoutList,
} from "lucide-react";
import { createSpace, createList } from "@/lib/work/actions";
import type { Space, Folder as FolderType, List } from "@/lib/work/types";

interface WorkNavProps {
  spaces: Space[];
  folders: FolderType[];
  lists: List[];
}

function getListIcon(type: string) {
  switch (type) {
    case "private":
      return <Lock size={13} className="shrink-0" />;
    case "shared":
      return <Users size={13} className="shrink-0" />;
    case "public":
      return <Globe size={13} className="shrink-0" />;
    default:
      return <LayoutList size={13} className="shrink-0" />;
  }
}

interface SpaceNodeProps {
  space: Space;
  folders: FolderType[];
  lists: List[];
  activeListId: string | null;
}

function SpaceNode({ space, folders, lists, activeListId }: SpaceNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isPending, startTransition] = useTransition();

  const spaceFolders = folders.filter((f) => f.space_id === space.id);
  const rootLists = lists.filter((l) => l.space_id === space.id && !l.folder_id);

  function handleAddList() {
    if (!newListName.trim()) return;
    startTransition(async () => {
      await createList({ space_id: space.id, name: newListName.trim() });
      setNewListName("");
      setAddingList(false);
    });
  }

  return (
    <div>
      {/* Space row */}
      <div className="group flex items-center gap-1 px-3 py-1.5 rounded-md mx-1 hover:bg-white/5 transition-colors cursor-default">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse space" : "Expand space"}
          className="flex items-center gap-1.5 flex-1 text-left min-w-0"
        >
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: space.color ?? "#6366f1" }}
          />
          {expanded ? (
            <ChevronDown size={12} className="text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-zinc-500 shrink-0" />
          )}
          <span className="truncate text-sm text-zinc-300 font-medium">{space.name}</span>
        </button>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            aria-label="Space settings"
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
          >
            <Settings size={11} />
          </button>
          <button
            onClick={() => setAddingList(true)}
            aria-label="Add list"
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="pl-4">
          {/* Root lists (no folder) */}
          {rootLists.map((list) => (
            <ListRow key={list.id} list={list} active={list.id === activeListId} />
          ))}

          {/* Folders */}
          {spaceFolders.map((folder) => {
            const folderLists = lists.filter((l) => l.folder_id === folder.id);
            return (
              <FolderNode
                key={folder.id}
                folder={folder}
                lists={folderLists}
                activeListId={activeListId}
              />
            );
          })}

          {/* Add list inline form */}
          {addingList && (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddList();
                  if (e.key === "Escape") {
                    setAddingList(false);
                    setNewListName("");
                  }
                }}
                placeholder="List name…"
                className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-white/20"
                disabled={isPending}
              />
              <button
                onClick={handleAddList}
                disabled={isPending || !newListName.trim()}
                className="rounded bg-accent px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FolderNode({
  folder,
  lists,
  activeListId,
}: {
  folder: FolderType;
  lists: List[];
  activeListId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left rounded-md hover:bg-white/5 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={12} className="text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-zinc-500 shrink-0" />
        )}
        <Folder size={13} className="text-zinc-500 shrink-0" />
        <span className="truncate text-xs text-zinc-400">{folder.name}</span>
      </button>
      {expanded && (
        <div className="pl-4">
          {lists.map((list) => (
            <ListRow key={list.id} list={list} active={list.id === activeListId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListRow({ list, active }: { list: List; active: boolean }) {
  return (
    <Link
      href={`/work/list/${list.id}`}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {getListIcon(list.type)}
      <span className="truncate">{list.name}</span>
    </Link>
  );
}

export function WorkNav({ spaces, folders, lists }: WorkNavProps) {
  const pathname = usePathname();
  const [addingSpace, setAddingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isPending, startTransition] = useTransition();

  // Determine active list id from path
  const listMatch = pathname.match(/\/work\/list\/([^/]+)/);
  const activeListId = listMatch ? listMatch[1] : null;

  function handleAddSpace() {
    if (!newSpaceName.trim()) return;
    startTransition(async () => {
      await createSpace({ name: newSpaceName.trim() });
      setNewSpaceName("");
      setAddingSpace(false);
    });
  }

  return (
    <nav
      className="hidden md:flex flex-col w-[250px] shrink-0 overflow-y-auto py-3"
      style={{ background: "rgb(21 24 22)" }}
      aria-label="Work navigation"
    >
      {/* Header */}
      <div className="px-4 pb-1 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 select-none">
          WORK
        </p>
      </div>

      {/* All Tasks link */}
      <Link
        href="/work/tasks"
        className={`flex items-center gap-2 px-4 py-1.5 text-sm mx-1 rounded-md transition-colors ${
          pathname === "/work/tasks"
            ? "bg-white/10 text-white font-medium"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <LayoutList size={14} className="shrink-0" />
        All Tasks
      </Link>

      {/* Spaces */}
      <div className="mt-2 flex-1">
        {spaces.map((space) => (
          <SpaceNode
            key={space.id}
            space={space}
            folders={folders.filter((f) => f.space_id === space.id)}
            lists={lists}
            activeListId={activeListId}
          />
        ))}
      </div>

      {/* New Space button */}
      <div className="px-3 pt-2 pb-1 border-t border-white/5 mt-2">
        {addingSpace ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSpace();
                if (e.key === "Escape") {
                  setAddingSpace(false);
                  setNewSpaceName("");
                }
              }}
              placeholder="Space name…"
              className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-white/20"
              disabled={isPending}
            />
            <button
              onClick={handleAddSpace}
              disabled={isPending || !newSpaceName.trim()}
              className="rounded bg-accent px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSpace(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
          >
            <Plus size={13} />
            New Space
          </button>
        )}
      </div>

      {/* Mobile: details/summary fallback */}
      <details className="md:hidden px-3 pt-2">
        <summary className="cursor-pointer text-xs text-zinc-400">Work navigation</summary>
        <div className="pt-2">
          {spaces.map((space) => (
            <SpaceNode
              key={space.id}
              space={space}
              folders={folders.filter((f) => f.space_id === space.id)}
              lists={lists}
              activeListId={activeListId}
            />
          ))}
        </div>
      </details>
    </nav>
  );
}
