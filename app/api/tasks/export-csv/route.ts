import { NextRequest, NextResponse } from "next/server";
import { exportTasksCsv } from "@/lib/work/actions";
import type { TaskPriority, TaskStatusCategory, TaskQuery } from "@/lib/work/types";

function getString(val: string | null): string {
  return val ?? "";
}

function getStringArray(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;

    const search = getString(url.searchParams.get("search"));
    const statuses = getStringArray(url.searchParams.get("statuses")) as TaskStatusCategory[];
    const priorities = getStringArray(url.searchParams.get("priorities")) as TaskPriority[];
    const assigneeIds = getStringArray(url.searchParams.get("assignee_ids"));
    const listIds = getStringArray(url.searchParams.get("list_ids"));
    const spaceIds = getStringArray(url.searchParams.get("space_ids"));
    const includeArchived = url.searchParams.get("include_archived") === "true";
    const includeCompleted = url.searchParams.get("include_completed") === "true";

    const query: TaskQuery = {
      filter: {
        search: search || undefined,
        status_categories: statuses.length ? statuses : undefined,
        priorities: priorities.length ? priorities : undefined,
        assignee_ids: assigneeIds.length ? assigneeIds : undefined,
        list_ids: listIds.length ? listIds : undefined,
        space_ids: spaceIds.length ? spaceIds : undefined,
        include_archived: includeArchived,
        include_completed: includeCompleted,
      },
      sort: [{ field: "updated_at", direction: "desc" }],
      limit: 500,
      offset: 0,
    };

    const csv = await exportTasksCsv(query);
    const dateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="staydos-tasks-${dateStr}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export-csv] Error:", err);
    return NextResponse.json({ error: "Failed to export tasks" }, { status: 500 });
  }
}
