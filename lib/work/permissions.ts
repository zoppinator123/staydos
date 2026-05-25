"use server";

import { revalidatePath } from "next/cache";
import { db, currentUserId } from "./shared";
import type {
  AddListMemberInput,
  AddSpaceMemberInput,
  ListAccessLevel,
  ListMember,
  ListMemberRole,
  SpaceMember,
  SpaceMemberRole,
} from "./types";

// ==================== SPACE MEMBERS ====================

export async function getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("space_members")
    .select("*")
    .eq("space_id", spaceId);
  if (error) throw error;
  return data ?? [];
}

export async function addSpaceMember(input: AddSpaceMemberInput): Promise<SpaceMember> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb
    .from("space_members")
    .upsert(
      {
        space_id: input.space_id,
        profile_id: input.profile_id,
        role: input.role,
      },
      { onConflict: "space_id,profile_id" }
    )
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function updateSpaceMemberRole(
  spaceId: string,
  profileId: string,
  role: SpaceMemberRole
): Promise<SpaceMember> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb
    .from("space_members")
    .update({ role })
    .eq("space_id", spaceId)
    .eq("profile_id", profileId)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function removeSpaceMember(spaceId: string, profileId: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("profile_id", profileId);
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== LIST MEMBERS ====================

export async function getListMembers(listId: string): Promise<ListMember[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("list_members")
    .select("*")
    .eq("list_id", listId);
  if (error) throw error;
  return data ?? [];
}

export async function addListMember(input: AddListMemberInput): Promise<ListMember> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb
    .from("list_members")
    .upsert(
      {
        list_id: input.list_id,
        profile_id: input.profile_id,
        role: input.role ?? "member",
        access_level: input.access_level ?? "editor",
      },
      { onConflict: "list_id,profile_id" }
    )
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function updateListMemberAccess(
  listId: string,
  profileId: string,
  patch: { role?: ListMemberRole; access_level?: ListAccessLevel }
): Promise<ListMember> {
  const sb = await db();
  await currentUserId();
  const { data, error } = await sb
    .from("list_members")
    .update(patch)
    .eq("list_id", listId)
    .eq("profile_id", profileId)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/work");
  return data;
}

export async function removeListMember(listId: string, profileId: string): Promise<void> {
  const sb = await db();
  await currentUserId();
  const { error } = await sb
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("profile_id", profileId);
  if (error) throw error;
  revalidatePath("/work");
}

// ==================== ACCESS CHECKS ====================

/**
 * Returns the user's effective access level for a list.
 * - List owner -> 'admin'
 * - List member -> their access_level
 * - Space admin -> 'admin'
 * - Space member -> 'editor'
 * - Space viewer -> 'viewer'
 * - Otherwise -> null
 */
export async function getListAccess(
  listId: string,
  userId?: string
): Promise<ListAccessLevel | null> {
  const sb = await db();
  const uid = userId ?? (await currentUserId());

  const { data: list } = await sb
    .from("lists")
    .select("id, space_id, personal_owner_id, type")
    .eq("id", listId)
    .maybeSingle();
  if (!list) return null;

  // personal list owner
  if (list.personal_owner_id === uid) return "admin";

  // list member
  const { data: lm } = await sb
    .from("list_members")
    .select("role, access_level")
    .eq("list_id", listId)
    .eq("profile_id", uid)
    .maybeSingle();
  if (lm) {
    if (lm.role === "owner") return "admin";
    return lm.access_level as ListAccessLevel;
  }

  // space membership
  if (list.space_id) {
    const { data: sm } = await sb
      .from("space_members")
      .select("role")
      .eq("space_id", list.space_id)
      .eq("profile_id", uid)
      .maybeSingle();
    if (sm) {
      if (sm.role === "admin") return "admin";
      if (sm.role === "member") return "editor";
      return "viewer";
    }
  }

  // public list - everyone can view
  if (list.type === "public") return "viewer";

  return null;
}

export async function requireListAccess(
  listId: string,
  minimum: ListAccessLevel
): Promise<void> {
  const rank: Record<ListAccessLevel, number> = { viewer: 1, editor: 2, admin: 3 };
  const access = await getListAccess(listId);
  if (!access || rank[access] < rank[minimum]) {
    throw new Error(`Insufficient list access (need ${minimum})`);
  }
}
