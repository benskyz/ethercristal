// lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabaseBrowser: SupabaseClient | null = null;

function ensurePublicEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variables Supabase publiques manquantes.");
  }
}

/**
 * Utiliser uniquement côté client (throw si appelé côté serveur).
 * Renvoie toujours un SupabaseClient (créé une seule fois).
 */
export function requireSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase appelé côté serveur.");
  }
  ensurePublicEnv();
  if (!_supabaseBrowser) {
    _supabaseBrowser = createClient(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL),
      String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      {
        // options éventuelles
      }
    );
  }
  return _supabaseBrowser;
}

/**
 * Renvoie un SupabaseClient côté client, ou null côté serveur.
 * Utile pour imports partagés où on veut éviter l'erreur SSR.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  return requireSupabaseBrowserClient();
}
