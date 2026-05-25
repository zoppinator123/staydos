"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/work/actions";
import type { Task } from "@/lib/work/types";

interface Props {
  listId: string;
  onCreated?: (t: Task) => void;
}

export function NewTaskRow({ listId, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      const t = await createTask({ list_id: listId, title: title.trim() });
      onCreated?.(t);
      setTitle("");
    });
  }

  return (
    <div className="flex items-center gap-2 border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
      <span className="text-zinc-400">+</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add task…"
        className="flex-1 bg-transparent text-sm focus:outline-none"
        disabled={pending}
      />
    </div>
  );
}
