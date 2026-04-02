import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable manquante: ${name}`);
  }
  return value;
}

/**
 * Nom principal utilisé maintenant
 */
export function getAdminSupabase() {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedAdminClient;
}

/**
 * Alias de compatibilité pour les anciennes routes
 * app/api/desir/end/route.ts
 * app/api/desir/join/route.ts
 * app/api/desir/report/route.ts
 */
export function getDesirAdminSupabase() {
  return getAdminSupabase();
}

export async function findUserProfile(userId: string) {
  const adminSupabase = getDesirAdminSupabase();

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, username, vip_level, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getActiveDesirSession(userId: string) {
  const adminSupabase = getDesirAdminSupabase();

  const { data, error } = await adminSupabase
    .from("desir_sessions")
    .select("*")
    .eq("status", "active")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function removeFromQueue(userId: string) {
  const adminSupabase = getDesirAdminSupabase();

  await adminSupabase
    .from("desir_queue")
    .delete()
    .eq("user_id", userId);
}

export async function blockedEitherWay(userA: string, userB: string) {
  const adminSupabase = getDesirAdminSupabase();

  const { data, error } = await adminSupabase
    .from("desir_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`
    );

  if (error) return false;
  return (data || []).length > 0;
}

export async function canUsersInteract(userA: string, userB: string) {
  if (!userA || !userB) return false;
  if (userA === userB) return false;

  const blocked = await blockedEitherWay(userA, userB);
  return !blocked;
}
