import { createClient } from "@supabase/supabase-js";import { makeDesireRoomCode, nowIso } from "./helpers";type QueueRow = {
  id: number
  user_id: string
  username: string | null
  vip_level: string
  gender_filter: "all" | "male" | "female"
  discreet_mode: boolean
  cam_enabled: boolean
  mic_enabled: boolean
  accept_effects: boolean
  accept_tips: boolean
  boost_until: string | null
  status: string
  created_at: string
  updated_at: string
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase service role environment variables.")
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function tryCreateDesireMatch(currentUserId: string) {
  const supabase = getAdminSupabase()

  const { data: currentEntry, error: currentError } = await supabase
    .from("desire_queue")
    .select("*")
    .eq("user_id", currentUserId)
    .eq("status", "waiting")
    .maybeSingle<QueueRow>()

  if (currentError) throw currentError
  if (!currentEntry) return null

  const { data: blockedByMe } = await supabase
    .from("user_blocks")
    .select("blocked_user_id")
    .eq("blocker_user_id", currentUserId)

  const { data: blockedMe } = await supabase
    .from("user_blocks")
    .select("blocker_user_id")
    .eq("blocked_user_id", currentUserId)

  const excludedIds = new Set<string>([currentUserId])

  for (const row of blockedByMe || []) excludedIds.add(row.blocked_user_id)
  for (const row of blockedMe || []) excludedIds.add(row.blocker_user_id)

  const { data: allWaiting, error: allWaitingError } = await supabase
    .from("desire_queue")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: true })

  if (allWaitingError) throw allWaitingError

  const candidates = (allWaiting || [])
    .filter((row: QueueRow) => !excludedIds.has(row.user_id))
    .sort((a: QueueRow, b: QueueRow) => {
      const aBoost = a.boost_until ? new Date(a.boost_until).getTime() > Date.now() : false
      const bBoost = b.boost_until ? new Date(b.boost_until).getTime() > Date.now() : false

      if (aBoost !== bBoost) return aBoost ? -1 : 1

      const aVip = a.vip_level !== "Standard"
      const bVip = b.vip_level !== "Standard"

      if (aVip !== bVip) return aVip ? -1 : 1

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const candidate = candidates[0]
  if (!candidate) return null

  const { data: inserted, error: insertError } = await supabase
    .from("desire_sessions")
    .insert({
      room_code: `pending-${Date.now()}`,
      user_a: currentEntry.user_id,
      user_b: candidate.user_id,
      username_a: currentEntry.username,
      username_b: candidate.username,
      status: "active",
      is_private: false,
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("*")
    .single()

  if (insertError) throw insertError

  const roomCode = makeDesireRoomCode(inserted.id)

  const { error: roomUpdateError } = await supabase
    .from("desire_sessions")
    .update({
      room_code: roomCode,
      updated_at: nowIso(),
    })
    .eq("id", inserted.id)

  if (roomUpdateError) throw roomUpdateError

  const { error: q1Error } = await supabase
    .from("desire_queue")
    .update({
      status: "matched",
      updated_at: nowIso(),
    })
    .eq("user_id", currentEntry.user_id)

  if (q1Error) throw q1Error

  const { error: q2Error } = await supabase
    .from("desire_queue")
    .update({
      status: "matched",
      updated_at: nowIso(),
    })
    .eq("user_id", candidate.user_id)

  if (q2Error) throw q2Error

  return {
    sessionId: inserted.id,
    roomCode,
    partnerUserId: candidate.user_id,
    partnerUsername: candidate.username,
  }
}
