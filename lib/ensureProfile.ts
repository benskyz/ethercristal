import type { User } from "@supabase/supabase-js";
import { ensureProfileRecord, type ProfileRow } from "@/lib/profileCompat";

export async function ensureProfile(user: User): Promise<ProfileRow> {
  return ensureProfileRecord(user);
}
