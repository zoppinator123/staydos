"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Space,
  CreateSpaceInput,
  Folder,
  CreateFolderInput,
  List,
  CreateListInput,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
} from "./types";

// Basic DB helper
async function db() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

async function currentUserId(): Promise<string> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ==================== SPACES ====================

export async function getSpaces(): Promise<Space[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .is("archived_at", null)
    .order("order");

  if (error) throw error;
  return data ?? [];
}

export async function createSpace(input: CreateSpaceInput): Promise<Space> {
  const supabase = await db();
  const userId = await currentUserId();

  const { data: maxOrder } = await supabase
    .from("spaces")
    .select("order")
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from("spaces")
    .insert({
      ...input,
      order: (maxOrder?.order ?? -1) + 1,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
