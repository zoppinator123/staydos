"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Edit3, Archive, Trash2, Type, FileText } from "lucide-react";
import { updateList, archiveList, deleteList } from "@/lib/work/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { List } from "@/lib/work/types";

type ListType = "private" | "shared" | "public";

interface ListHeaderActionsProps {
  list: List;
}

export function ListHeaderActions({ list }: ListHeaderActionsProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Modals
  const [renameOpen, setRenameOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form state
  const [renameVal, setRenameVal] = useState(list.name);
  const [descVal, setDescVal] = useState(list.description ?? "");
  const [typeVal, setTypeVal] = useState<ListType>((list.type as ListType) ?? "private");
  const [loading, setLoading] = useState(false);

  // Close menu on outside click (button + popover are in different DOM trees because of portal)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setShowMenu(false);
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  // Position the popover relative to the trigger, clamped to viewport
  useLayoutEffect(() => {
    if (!showMenu || !buttonRef.current) {
      setMenuPos(null);
      return;
    }
    function reposition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 192; // w-48
      const menuHeight = 240; // approx — clamp below
      const gap = 6;
      let top = rect.bottom + gap;
      let left = rect.right - menuWidth;
      // Clamp horizontally
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      // Flip vertically if not enough room below
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - gap);
      }
      setMenuPos({ top, left });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [showMenu]);

  async function handleRename() {
    if (!renameVal.trim()) return;
    setLoading(true);
    try {
      await updateList(list.id, { name: renameVal.trim() });
      setRenameOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDescSave() {
    setLoading(true);
    try {
      await updateList(list.id, { description: descVal.trim() || null });
      setDescOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleTypeSave() {
    setLoading(true);
    try {
      await updateList(list.id, { type: typeVal });
      setTypeOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    setLoading(true);
    try {
      await archiveList(list.id);
      router.push("/work");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteList(list.id);
      setDeleteOpen(false);
      router.push("/work");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          ref={buttonRef}
          className="ml-auto flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={() => setShowMenu((v) => !v)}
          title="List settings"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {mounted && showMenu && menuPos && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] w-48 rounded-card border border-border bg-surface shadow-card-hover overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            onClick={() => { setShowMenu(false); setRenameVal(list.name); setRenameOpen(true); }}
          >
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            onClick={() => { setShowMenu(false); setDescVal(list.description ?? ""); setDescOpen(true); }}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Edit description
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            onClick={() => { setShowMenu(false); setTypeOpen(true); }}
          >
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            Change type
          </button>
          <div className="my-1 border-t border-border" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            onClick={() => { setShowMenu(false); handleArchive(); }}
            disabled={loading}
          >
            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            Archive list
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            onClick={() => { setShowMenu(false); setDeleteOpen(true); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete list
          </button>
        </div>,
        document.body
      )}

      {/* Rename modal */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename List">
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            placeholder="List name"
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={loading || !renameVal.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit description modal */}
      <Modal open={descOpen} onClose={() => setDescOpen(false)} title="Edit Description">
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={descVal}
            onChange={(e) => setDescVal(e.target.value)}
            placeholder="List description (optional)"
            rows={4}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDescOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDescSave} disabled={loading}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change type modal */}
      <Modal open={typeOpen} onClose={() => setTypeOpen(false)} title="Change List Type">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {(["private", "shared", "public"] as ListType[]).map((t) => (
              <label key={t} className="flex items-center gap-3 cursor-pointer rounded-md border border-border px-3 py-2.5 hover:bg-muted transition-colors">
                <input
                  type="radio"
                  name="listType"
                  value={t}
                  checked={typeVal === t}
                  onChange={() => setTypeVal(t)}
                  className="accent-accent"
                />
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{t}</p>
                  <p className="text-xs text-muted-foreground">
                    {t === "private" && "Only you and explicitly added members"}
                    {t === "shared" && "All space members can view and edit"}
                    {t === "public" && "Anyone in the organization"}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTypeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTypeSave} disabled={loading}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete List">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Are you sure you want to permanently delete <strong>{list.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="bg-danger text-white hover:bg-danger/90"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
