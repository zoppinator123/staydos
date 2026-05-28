import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Returns the current authenticated user with id, email, and optional name.
 * Returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const sb = await createClient();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (error || !user) return null;

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name =
      (meta?.full_name as string | undefined) ??
      (meta?.name as string | undefined) ??
      undefined;

    return {
      id: user.id,
      email: user.email ?? "",
      name,
    };
  } catch {
    return null;
  }
}
