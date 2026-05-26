import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the currently authenticated user from the browser Supabase client.
 * Safe to call in client components (uses browser cookie session).
 * Returns null if not authenticated.
 */
export async function getCurrentUserClient(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
