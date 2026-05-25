import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 * Use only in server-side code that needs to bypass RLS for trusted operations
 * (e.g. system-wide activity inserts, recurrence engine jobs).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createSbClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
