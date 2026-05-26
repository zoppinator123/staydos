"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addComment, deleteComment, getComments, updateComment } from "@/lib/work/actions";
import { getCurrentUserClient } from "@/lib/auth/client";
import { relativeTime } from "@/lib/utils/time";
import type { CommentWithAuthor } from "@/lib/work/types";
import { MentionTextarea } from "./MentionTextarea";

interface Props {
  taskId: string;
}

function avatarInitials(name: string | null, email: string | null): string {
  const src = name ?? email ?? "?";
  return src.slice(0, 2).toUpperCase();
}

function avatarColor(id: string): string {
  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-sky-500",
    "bg-teal-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-emerald-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ id, name, email }: { id: string; name: string | null; email: string | null }) {
  return (
    <div
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor(id)}`}
      title={name ?? email ?? id}
    >
      {avatarInitials(name, email)}
    </div>
  );
}

/**
 * Render comment body with @email@stayd.co mentions highlighted.
 */
function CommentBody({ body }: { body: string }) {
  const MENTION_RE = /@([A-Za-z0-9._%+-]+@stayd\.co)\b/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_RE.exec(body)) !== null) {
    if (match.index > last) {
      parts.push(body.slice(last, match.index));
    }
    parts.push(
      <span
        key={match.index}
        className="font-medium text-indigo-600 dark:text-indigo-400"
      >
        @{match[1]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < body.length) {
    parts.push(body.slice(last));
  }

  return (
    <div className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
      {parts}
    </div>
  );
}

export function CommentsPanel({ taskId }: Props) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [cs, user] = await Promise.all([getComments(taskId), getCurrentUserClient()]);
      if (cancelled) return;
      setComments(cs);
      setCurrentUserId(user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  function handlePost() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const newComment = await addComment({ taskId, body: trimmed });
      // Build optimistic CommentWithAuthor
      const hydrated: CommentWithAuthor = {
        ...newComment,
        author_email: null,
        author_name: null,
      };
      setComments((cur) => [hydrated, ...cur].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      setBody("");
    });
  }

  function handleEdit(c: CommentWithAuthor) {
    setEditingId(c.id);
    setEditBody(c.body);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  function handleSaveEdit(id: string) {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const updated = await updateComment(id, trimmed);
      setComments((cur) =>
        cur.map((c) =>
          c.id === id ? { ...c, body: updated.body, updated_at: updated.updated_at } : c
        )
      );
      setEditingId(null);
      setEditBody("");
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
  }

  function handleConfirmDelete(id: string) {
    startTransition(async () => {
      await deleteComment(id);
      setComments((cur) => cur.filter((c) => c.id !== id));
      setDeletingId(null);
    });
  }

  function handleCancelDelete() {
    setDeletingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handlePost();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Comment list */}
      <div ref={listRef} className="flex flex-col gap-2">
        {comments.length === 0 ? (
          <p className="text-xs text-zinc-500">No comments yet. Be the first to comment.</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              id={`comment-${c.id}`}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Header */}
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar id={c.author_id} name={c.author_name} email={c.author_email} />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {c.author_name ?? c.author_email ?? "Unknown"}
                </span>
                <span className="ml-auto text-xs text-zinc-400" title={new Date(c.created_at).toLocaleString()}>
                  {relativeTime(c.created_at)}
                </span>
              </div>

              {/* Body or edit form */}
              {editingId === c.id ? (
                <div className="flex flex-col gap-1.5">
                  <MentionTextarea
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    rows={3}
                    value={editBody}
                    onChange={setEditBody}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={pending || !editBody.trim()}
                      className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : deletingId === c.id ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Delete this comment?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmDelete(c.id)}
                      disabled={pending}
                      className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="rounded px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <CommentBody body={c.body} />
                  {c.author_id === currentUserId && (
                    <div className="mt-1.5 flex gap-3">
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-xs text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="flex flex-col gap-1.5">
        <MentionTextarea
          value={body}
          onChange={setBody}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment… (Ctrl+Enter to submit, @ to mention)"
          rows={2}
        />
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={pending || !body.trim()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
