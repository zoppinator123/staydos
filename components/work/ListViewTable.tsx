/**
 * STUB — This file will be fully implemented by the other subagent.
 * It is present here only so the build doesn't warn about a missing module.
 * DO NOT MODIFY this file — it is owned by the other subagent.
 */

"use client";

interface ListViewTableProps {
  listId: string;
  tasks: unknown[];
  statuses: unknown[];
  customFields: unknown[];
}

export function ListViewTable({ tasks }: ListViewTableProps) {
  return (
    <div className="p-6 text-center text-muted-foreground text-sm">
      Loading list view… ({tasks.length} tasks)
    </div>
  );
}
