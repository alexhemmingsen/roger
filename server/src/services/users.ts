import { supabaseAdmin } from "../supabase.ts";
import type { User } from "../types/users.ts";

/** Creates the user on first sign-in, or updates their display name. */
export async function upsertUser(
  id: string,
  displayName: string,
): Promise<User> {
  const { data } = await supabaseAdmin
    .from("users")
    .upsert({ id, display_name: displayName })
    .select()
    .single()
    .throwOnError();
  return data;
}

export async function getUser(id: string): Promise<User | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select()
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Looks up several users at once, e.g. everyone online on the same Wi-Fi. */
export async function getUsers(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("users")
    .select()
    .in("id", ids)
    .throwOnError();
  return data;
}
