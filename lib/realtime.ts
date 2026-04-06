import type { SupabaseClient } from "@supabase/supabase-js";

type AnyChannel = any;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

/**
 * Crée un nom de channel unique pour éviter:
 * - collisions Fast Refresh
 * - remount React
 * - "cannot add postgres_changes callbacks after subscribe()"
 */
export function uniqueChannelName(base: string) {
  const clean = (base || "realtime")
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .slice(0, 60);
  return `${clean}:${uid()}`;
}

/**
 * Enlève un channel sans throw.
 */
export function safeRemoveChannel(supabase: SupabaseClient, channel: AnyChannel | null) {
  if (!channel) return;
  try {
    supabase.removeChannel(channel);
  } catch {
    // ignore
  }
}

/**
 * Helper principal: crée un channel unique + fournit cleanup.
 *
 * Usage:
 * const { channel, cleanup } = createSafeChannel(supabase, "salons-presence");
 * channel.on(...).subscribe();
 * return cleanup;
 */
export function createSafeChannel(
  supabase: SupabaseClient,
  baseName: string,
  opts?: { name?: string } // si tu veux passer un nom déjà unique
) {
  const name = opts?.name ?? uniqueChannelName(baseName);
  const channel = supabase.channel(name);

  return {
    name,
    channel,
    cleanup: () => safeRemoveChannel(supabase, channel),
  };
}

/**
 * Variante ultra-pratique : tu donnes une fonction "bind" qui attache tes .on(...)
 * et on subscribe automatiquement.
 *
 * Usage:
 * const cleanup = safeSubscribe(supabase, "messages", (ch) => {
 *   ch.on("postgres_changes", {...}, handler)
 * })
 * return cleanup
 */
export function safeSubscribe(
  supabase: SupabaseClient,
  baseName: string,
  bind: (channel: AnyChannel) => void,
  opts?: { name?: string }
) {
  const { channel, cleanup } = createSafeChannel(supabase, baseName, opts);

  // IMPORTANT: bind BEFORE subscribe
  bind(channel);

  // subscribe last
  channel.subscribe();

  return cleanup;
}
