import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const channelCache = new Map<string, RealtimeChannel>();

export function createSafeChannel(
  supabase: SupabaseClient,
  name: string
) {
  if (!name) throw new Error("Channel name missing");

  // reuse existing channel if exists
  if (channelCache.has(name)) {
    return {
      channel: channelCache.get(name)!,
      cleanup: () => {},
    };
  }

  const channel = supabase.channel(name);
  channelCache.set(name, channel);

  function cleanup() {
    try {
      supabase.removeChannel(channel);
      channelCache.delete(name);
    } catch (e) {
      console.warn("Realtime cleanup error:", e);
    }
  }

  return { channel, cleanup };
}
