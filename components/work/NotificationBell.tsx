"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/work/actions";
import { relativeTime } from "@/lib/utils/time";
import type { NotificationWithMeta } from "@/lib/work/types";

const POLL_INTERVAL_MS = 30_000;

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function actorDisplay(n: NotificationWithMeta): string {
  if (n.actor_name) return n.actor_name;
  if (n.actor_email) return n.actor_email.split("@")[0];
  return "Someone";
}

function notificationText(n: NotificationWithMeta): string {
  const actor = actorDisplay(n);
  const task = n.task_title ? `"${n.task_title}"` : "a task";
  switch (n.type) {
    case "mention":
      return `${actor} mentioned you on ${task}`;
    case "assigned":
      return `${actor} assigned you to ${task}`;
    case "comment":
      return `${actor} commented on ${task}`;
    case "due_soon":
      return `${task} is due soon`;
    default:
      return `New notification`;
  }
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationWithMeta;
  onRead: (id: string, listId: string | null) => void;
}) {
  const isUnread = !notification.read_at;
  const excerpt =
    notification.type === "mention"
      ? (notification.metadata.excerpt as string | undefined)
      : undefined;

  return (
    <button
      onClick={() => onRead(notification.id, notification.task_list_id)}
      className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
        isUnread ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Unread dot */}
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            isUnread ? "bg-indigo-500" : "bg-transparent"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-zinc-800 dark:text-zinc-200">
            {notificationText(notification)}
          </p>
          {excerpt && (
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {excerpt}
            </p>
          )}
          <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {relativeTime(notification.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithMeta[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(() => {
    getUnreadNotificationCount()
      .then((n) => setCount(n))
      .catch(() => {
        // ignore
      });
  }, []);

  // Initial count + polling
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoadingNotifs(true);
      try {
        const ns = await getNotifications({ limit: 20 });
        setNotifications(ns);
      } catch {
        // ignore
      } finally {
        setLoadingNotifs(false);
      }
    }
  }

  async function handleRead(id: string, listId: string | null) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
    // Navigate to the list if we have one
    if (listId) {
      window.location.href = `/work/list/${listId}`;
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      setCount(0);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <BellIcon className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notifications
            </span>
            {count > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-8 text-xs text-zinc-400">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                <BellIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {"You're all caught up."}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={handleRead} />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && count > 0 && (
            <div className="border-t border-zinc-100 px-4 py-2 dark:border-zinc-800">
              <button
                onClick={handleMarkAll}
                className="w-full rounded-md py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
