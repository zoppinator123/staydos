"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createAttachment,
  deleteAttachment,
  getAttachments,
} from "@/lib/work/actions";
import type { Attachment } from "@/lib/work/types";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function AttachmentsPanel({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const d = await getAttachments(taskId);
      if (!cancel) setItems(d);
    })();
    return () => {
      cancel = true;
    };
  }, [taskId]);

  function add() {
    if (!fileName.trim() || !fileUrl.trim()) return;
    startTransition(async () => {
      const a = await createAttachment({
        task_id: taskId,
        file_name: fileName.trim(),
        file_url: fileUrl.trim(),
      });
      setItems((cur) => [a, ...cur]);
      setFileName("");
      setFileUrl("");
      setShowNew(false);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteAttachment(id);
      setItems((cur) => cur.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500">No attachments yet.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <a
                href={a.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-indigo-700 hover:underline dark:text-indigo-300"
              >
                {a.file_name}
              </a>
              <span className="ml-2 text-xs text-zinc-400">
                {new Date(a.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => remove(a.id)}
                disabled={pending}
                className="ml-2 text-xs text-zinc-400 hover:text-red-600"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNew ? (
        <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <Label>File name</Label>
            <Input
              autoFocus
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="design-spec.pdf"
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add} disabled={pending || !fileName.trim() || !fileUrl.trim()}>
              Attach
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowNew(true)}>
          + Attach a link
        </Button>
      )}
    </div>
  );
}
