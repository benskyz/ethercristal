import { requireSupabaseBrowserClient } from "@/lib/supabase";

export type PrivateThreadRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  pair_key: string;
  created_at: string;
  updated_at: string;
};

export type PrivateMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

function buildPairKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export async function getOrCreatePrivateThread(userAId: string, userBId: string) {
  const supabase = requireSupabaseBrowserClient();
  const pairKey = buildPairKey(userAId, userBId);

  const existing = await supabase
    .from("private_threads")
    .select("*")
    .eq("pair_key", pairKey)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as PrivateThreadRow;

  const created = await supabase
    .from("private_threads")
    .insert({
      user_a_id: userAId,
      user_b_id: userBId,
      pair_key: pairKey,
    })
    .select("*")
    .single();

  if (created.error) throw created.error;
  return created.data as PrivateThreadRow;
}

export async function sendPrivateMessage(input: {
  senderId: string;
  receiverId: string;
  content: string;
}) {
  const supabase = requireSupabaseBrowserClient();

  const cleanContent = input.content.trim();
  if (!cleanContent) {
    throw new Error("Le message est vide.");
  }

  const thread = await getOrCreatePrivateThread(input.senderId, input.receiverId);

  const { data, error } = await supabase
    .from("private_messages")
    .insert({
      thread_id: thread.id,
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      content: cleanContent,
      is_read: false,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("private_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", thread.id);

  return data as PrivateMessageRow;
}

export async function markThreadMessagesRead(threadId: string, viewerId: string) {
  const supabase = requireSupabaseBrowserClient();

  const { error } = await supabase
    .from("private_messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .eq("receiver_id", viewerId)
    .eq("is_read", false);

  if (error) throw error;
}

export async function listThreadMessages(threadId: string) {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("private_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PrivateMessageRow[];
}
