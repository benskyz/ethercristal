import type { User } from "@supabase/supabase-js";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { ensureProfileRecord, type ProfileRow } from "@/lib/profileCompat";

export async function requireAuth(): Promise<{
  user: User;
  profile: ProfileRow;
}> {
  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Utilisateur non connecté.");
  }

  const profile = await ensureProfileRecord(user);
  return { user, profile };
}
