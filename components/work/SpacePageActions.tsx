"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { createFolder, createList } from "@/lib/work/actions";
import type { ListType } from "@/lib/work/types";

export function SpacePageActions({ spaceId }: { spaceId: string }) {
  const [folderOpen, setFolderOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [listName, setListName] = useState("");
  const [listType, setListType] = useState<ListType>("shared");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function addFolder() {
    if (!folderName.trim()) return;
    startTransition(async () => {
      await createFolder({ space_id: spaceId, name: folderName.trim() });
      setFolderName("");
      setFolderOpen(false);
      router.refresh();
    });
  }

  function addList() {
    if (!listName.trim()) return;
    startTransition(async () => {
      const created = await createList({
        space_id: spaceId,
        name: listName.trim(),
        type: listType,
      });
      setListName("");
      setListOpen(false);
      router.push(`/work/list/${created.id}`);
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => setFolderOpen(true)}>
        New folder
      </Button>
      <Button size="sm" onClick={() => setListOpen(true)}>
        New list
      </Button>

      <Modal
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        title="New folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addFolder} disabled={pending || !folderName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <Label>Folder name</Label>
        <Input
          autoFocus
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFolder()}
        />
      </Modal>

      <Modal
        open={listOpen}
        onClose={() => setListOpen(false)}
        title="New list"
        footer={
          <>
            <Button variant="ghost" onClick={() => setListOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addList} disabled={pending || !listName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>List name</Label>
            <Input
              autoFocus
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addList()}
            />
          </div>
          <div>
            <Label>Visibility</Label>
            <Select
              value={listType}
              onChange={(e) => setListType(e.target.value as ListType)}
              options={[
                { value: "private", label: "Private" },
                { value: "shared", label: "Shared" },
                { value: "public", label: "Public" },
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
