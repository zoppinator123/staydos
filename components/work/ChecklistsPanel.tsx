"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createChecklist,
  createChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  getChecklists,
  updateChecklistItem,
} from "@/lib/work/actions";
import type { Checklist, ChecklistItem } from "@/lib/work/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type ChecklistWithItems = Checklist & { items: ChecklistItem[] };

export function ChecklistsPanel({ taskId }: { taskId: string }) {
  const [lists, setLists] = useState<ChecklistWithItems[]>([]);
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const data = (await getChecklists(taskId)) as ChecklistWithItems[];
      if (!cancel) setLists(data);
    })();
    return () => {
      cancel = true;
    };
  }, [taskId]);

  function addList() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const c = await createChecklist({ task_id: taskId, name: newName.trim() });
      setLists((cur) => [...cur, { ...c, items: [] }]);
      setNewName("");
    });
  }

  function removeList(id: string) {
    startTransition(async () => {
      await deleteChecklist(id);
      setLists((cur) => cur.filter((l) => l.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New checklist…"
          onKeyDown={(e) => e.key === "Enter" && addList()}
        />
        <Button onClick={addList} disabled={pending || !newName.trim()}>
          Add
        </Button>
      </div>

      {lists.length === 0 ? (
        <p className="text-xs text-zinc-500">No checklists yet.</p>
      ) : null}

      {lists.map((cl) => (
        <ChecklistBlock
          key={cl.id}
          checklist={cl}
          onChange={(items) =>
            setLists((cur) => cur.map((x) => (x.id === cl.id ? { ...x, items } : x)))
          }
          onRemove={() => removeList(cl.id)}
        />
      ))}
    </div>
  );
}

function ChecklistBlock({
  checklist,
  onChange,
  onRemove,
}: {
  checklist: ChecklistWithItems;
  onChange: (items: ChecklistItem[]) => void;
  onRemove: () => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [pending, startTransition] = useTransition();

  function addItem() {
    if (!newItem.trim()) return;
    startTransition(async () => {
      const item = await createChecklistItem({
        checklist_id: checklist.id,
        content: newItem.trim(),
      });
      onChange([...checklist.items, item]);
      setNewItem("");
    });
  }

  function toggle(item: ChecklistItem) {
    startTransition(async () => {
      const updated = await updateChecklistItem(item.id, { completed: !item.completed });
      onChange(checklist.items.map((i) => (i.id === item.id ? updated : i)));
    });
  }

  function remove(item: ChecklistItem) {
    startTransition(async () => {
      await deleteChecklistItem(item.id);
      onChange(checklist.items.filter((i) => i.id !== item.id));
    });
  }

  const done = checklist.items.filter((i) => i.completed).length;

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">
          {checklist.name}{" "}
          <span className="ml-1 text-xs text-zinc-500">
            {done}/{checklist.items.length}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-red-600 hover:underline"
          disabled={pending}
        >
          remove
        </button>
      </div>
      <ul className="space-y-1">
        {checklist.items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={i.completed}
              onChange={() => toggle(i)}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className={i.completed ? "flex-1 text-zinc-400 line-through" : "flex-1"}>
              {i.content}
            </span>
            <button
              onClick={() => remove(i)}
              className="text-xs text-zinc-400 hover:text-red-600"
              aria-label="Remove item"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item…"
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button size="sm" onClick={addItem} disabled={pending || !newItem.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
