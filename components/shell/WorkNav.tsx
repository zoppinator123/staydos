"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  MoreHorizontal,
  Edit3,
  Archive,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  createSpace,
  createList,
  updateSpace,
  archiveSpace,
  deleteSpace,
  updateList,
  archiveList,
  deleteList,
  updateFolder,
  archiveFolder,
  deleteFolder,
} from "@/lib/work/actions";
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

// ---- Reusable inline rename input ----
function InlineRename({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && val.trim()) onSave(val.trim());
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => { if (val.trim() && val.trim() !== defaultValue) onSave(val.trim()); else onCancel(); }}
      className="flex-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-xs text-chrome-foreground-soft outline-none focus:border-white/20 min-w-0"
    />
  );
}

// ---- Confirm inline dialog ----
function ConfirmInline({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-2 py-1 flex flex-col gap-1">
      <p className="text-[10px] text-chrome-muted">{label}</p>
      <div className="flex gap-1">
        <button
          className="flex-1 rounded bg-red-700 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-600"
          onClick={onConfirm}
        >
          Delete
        </button>
        <button
          className="flex-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-chrome-foreground-soft hover:bg-white/15"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---- useClickOutside hook ----
function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

// ---- Space popover ----
function SpaceSettingsMenu({
  space,
  onClose,
}: {
  space: Space;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "rename" | "color" | "confirmDelete">("menu");
  const [colorVal, setColorVal] = useState(space.color ?? "#6366f1");

  async function handleRename(name: string) {
    await updateSpace(space.id, { name });
    onClose();
    router.refresh();
  }

  async function handleColorSave() {
    await updateSpace(space.id, { color: colorVal });
    onClose();
    router.refresh();
  }

  async function handleArchive() {
    await archiveSpace(space.id);
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    await deleteSpace(space.id);
    onClose();
    router.refresh();
  }

  if (mode === "rename") {
    return (
      <div className="px-2 py-2">
        <p className="text-[10px] text-chrome-faint mb-1">Rename space</p>
        <InlineRename
          defaultValue={space.name}
          onSave={handleRename}
          onCancel={onClose}
        />
      </div>
    );
  }

  if (mode === "color") {
    return (
      <div className="px-2 py-2 flex flex-col gap-2">
        <p className="text-[10px] text-chrome-faint">Space color</p>
        <input
          type="color"
          value={colorVal}
          onChange={(e) => setColorVal(e.target.value)}
          className="w-full h-8 rounded cursor-pointer border border-white/10 bg-transparent"
        />
        <div className="flex gap-1">
          <button
            className="flex-1 rounded bg-accent px-1.5 py-0.5 text-[10px] text-white hover:opacity-90"
            onClick={handleColorSave}
          >
            Save
          </button>
          <button
            className="flex-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-chrome-foreground-soft hover:bg-white/15"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <ConfirmInline
        label={`Delete "${space.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setMode("menu")}
      />
    );
  }

  return (
    <div className="py-1">
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={() => setMode("rename")}
      >
        <Edit3 size={11} />
        Rename
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={() => setMode("color")}
      >
        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: space.color ?? "#6366f1" }} />
        Edit color
      </button>
      <div className="my-1 border-t border-white/10" />
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={handleArchive}
      >
        <Archive size={11} />
        Archive
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
        onClick={() => setMode("confirmDelete")}
      >
        <Trash2 size={11} />
        Delete
      </button>
    </div>
  );
}

// ---- List row "..." popover ----
function ListRowMenu({
  list,
  onClose,
}: {
  list: List;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "rename" | "confirmDelete">("menu");

  async function handleRename(name: string) {
    await updateList(list.id, { name });
    onClose();
    router.refresh();
  }

  async function handleArchive() {
    await archiveList(list.id);
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    await deleteList(list.id);
    onClose();
    router.refresh();
  }

  if (mode === "rename") {
    return (
      <div className="px-2 py-2">
        <p className="text-[10px] text-chrome-faint mb-1">Rename list</p>
        <InlineRename defaultValue={list.name} onSave={handleRename} onCancel={onClose} />
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <ConfirmInline
        label={`Delete "${list.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setMode("menu")}
      />
    );
  }

  return (
    <div className="py-1">
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={() => setMode("rename")}
      >
        <Edit3 size={11} />
        Rename
      </button>
      <div className="my-1 border-t border-white/10" />
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={handleArchive}
      >
        <Archive size={11} />
        Archive
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
        onClick={() => setMode("confirmDelete")}
      >
        <Trash2 size={11} />
        Delete
      </button>
    </div>
  );
}

// ---- Folder row "..." popover ----
function FolderRowMenu({
  folder,
  onClose,
}: {
  folder: FolderType;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "rename" | "confirmDelete">("menu");

  async function handleRename(name: string) {
    await updateFolder(folder.id, { name });
    onClose();
    router.refresh();
  }

  async function handleArchive() {
    await archiveFolder(folder.id);
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    await deleteFolder(folder.id);
    onClose();
    router.refresh();
  }

  if (mode === "rename") {
    return (
      <div className="px-2 py-2">
        <p className="text-[10px] text-chrome-faint mb-1">Rename folder</p>
        <InlineRename defaultValue={folder.name} onSave={handleRename} onCancel={onClose} />
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <ConfirmInline
        label={`Delete "${folder.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setMode("menu")}
      />
    );
  }

  return (
    <div className="py-1">
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={() => setMode("rename")}
      >
        <Edit3 size={11} />
        Rename
      </button>
      <div className="my-1 border-t border-white/10" />
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={handleArchive}
      >
        <Archive size={11} />
        Archive
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
        onClick={() => setMode("confirmDelete")}
      >
        <Trash2 size={11} />
        Delete
      </button>
    </div>
  );
}

// ---- Popover wrapper with click-outside ----
// Renders fixed-position to escape any parent overflow clipping. Anchored to the
// triggering button's bounding rect; opens below + right-aligned by default.
function Popover({
  children,
  onClose,
  anchorRef,
}: {
  children: React.ReactNode;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function compute() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const menuW = 180;
      // Place below the anchor, opening to the right with a small leftward bias
      // so it doesn't extend off-screen.
      let left = r.left;
      const maxLeft = window.innerWidth - menuW - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 4, left });
    }
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [anchorRef]);

  if (!pos) return null;

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      className="z-[100] min-w-[180px] rounded-md border border-white/10 bg-chrome-popover shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

// ---- ListRow with hover "..." ----
function ListRow({ list, active }: { list: List; active: boolean }) {
  const [showMenu, setShowMenu] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="group relative flex items-center">
      <Link
        href={`/work/list/${list.id}`}
        className={`flex flex-1 items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
          active
            ? "bg-white/10 text-white"
            : "text-chrome-muted hover:text-white hover:bg-white/5"
        }`}
      >
        {getListIcon(list.type)}
        <span className="truncate">{list.name}</span>
      </Link>
      {/* ... button on hover */}
      <button
        ref={btnRef}
        className="mr-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground-soft hover:bg-white/10 transition-colors"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu((v) => !v); }}
      >
        <MoreHorizontal size={11} />
      </button>
      {showMenu && (
        <Popover onClose={() => setShowMenu(false)} anchorRef={btnRef}>
          <ListRowMenu list={list} onClose={() => setShowMenu(false)} />
        </Popover>
      )}
    </div>
  );
}

// ---- FolderNode with hover "..." ----
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
  const [showMenu, setShowMenu] = useState(false);
  const folderBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <div className="group relative flex items-center">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left rounded-md hover:bg-white/5 transition-colors"
        >
          {expanded ? (
            <ChevronDown size={12} className="text-chrome-faint shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-chrome-faint shrink-0" />
          )}
          <Folder size={13} className="text-chrome-faint shrink-0" />
          <span className="truncate text-xs text-chrome-muted">{folder.name}</span>
        </button>
        {/* ... button on hover */}
        <button
          ref={folderBtnRef}
          className="mr-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground-soft hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
        >
          <MoreHorizontal size={11} />
        </button>
        {showMenu && (
          <Popover onClose={() => setShowMenu(false)} anchorRef={folderBtnRef}>
            <FolderRowMenu folder={folder} onClose={() => setShowMenu(false)} />
          </Popover>
        )}
      </div>
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

// ---- SpaceNode with settings icon ----
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
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const spaceBtnRef = useRef<HTMLButtonElement>(null);

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
            <ChevronDown size={12} className="text-chrome-faint shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-chrome-faint shrink-0" />
          )}
          <span className="truncate text-sm text-chrome-foreground-soft font-medium">{space.name}</span>
        </button>
        <div className="hidden group-hover:flex items-center gap-0.5">
          {/* Space settings popover */}
          <button
            ref={spaceBtnRef}
            aria-label="Space settings"
            className="flex h-5 w-5 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground-soft"
            onClick={(e) => { e.stopPropagation(); setShowSpaceMenu((v) => !v); }}
          >
            <Settings size={11} />
          </button>
          {showSpaceMenu && (
            <Popover onClose={() => setShowSpaceMenu(false)} anchorRef={spaceBtnRef}>
              <SpaceSettingsMenu space={space} onClose={() => setShowSpaceMenu(false)} />
            </Popover>
          )}
          <button
            onClick={() => setAddingList(true)}
            aria-label="Add list"
            className="flex h-5 w-5 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground-soft"
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
                className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-chrome-foreground-soft outline-none focus:border-white/20"
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

const WORKNAV_STORAGE_KEY = "staydos:workNavCollapsed";

/**
 * The space/folder/list tree body. Shared by the desktop WorkNav rail and the
 * mobile nav drawer so the navigation tree lives in exactly one place.
 */
export function WorkNavTree({ spaces, folders, lists }: WorkNavProps) {
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
    <>
      {/* All Tasks link */}
      <Link
        href="/work/tasks"
        className={`flex items-center gap-2 px-4 py-1.5 text-sm mx-1 rounded-md transition-colors ${
          pathname === "/work/tasks"
            ? "bg-white/10 text-white font-medium"
            : "text-chrome-muted hover:text-white hover:bg-white/5"
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
              className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-chrome-foreground-soft outline-none focus:border-white/20"
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
            className="flex items-center gap-1.5 text-xs text-chrome-faint hover:text-chrome-foreground-soft transition-colors w-full"
          >
            <Plus size={13} />
            New Space
          </button>
        )}
      </div>
    </>
  );
}

export function WorkNav({ spaces, folders, lists }: WorkNavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted collapse state after hydration
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WORKNAV_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "1") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(WORKNAV_STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  // When collapsed (after hydration), render a slim rail with just a toggle button
  if (hydrated && collapsed) {
    return (
      <nav
        className="hidden md:flex flex-col w-[40px] shrink-0 items-center py-3 transition-[width] duration-150 bg-chrome-alt2"
        aria-label="Work navigation (collapsed)"
      >
        <button
          onClick={toggleCollapsed}
          aria-label="Expand work navigation"
          title="Expand"
          className="flex h-7 w-7 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground hover:bg-white/5 transition-colors"
        >
          <PanelLeftOpen size={15} />
        </button>
      </nav>
    );
  }

  return (
    <nav
      className="hidden md:flex flex-col w-[220px] shrink-0 overflow-y-auto py-3 transition-[width] duration-150 bg-chrome-alt2"
      aria-label="Work navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-1 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-chrome-faint select-none">
          WORK
        </p>
        <button
          onClick={toggleCollapsed}
          aria-label="Collapse work navigation"
          title="Collapse"
          className="flex h-6 w-6 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground hover:bg-white/5 transition-colors"
        >
          <PanelLeftClose size={13} />
        </button>
      </div>

      <WorkNavTree spaces={spaces} folders={folders} lists={lists} />
    </nav>
  );
}
