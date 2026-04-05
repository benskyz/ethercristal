"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Users,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Wand2,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type PresenceRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  updated_at?: string | null;
  joined_at?: string | null;
  slot_index?: number | null;
};

type RoomMessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  content: string;
  created_at?: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseTime(updated_at?: string | null) {
  if (!updated_at) return 0;
  const t = new Date(updated_at).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isOnline(updated_at?: string | null) {
  const t = parseTime(updated_at);
  return t > 0 && Date.now() - t < 60_000;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params?.roomId ?? "");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [userId, setUserId] = useState("");
  const [pseudo, setPseudo] = useState("Membre");

  // null = pas de place
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);

  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [sending, setSending] = useState(false);

  const [showExtras, setShowExtras] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // ----------- LOADERS -----------
  async function loadPresence() {
    const { data, error } = await supabase
      .from("room_presence")
      .select("id, room_id, user_id, pseudo, updated_at, joined_at, slot_index")
      .eq("room_id", roomId);

    if (error) return;
    setPresence((data ?? []) as PresenceRow[]);
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("room_messages")
      .select("id, room_id, user_id, pseudo, content, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) return;
    setMessages((data ?? []) as RoomMessageRow[]);
  }

  async function refreshAll() {
    setRefreshing(true);
    setError("");
    setInfo("");
    try {
      await Promise.all([loadPresence(), loadMessages()]);
    } finally {
      setRefreshing(false);
    }
  }

  // ----------- CAMERA -----------
  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;

      stream.getVideoTracks().forEach((t) => (t.enabled = cam));
      stream.getAudioTracks().forEach((t) => (t.enabled = mic));
    } catch {
      setError("Impossible d'accéder à la caméra ou au micro.");
    }
  }

  function toggleCam() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    const next = !cam;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCam(next);
  }

  function toggleMic() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    const next = !mic;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMic(next);
  }

  // ----------- PRESENCE (NO AUTO SLOT) -----------
  async function ensurePresence(uid: string, ps: string) {
    const { data: existing } = await supabase
      .from("room_presence")
      .select("id, slot_index")
      .eq("room_id", roomId)
      .eq("user_id", uid)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("room_presence")
        .update({
          pseudo: ps,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("room_presence").insert({
        room_id: roomId,
        user_id: uid,
        pseudo: ps,
        slot_index: null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  async function leavePresence(uid: string) {
    await supabase.from("room_presence").delete().eq("room_id", roomId).eq("user_id", uid);
  }

  async function joinSlot(slot: number) {
    setError("");
    setInfo("");

    if (!roomId || !userId) return;

    const { data: fresh } = await supabase
      .from("room_presence")
      .select("user_id, slot_index")
      .eq("room_id", roomId);

    const taken = (fresh ?? []).some((p: any) => p.slot_index === slot && p.user_id !== userId);
    if (taken) {
      setError("Cette place est déjà occupée.");
      return;
    }

    // Cam starts only when you choose a slot
    if (!videoRef.current?.srcObject) {
      await startCam();
    }

    const { data: existing } = await supabase
      .from("room_presence")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("room_presence")
        .update({
          slot_index: slot,
          pseudo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("room_presence").insert({
        room_id: roomId,
        user_id: userId,
        pseudo,
        slot_index: slot,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setError(error.message);
        return;
      }
    }

    setSelectedSlot(slot);
    setInfo(`Tu as rejoint ${slot <= 6 ? `la place ${slot}` : `l’extra ${slot - 6}`}.`);
    await loadPresence();
  }

  async function autoJoin() {
    setError("");
    setInfo("");

    // Charge présence fraîche, trouve slot libre
    const { data: fresh, error } = await supabase
      .from("room_presence")
      .select("slot_index, user_id")
      .eq("room_id", roomId);

    if (error) {
      setError(error.message);
      return;
    }

    const taken = new Set<number>();
    for (const row of fresh ?? []) {
      if (row.slot_index && row.slot_index >= 1 && row.slot_index <= 12) {
        taken.add(row.slot_index);
      }
    }

    const firstFree = Array.from({ length: 12 }, (_, i) => i + 1).find((n) => !taken.has(n));

    if (!firstFree) {
      setError("Aucune place libre.");
      return;
    }

    await joinSlot(firstFree);
  }

  async function leaveSlotOnly() {
    setError("");
    setInfo("");

    if (!roomId || !userId) return;

    const { data: existing } = await supabase
      .from("room_presence")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing?.id) {
      setSelectedSlot(null);
      return;
    }

    const { error } = await supabase
      .from("room_presence")
      .update({
        slot_index: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSelectedSlot(null);
    setInfo("Tu as quitté ton emplacement.");
    await loadPresence();
  }

  // ----------- INIT -----------
  useEffect(() => {
    if (!roomId) {
      router.push("/salons");
      return;
    }

    let mounted = true;

    (async () => {
      setLoading(true);
      setError("");
      setInfo("");

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.push("/enter");
        return;
      }

      if (!mounted) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("pseudo")
        .eq("id", user.id)
        .maybeSingle();

      const myPseudo = profile?.pseudo || "Membre";
      setPseudo(myPseudo);

      // presence yes, slot no
      await ensurePresence(user.id, myPseudo);

      await Promise.all([loadPresence(), loadMessages()]);

      // restore slot (optional)
      const { data: mine } = await supabase
        .from("room_presence")
        .select("slot_index")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();

      const restored =
        mine?.slot_index && mine.slot_index >= 1 && mine.slot_index <= 12 ? mine.slot_index : null;

      setSelectedSlot(restored);

      if (restored) {
        await startCam();
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // cleanup
  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());

      if (roomId && userId) {
        leavePresence(userId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // subscriptions
  useEffect(() => {
    if (!roomId) return;

    const presenceChannel = supabase
      .channel(`room_presence_${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_presence", filter: `room_id=eq.${roomId}` },
        () => loadPresence()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as RoomMessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(messagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // heartbeat
  useEffect(() => {
    if (!roomId || !userId) return;

    const t = setInterval(() => {
      supabase
        .from("room_presence")
        .update({ updated_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    }, 20_000);

    return () => clearInterval(t);
  }, [roomId, userId]);

  // autoscroll chat
  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // derived
  const onlineMembers = useMemo(() => presence.filter((p) => isOnline(p.updated_at)), [presence]);

  const slotsAll = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const slotId = i + 1;
      const member = onlineMembers.find((p) => p.slot_index === slotId) || null;
      return { id: slotId, member };
    });
  }, [onlineMembers]);

  const slots = useMemo(() => (showExtras ? slotsAll : slotsAll.slice(0, 6)), [slotsAll, showExtras]);

  async function sendMessage() {
    setError("");
    const content = chat.trim();
    if (!content) return;
    if (!roomId || !userId) return;

    setSending(true);

    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: userId,
      pseudo,
      content,
    });

    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setChat("");
  }

  return (
    <div className="relative min-h-screen p-4 sm:p-6 space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/salons")}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Salons
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold">
            Room: {roomId}
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200">
            En ligne: {onlineMembers.length}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80">
            {selectedSlot ? `Ta place: ${selectedSlot}` : "Aucune place"}
          </div>
        </div>

        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {info}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-white/70">
              Choisis ta place manuellement, ou utilise “Auto”.
            </div>

            <div className="flex flex-wrap gap-2">
              {!selectedSlot ? (
                <button
                  onClick={autoJoin}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-sm font-black text-black hover:opacity-95"
                  title="Prendre la première place libre"
                >
                  <Wand2 className="h-4 w-4" />
                  Auto
                </button>
              ) : (
                <button
                  onClick={leaveSlotOnly}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/15"
                >
                  <DoorOpen className="h-4 w-4" />
                  Quitter la place
                </button>
              )}

              <button
                onClick={() => setShowExtras((v) => !v)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                {showExtras ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showExtras ? "Cacher extras" : "Afficher extras"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => {
              const isMe = s.member?.user_id === userId;
              const occupied = Boolean(s.member);

              return (
                <div key={s.id} className="aspect-square rounded-2xl border border-white/10 bg-black/50 overflow-hidden relative">
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white/80">
                    {s.id <= 6 ? `Place ${s.id}` : `Extra ${s.id - 6}`}
                  </div>

                  {isMe ? (
                    <video ref={videoRef} autoPlay muted playsInline className={cx("w-full h-full object-cover", !cam && "opacity-20 blur-sm")} />
                  ) : occupied ? (
                    <div className="flex h-full w-full flex-col items-center justify-center text-center p-4">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <Users className="h-6 w-6 text-white/70" />
                      </div>
                      <div className="max-w-[90%] truncate text-sm font-black">{s.member?.pseudo || "Membre"}</div>
                      <div className="mt-1 text-[11px] text-white/45">Occupé</div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-center p-4">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03]">
                        <Camera className="h-6 w-6 text-white/35" />
                      </div>
                      <div className="text-sm font-black text-white/85">Libre</div>

                      <button
                        onClick={() => joinSlot(s.id)}
                        className="mt-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-xs font-black text-black transition hover:opacity-95"
                      >
                        Rejoindre
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleCam}
              disabled={!selectedSlot}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                !selectedSlot
                  ? "border border-white/10 bg-white/5 text-white/40"
                  : cam
                  ? "border border-white/10 bg-white/10 hover:bg-white/15"
                  : "border border-red-400/20 bg-red-500/10 text-red-200"
              )}
            >
              {cam ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              {cam ? "Cam active" : "Cam coupée"}
            </button>

            <button
              onClick={toggleMic}
              disabled={!selectedSlot}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                !selectedSlot
                  ? "border border-white/10 bg-white/5 text-white/40"
                  : mic
                  ? "border border-white/10 bg-white/10 hover:bg-white/15"
                  : "border border-red-400/20 bg-red-500/10 text-red-200"
              )}
            >
              {mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {mic ? "Micro actif" : "Micro coupé"}
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 text-lg font-black">Chat</div>

            <div ref={chatBoxRef} className="h-56 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-white/55">Aucun message.</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => {
                    const mine = m.user_id === userId;
                    return (
                      <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cx(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                            mine
                              ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                              : "border border-white/10 bg-white/10"
                          )}
                        >
                          <div className={cx("text-[11px] font-bold mb-1", mine ? "text-black/70" : "text-white/60")}>
                            {m.pseudo || "Membre"}
                          </div>
                          <div className="whitespace-pre-wrap leading-6">{m.content}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                placeholder="Écris..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-rose-400/40"
              />
              <button
                onClick={sendMessage}
                disabled={sending}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-3 font-black text-black disabled:opacity-70"
                title="Envoyer"
              >
                {sending ? "..." : <Send className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
