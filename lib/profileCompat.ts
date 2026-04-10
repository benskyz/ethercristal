import type { User } from "@supabase/supabase-js";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  email: string | null;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  credits: number;
  is_vip: boolean;
  is_admin: boolean;
  vip_expires_at: string | null;
  role: string;
  master_title: string;
  master_title_style: string | null;
  active_name_fx_key: string | null;
  active_badge_key: string | null;
  active_title_key: string | null;
  gender: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

const PROFILE_SELECT = `
  id,
  email,
  pseudo,
  avatar_url,
  bio,
  credits,
  is_vip,
  is_admin,
  vip_expires_at,
  role,
  master_title,
  master_title_style,
  active_name_fx_key,
  active_badge_key,
  active_title_key,
  gender,
  is_verified,
  created_at,
  updated_at
`;

function cleanPseudo(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

export function buildFallbackPseudo(user: User, preferredPseudo?: string | null) {
  const candidate =
    preferredPseudo?.trim() ||
    String(user.user_metadata?.pseudo || "").trim() ||
    String(user.user_metadata?.username || "").trim() ||
    user.email?.split("@")[0]?.trim() ||
    `membre_${user.id.slice(0, 8)}`;

  return cleanPseudo(candidate || "Membre Ether");
}

export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function ensureProfileRecord(
  user: User,
  preferredPseudo?: string | null
): Promise<ProfileRow> {
  const supabase = requireSupabaseBrowserClient();

  const existing = await getProfileByUserId(user.id);
  const fallbackPseudo = buildFallbackPseudo(user, preferredPseudo);

  if (existing) {
    if (!existing.pseudo?.trim()) {
      const { error: patchError } = await supabase
        .from("profiles")
        .update({
          pseudo: fallbackPseudo,
          email: user.email ?? existing.email,
        })
        .eq("id", user.id);

      if (patchError) throw patchError;

      const patched = await getProfileByUserId(user.id);
      if (!patched) throw new Error("Impossible de relire le profil.");
      return patched;
    }

    return existing;
  }

  const payload = {
    id: user.id,
    email: user.email ?? null,
    pseudo: fallbackPseudo,
    credits: 0,
    is_vip: false,
    is_admin: false,
    role: "member",
    master_title: "Aucun titre",
  };

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (upsertError) throw upsertError;

  const created = await getProfileByUserId(user.id);
  if (!created) {
    throw new Error("Impossible de créer le profil utilisateur.");
  }

  return created;
}

export function isVipActive(profile: ProfileRow | null | undefined) {
  if (!profile) return false;
  if (profile.is_admin) return true;
  if (profile.is_vip) return true;

  if (!profile.vip_expires_at) return false;

  const expires = new Date(profile.vip_expires_at).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

export function profileDisplayName(profile: ProfileRow | null | undefined) {
  return profile?.pseudo?.trim() || "Membre Ether";
}
