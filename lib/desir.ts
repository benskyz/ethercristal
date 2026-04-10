import { supabase } from "@/lib/supabase";

export type DesirOwnGender = "male" | "female" | "other" | "unknown";
export type DesirDesiredGender = "random" | "male" | "female";
export type DesirMatchState = "searching" | "matched";

export type DesirSessionResult = {
  state: DesirMatchState;
  session_id: string | null;
  peer_user_id: string | null;
  peer_pseudo: string | null;
  peer_gender: DesirOwnGender | null;
  session_created_at: string | null;
};

export type DesirMessageRow = {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export async function findOrCreateDesirMatch(args: {
  pseudo: string;
  ownGender: DesirOwnGender;
  desiredGender: DesirDesiredGender;
}): Promise<DesirSessionResult> {
  const { data, error } = await supabase.rpc("desir_find_or_create_match", {
    p_pseudo: args.pseudo,
    p_own_gender: args.ownGender,
    p_desired_gender: args.desiredGender,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;

  return {
    state: row?.state ?? "searching",
    session_id: row?.session_id ?? null,
    peer_user_id: row?.peer_user_id ?? null,
    peer_pseudo: row?.peer_pseudo ?? null,
    peer_gender: row?.peer_gender ?? null,
    session_created_at: row?.session_created_at ?? null,
  };
}

export async function getActiveDesirSession(): Promise<DesirSessionResult | null> {
  const { data, error } = await supabase.rpc("desir_get_active_session");

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    state: "matched",
    session_id: row.session_id ?? null,
    peer_user_id: row.peer_user_id ?? null,
    peer_pseudo: row.peer_pseudo ?? null,
    peer_gender: row.peer_gender ?? null,
    session_created_at: row.session_created_at ?? null,
  };
}

export async function leaveDesirQueue(): Promise<void> {
  const { error } = await supabase.rpc("desir_leave_queue");
  if (error) throw error;
}

export async function endDesirSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("desir_end_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function fetchDesirMessages(sessionId: string): Promise<DesirMessageRow[]> {
  const { data, error } = await supabase
    .from("desir_messages")
    .select("id, session_id, sender_id, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as DesirMessageRow[] | null) ?? [];
}

export async function sendDesirMessage(args: {
  sessionId: string;
  senderId: string;
  content: string;
}): Promise<void> {
  const clean = args.content.trim();
  if (!clean) return;

  const { error } = await supabase.from("desir_messages").insert({
    session_id: args.sessionId,
    sender_id: args.senderId,
    content: clean,
  });

  if (error) throw error;
}
