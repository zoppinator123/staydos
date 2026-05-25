"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get the request-scoped Supabase client (anon role, cookie-auth'd user).
 * Throws if Supabase env is not configured.
 */
export async function db(): Promise<SupabaseClient> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

/**
 * Get the service-role Supabase client. Use only for trusted server jobs
 * (cron, recurrence engine, activity logging that crosses ACL boundaries).
 */
export async function admin(): Promise<SupabaseClient> {
  return createAdminClient();
}

/**
 * Returns the current user's id. Throws if unauthenticated.
 */
export async function currentUserId(): Promise<string> {
  const supabase = await db();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/**
 * Returns the current user's id or null (no throw).
 */
export async function maybeCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await db();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Compute the next `order` value for a list of siblings.
 * Pass the table name and a where clause record.
 */
export async function nextOrder(
  table: string,
  where: Record<string, string | null>
): Promise<number> {
  const supabase = await db();
  let q = supabase.from(table).select('"order"').order("order", { ascending: false }).limit(1);
  for (const [k, v] of Object.entries(where)) {
    q = v === null ? q.is(k, null) : q.eq(k, v);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  type OrderRow = { order: number };
  return ((data as OrderRow | null)?.order ?? -1) + 1;
}

/**
 * Insert an activity log entry. Best-effort: errors are swallowed
 * so activity logging never breaks the primary mutation.
 */
export async function logActivity(params: {
  task_id: string;
  actor_id: string | null;
  action: string;
  from_value?: Record<string, unknown> | null;
  to_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const sb = await admin();
    await sb.from("task_activity").insert({
      task_id: params.task_id,
      actor_id: params.actor_id,
      action: params.action,
      from_value: params.from_value ?? null,
      to_value: params.to_value ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // ignore
  }
}
