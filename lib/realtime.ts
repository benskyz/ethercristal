import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type BuildChannel = (channel: RealtimeChannel) => void;

function randomChannelSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

export function createSafeChannel(
  supabase: SupabaseClient,
  name: string
) {
  const channel = supabase.channel(`${name}-${randomChannelSuffix()}`);

  const cleanup = () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // ignore cleanup errors
    }
  };

  return { channel, cleanup };
}

export function safeSubscribe(
  supabase: SupabaseClient,
  name: string,
  build: BuildChannel
) {
  const { channel, cleanup } = createSafeChannel(supabase, name);

  // IMPORTANT:
  // build() must only register .on(...) handlers
  // and MUST NOT call subscribe() itself.
  build(channel);

  channel.subscribe();

  return cleanup;
}
