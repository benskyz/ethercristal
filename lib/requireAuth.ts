import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, email, credits, is_vip, is_admin, is_banned, role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function isCurrentUserAdmin() {
  const profile = await getCurrentProfile();

  if (!profile) return false;

  return Boolean(profile.is_admin || profile.role === "admin");
}
