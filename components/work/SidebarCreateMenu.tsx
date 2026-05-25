"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { createSpace } from "@/lib/work/actions";

export function SidebarCreateMenu() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setColor("#6366f1");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createSpace({ name: name.trim(), description: description.trim() || null, color });
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create space");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="New space"
        className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 2.5v9M2.5 7h9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Create a Space"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim()}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing, Engineering, …"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <Label>Color</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
