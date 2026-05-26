"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { createSpace } from "@/lib/work/actions";
import { useRouter } from "next/navigation";

/**
 * Friendly empty state for the /work page when no spaces exist.
 * Mirrors the SidebarCreateMenu flow.
 */
export function WorkEmptyState() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create space");
      }
    });
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
        <svg
          className="h-10 w-10 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
          />
        </svg>
      </div>

      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Welcome to Staydos
      </h2>
      <p className="mb-6 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Spaces help you organize work by team, project, or area. Create your first space to get
        started.
      </p>

      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Create your first space
      </button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title="Create a Space"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>
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
              onKeyDown={(e) => e.key === "Enter" && name.trim() && submit()}
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
    </div>
  );
}
