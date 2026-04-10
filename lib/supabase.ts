import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variables Supabase manquantes: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
}

/**
 * À utiliser dans les handlers / useEffect / fonctions client.
 */
export function requireSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase client doit être utilisé dans le navigateur (côté client)");
  }

  assertEnv();

  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/**
 * Compat temporaire pour les anciens fichiers qui font:
 * import { supabase } from "@/lib/supabase"
 *
 * Ça évite de casser 40 pages d’un coup.
 * On nettoiera ensuite fichier par fichier.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = requireSupabaseBrowserClient();
      const value = client[prop as keyof SupabaseClient];

      if (typeof value === "function") {
        return value.bind(client);
      }

      return value;
    },
  }
) as SupabaseClient;
