"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { updateList, archiveList, deleteList } from "@/lib/work/actions";
import type { List, ListType } from "@/lib/work/types";
import { useRouter } from "next/navigation";

export function ListHeader({ list }: { list: List }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [type, setType] = useState<ListType>(list.type);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      await updateList(list.id, { name, description, type });
      setOpen(false);
      router.refresh();
    });
  }

  function onArchive() {
    if (!confirm("Archive this list?")) return;
    startTransition(async () => {
      await archiveList(list.id);
      router.push("/work");
    });
  }

  function onDelete() {
    if (!confirm("Delete this list permanently? All tasks will be lost.")) return;
    startTransition(async () => {
      await deleteList(list.id);
      router.push("/work");
    });
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <div>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{list.name}</h1>
        {list.description ? (
          <p className="text-xs text-zinc-500">{list.description}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Edit list
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit list"
        footer={
          <>
            <Button variant="danger" onClick={onDelete} disabled={pending}>
              Delete
            </Button>
            <Button variant="ghost" onClick={onArchive} disabled={pending}>
              Archive
            </Button>
            <Button onClick={save} disabled={pending || !name.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Visibility</Label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as ListType)}
              options={[
                { value: "private", label: "Private (only members)" },
                { value: "shared", label: "Shared (space members)" },
                { value: "public", label: "Public (anyone in workspace)" },
              ]}
            />
          </div>
        </div>
      </Modal>
    </header>
  );
}
