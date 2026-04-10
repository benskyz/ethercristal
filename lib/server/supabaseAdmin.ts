import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable manquante: ${name}`);
  }
  return value;
}

export const supabaseAdmin = createClient(
  getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export async function requireAdminFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { error: "Token manquant.", status: 401 as const };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return { error: "Utilisateur non authentifié.", status: 401 as const };
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from("profiles")
    .select("id, pseudo, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    return { error: adminError.message, status: 500 as const };
  }

  if (!adminProfile?.is_admin) {
    return { error: "Accès refusé. Admin seulement.", status: 403 as const };
  }

  return {
    user,
    adminProfile,
    token,
  };
}
