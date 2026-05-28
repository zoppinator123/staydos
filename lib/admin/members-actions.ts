"use server";

import { revalidatePath } from "next/cache";
import { admin, currentUserId } from "@/lib/work/shared";

export type MemberRole = "admin" | "member" | "viewer";

export interface MemberRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: MemberRole;
  is_self: boolean;
}

/**
 * Determines the workspace-wide role for a user based on their space_members
 * rows. We treat the maximum role across spaces as the workspace role
 * (admin > member > viewer). Users with no space membership are 'member'.
 */
function rankRole(role: string | null | undefined): number {
  if (role === "admin") return 3;
  if (role === "member") return 2;
  if (role === "viewer") return 1;
  return 0;
}

function topRole(roles: string[]): MemberRole {
  let best: MemberRole = "member";
  let bestRank = rankRole(best);
  for (const r of roles) {
    const rank = rankRole(r);
    if (rank > bestRank) {
      best = r as MemberRole;
      bestRank = rank;
    }
  }
  return best;
}

/**
 * Lists every user in the auth system, joined with their highest space_members
 * role. Requires service-role access (admin client) since auth.users isn't
 * exposed via PostgREST.
 */
export async function listMembers(): Promise<MemberRow[]> {
  const meId = await currentUserId();
  const sb = await admin();

  // Page through auth users (most workspaces will fit on one page)
  const { data: usersPage, error: usersErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (usersErr) throw usersErr;
  const users = usersPage?.users ?? [];

  // Fetch all space_member rows in one go
  const userIds = users.map((u) => u.id);
  const rolesByUser = new Map<string, string[]>();
  if (userIds.length > 0) {
    const { data: memberRows, error: smErr } = await sb
      .from("space_members")
      .select("profile_id, role")
      .in("profile_id", userIds);
    if (smErr) throw smErr;
    for (const row of memberRows ?? []) {
      const arr = rolesByUser.get(row.profile_id) ?? [];
      arr.push(row.role as string);
      rolesByUser.set(row.profile_id, arr);
    }
  }

  const rows: MemberRow[] = users.map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const full_name =
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      null;
    const roles = rolesByUser.get(u.id) ?? [];
    const role: MemberRole = roles.length > 0 ? topRole(roles) : "member";
    return {
      id: u.id,
      email: u.email ?? "",
      full_name,
      created_at: u.created_at ?? "",
      last_sign_in_at: u.last_sign_in_at ?? null,
      role,
      is_self: u.id === meId,
    };
  });

  // Newest first
  rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  return rows;
}

/**
 * Invite a user by email. Sends an invitation email via Supabase Auth and
 * (optionally) grants them the given role on all current spaces so they
 * actually have somewhere to land.
 */
export async function inviteMember(input: {
  email: string;
  role: MemberRole;
  full_name?: string;
}): Promise<{ id: string; email: string }> {
  await currentUserId(); // require auth
  const sb = await admin();

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Invalid email");

  const role: MemberRole =
    input.role === "admin" || input.role === "viewer" ? input.role : "member";

  // Issue invitation. If the user already exists, fall back to a normal
  // createUser flow that returns the existing record.
  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
    data: input.full_name ? { full_name: input.full_name } : undefined,
  });

  let userId: string | undefined = data?.user?.id;

  if (error || !userId) {
    // Maybe the user already exists — try to look them up.
    const { data: page, error: listErr } = await sb.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw error ?? listErr;
    const existing = page?.users.find(
      (u) => (u.email ?? "").toLowerCase() === email
    );
    if (!existing) throw error ?? new Error("Failed to invite user");
    userId = existing.id;
  }

  // Grant the role on every existing space so they have access on first login
  const { data: spaces, error: spErr } = await sb.from("spaces").select("id");
  if (spErr) throw spErr;
  if (spaces && spaces.length > 0) {
    const rows = spaces.map((s) => ({
      space_id: s.id,
      profile_id: userId!,
      role,
    }));
    // upsert so re-invites don't double-insert
    const { error: insErr } = await sb
      .from("space_members")
      .upsert(rows, { onConflict: "space_id,profile_id" });
    if (insErr) throw insErr;
  }

  revalidatePath("/admin/settings");
  return { id: userId, email };
}

/** Update a user's role across all spaces. */
export async function updateMemberRole(input: {
  user_id: string;
  role: MemberRole;
}): Promise<void> {
  const meId = await currentUserId();
  if (input.user_id === meId) {
    throw new Error("You cannot change your own role from here.");
  }
  const sb = await admin();

  const role: MemberRole =
    input.role === "admin" || input.role === "viewer" ? input.role : "member";

  // If the user isn't yet a member of any space, add them everywhere with this
  // role. Otherwise just bump all existing rows.
  const { data: existing, error: exErr } = await sb
    .from("space_members")
    .select("space_id")
    .eq("profile_id", input.user_id);
  if (exErr) throw exErr;

  if ((existing ?? []).length === 0) {
    const { data: spaces, error: spErr } = await sb.from("spaces").select("id");
    if (spErr) throw spErr;
    if (spaces && spaces.length > 0) {
      const rows = spaces.map((s) => ({
        space_id: s.id,
        profile_id: input.user_id,
        role,
      }));
      const { error: insErr } = await sb
        .from("space_members")
        .upsert(rows, { onConflict: "space_id,profile_id" });
      if (insErr) throw insErr;
    }
  } else {
    const { error: updErr } = await sb
      .from("space_members")
      .update({ role })
      .eq("profile_id", input.user_id);
    if (updErr) throw updErr;
  }

  revalidatePath("/admin/settings");
}

/** Remove a user from the workspace: drop all space memberships AND delete the auth user. */
export async function removeMember(user_id: string): Promise<void> {
  const meId = await currentUserId();
  if (user_id === meId) {
    throw new Error("You cannot remove yourself.");
  }
  const sb = await admin();

  // Remove from all spaces first (FK ON DELETE CASCADE handles tasks they
  // created via auth deletion, but we tidy memberships explicitly).
  const { error: delMembersErr } = await sb
    .from("space_members")
    .delete()
    .eq("profile_id", user_id);
  if (delMembersErr) throw delMembersErr;

  const { error: delAuthErr } = await sb.auth.admin.deleteUser(user_id);
  if (delAuthErr) throw delAuthErr;

  revalidatePath("/admin/settings");
}

/** Re-send the invitation email to a user that hasn't signed in yet. */
export async function resendInvite(email: string): Promise<void> {
  await currentUserId();
  const sb = await admin();
  const lowered = email.trim().toLowerCase();
  if (!lowered) throw new Error("Email required");
  const { error } = await sb.auth.admin.inviteUserByEmail(lowered);
  if (error) throw error;
}
