"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Users,
  Wand2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";

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

function parseTime(s?: string | null) {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isOnline(updated_at?: string | null) {
  const t = parseTime(updated_at);
  return t > 0 && Date.now() - t < 60_000;
}

function slotLabel(n: number) {
  return n <= 6 ? `Place ${n}` : `Extra ${n - 6}`;
}

function formatMsgTime(ts?: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
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
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);

  const [myUserId, setMyUserId] = useState<string>("");
  const [myProfile, setMyProfile] = useState<DisplayProfile | null>(null);

  // Cache profils des auteurs de messages
  const [profilesById, setProfilesById] = useState<Record<string, DisplayProfile>>({});

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);

  const [showExtras, setShowExtras] = useState(false);

  const [chat, setChat] = useState("");
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Modal confirmation slot
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // ---------- AUTH ----------
  async function getAuthedUserOrRedirect() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.push("/enter");
      return null;
    }
    return user;
  }

  // ---------- LOADERS ----------
  async function loadPresence() {
    const { data, error } = await supabase
      .from("room_presence")
      .select("id, room_id, user_id, pseudo, updated_at, joined_at, slot_index")
      .eq("room_id", roomId);

    if (!error) setPresence((data ?? []) as PresenceRow[]);
  }

  async function loadMessages() {
    // perf: 200 derniers messages max
    const { data, error } = await supabase
      .from("room_messages")
      .select("id, room_id, user_id, pseudo, content, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return;
    const rows = (data ?? []) as RoomMessageRow[];
    setMessages(rows);

    // Batch fetch profiles for senders
    const ids = Array.from(new Set(rows.map((m) => m.user_id).filter(Boolean)));
    await ensureProfilesLoaded(ids);
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

  // ---------- PROFILES CACHE ----------
  async function ensureProfilesLoaded(userIds: string[]) {
    const missing = userIds.filter((id) => id && !profilesById[id]);
    if (missing.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, pseudo, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style, is_admin, role"
      )
      .in("id", missing);

    if (error) return;

    const next: Record<string, DisplayProfile> = {};
    for (const row of data ?? []) {
      next[(row as any).id] = row as any;
    }

    setProfilesById((prev) => ({ ...prev, ...next }));
  }

  // ---------- CAMERA ----------
  async function ensureCamStream() {
    if (videoRef.current?.srcObject) return;

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

  function stopCamStream() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
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

  // ---------- PRESENCE / SLOT ----------
  async function leavePresence() {
    const user = await getAuthedUserOrRedirect();
    if (!user || !roomId) return;

    await supabase
      .from("room_presence")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);
  }

  async function joinSlot(slot: number) {
    setError("");
    setInfo("");

    if (!roomId) return;

    const user = await getAuthedUserOrRedirect();
    if (!user) return;

    // Cam only when taking a slot
    await ensureCamStream();

    // ensure presence row exists
    const { data: existing } = await supabase
      .from("room_presence")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing?.id) {
      const { error: insErr } = await supabase.from("room_presence").insert({
        room_id: roomId,
        user_id: user.id,
        pseudo: myProfile?.pseudo || "Membre",
        slot_index: null,
        updated_at: new Date().toISOString(),
      });

      if (insErr) {
        setError(insErr.message);
        return;
      }
    }

    // claim slot (unique index will block duplicates)
    const { error: updErr } = await supabase
      .from("room_presence")
      .update({
        slot_index: slot,
        pseudo: myProfile?.pseudo || "Membre",
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    if (updErr) {
      const anyErr = updErr as any;
      if (anyErr?.code === "23505") setError("Cette place est déjà occupée.");
      else setError(updErr.message);
      return;
    }

    setSelectedSlot(slot);
    setInfo(`Tu es maintenant sur ${slotLabel(slot)}.`);
    await loadPresence();
  }

  async function leaveSlotOnly() {
    setError("");
    setInfo("");

    if (!roomId) return;

    const user = await getAuthedUserOrRedirect();
    if (!user) return;

    const { data: existing } = await supabase
      .from("room_presence")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing?.id) {
      setSelectedSlot(null);
      stopCamStream();
      return;
    }

    const { error } = await supabase
      .from("room_presence")
      .update({ slot_index: null, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSelectedSlot(null);
    setInfo("Tu as quitté ton emplacement.");
    stopCamStream();
    await loadPresence();
  }

  // ---------- MODAL CONFIRM ----------
  function requestJoinSlot(slot: number) {
    setError("");
    setInfo("");
    setPendingSlot(slot);
    setConfirmOpen(true);
  }

  function closeModal() {
    setConfirmOpen(false);
    setPendingSlot(null);
    setConfirmBusy(false);
  }

  async function confirmJoin() {
    if (!pendingSlot) return;
    setConfirmBusy(true);
    await joinSlot(pendingSlot);
    setConfirmBusy(false);
    closeModal();
  }

  async function requestAuto() {
    setError("");
    setInfo("");

    const { data, error } = await supabase
      .from("room_presence")
      .select("slot_index")
      .eq("room_id", roomId);

    if (error) {
      setError(error.message);
      return;
    }

    const taken = new Set<number>();
    for (const row of data ?? []) {
      const n = (row as any).slot_index ?? null;
      if (n && n >= 1 && n <= 12) taken.add(n);
    }

    const firstFree = Array.from({ length: 12 }, (_, i) => i + 1).find((n) => !taken.has(n));
    if (!firstFree) {
      setError("Aucune place libre.");
      return;
    }

    requestJoinSlot(firstFree);
  }

  // ---------- INIT ----------
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

      const user = await getAuthedUserOrRedirect();
      if (!user) return;

      setMyUserId(user.id);

      // load my profile (for name effects too)
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select(
          "id, pseudo, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style, is_admin, role"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) setError(pErr.message);

      const mine = (profile as any) as DisplayProfile | null;
      if (mounted) setMyProfile(mine);

      // put me in cache too
      if (mine && (mine as any).id) {
        setProfilesById((prev) => ({ ...prev, [(mine as any).id]: mine }));
      }

      // presence without slot
      await supabase.from("room_presence").upsert(
        {
          room_id: roomId,
          user_id: user.id,
          pseudo: mine?.pseudo || "Membre",
          slot_index: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_id,user_id" }
      );

      await Promise.all([loadPresence(), loadMessages()]);

      // restore slot if existed (optional)
      const { data: pres } = await supabase
        .from("room_presence")
        .select("slot_index")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();

      const restored =
        pres?.slot_index && pres.slot_index >= 1 && pres.slot_index <= 12 ? pres.slot_index : null;

      if (mounted) setSelectedSlot(restored);

      // if restored, allow camera preview
      if (restored) {
        await ensureCamStream();
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ---------- SUBSCRIPTIONS ----------
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
        async (payload) => {
          const row = payload.new as RoomMessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next = [...prev, row];
            // keep last 200
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });

          // ensure profile loaded for this sender (async)
          if (row.user_id) {
            await ensureProfilesLoaded([row.user_id]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(messagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, profilesById]);

  // ---------- HEARTBEAT ----------
  useEffect(() => {
    if (!roomId) return;

    const t = setInterval(async () => {
      const user = await supabase.auth.getUser();
      const uid = user.data.user?.id;
      if (!uid) return;

      supabase
        .from("room_presence")
        .update({ updated_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", uid);
    }, 20_000);

    return () => clearInterval(t);
  }, [roomId]);

  // ---------- CHAT AUTOSCROLL ----------
  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // ---------- DERIVED ----------
  const onlineMembers = useMemo(() => presence.filter((p) => isOnline(p.updated_at)), [presence]);

  const slotsAll = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const slotId = i + 1;
      const member = onlineMembers.find((p) => p.slot_index === slotId) || null;
      return { id: slotId, member };
    });
  }, [onlineMembers]);

  const slots = useMemo(() => (showExtras ? slotsAll : slotsAll.slice(0, 6)), [slotsAll, showExtras]);

  // ---------- SEND MESSAGE ----------
  async function sendMessage() {
    setError("");
    const content = chat.trim();
    if (!content) return;

    const user = await getAuthedUserOrRedirect();
    if (!user) return;

    setSending(true);

    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      pseudo: myProfile?.pseudo || "Membre",
      content,
    });

    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setChat("");
  }

  // ---------- CLEANUP ----------
  useEffect(() => {
    return () => {
      stopCamStream();
      if (roomId) leavePresence();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const isChanging = selectedSlot && pendingSlot && pendingSlot !== selectedSlot;

  // ---------- UI ----------
  return (
    <div className="relative min-h-screen p-4 sm:p-6 space-y-4 text-white">
      {/* Modal */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Confirmation</div>

                {selectedSlot ? (
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Changer de {slotLabel(selectedSlot)} → {pendingSlot ? slotLabel(pendingSlot) : "…"} ?
                  </h2>
                ) : (
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Prendre {pendingSlot ? slotLabel(pendingSlot) : "cette place"} ?
                  </h2>
                )}

                <p className="mt-2 text-sm leading-6 text-white/60">
                  {selectedSlot
                    ? "Tu vas quitter ta place actuelle et apparaître dans la nouvelle."
                    : "Tu vas apparaître dans ce carré. Tu pourras changer plus tard."}
                </p>

                {isChanging ? (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-300" />
                    <div className="text-sm text-yellow-200/90">
                      Attention : tu changes d’emplacement. Tes réglages cam/mic restent, mais ta position bouge.
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                onClick={closeModal}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                title="Fermer"
              >
                <X className="h-4 w-4 text-white/80" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                disabled={confirmBusy}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/80 hover:bg-white/10 disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                onClick={confirmJoin}
                disabled={confirmBusy || !pendingSlot}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-3 text-sm font-black text-black hover:opacity-95 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {confirmBusy ? "..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Top bar */}
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
            {selectedSlot ? `Ta place: ${slotLabel(selectedSlot)}` : "Aucune place"}
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
          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-white/70">
              Pseudos stylés dans le chat ✅
            </div>

            <div className="flex flex-wrap gap-2">
              {!selectedSlot ? (
                <button
                  onClick={requestAuto}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-sm font-black text-black hover:opacity-95"
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

          {/* Slots grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => {
              const occupied = Boolean(s.member);

              return (
                <div
                  key={s.id}
                  className={cx(
                    "aspect-square rounded-2xl border border-white/10 bg-black/50 overflow-hidden relative",
                    selectedSlot === s.id && "ring-1 ring-rose-400/40"
                  )}
                >
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white/80">
                    {slotLabel(s.id)}
                  </div>

                  {selectedSlot === s.id && videoRef.current?.srcObject ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={cx("w-full h-full object-cover", !cam && "opacity-20 blur-sm")}
                    />
                  ) : occupied ? (
                    <div className="flex h-full w-full flex-col items-center justify-center text-center p-4">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <Users className="h-6 w-6 text-white/70" />
                      </div>
                      <div className="max-w-[90%] truncate text-sm font-black">
                        {s.member?.pseudo || "Membre"}
                      </div>
                      <div className="mt-1 text-[11px] text-white/45">Occupé</div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-center p-4">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03]">
                        <Camera className="h-6 w-6 text-white/35" />
                      </div>
                      <div className="text-sm font-black text-white/85">Libre</div>

                      <button
                        onClick={() => requestJoinSlot(s.id)}
                        className="mt-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-xs font-black text-black transition hover:opacity-95"
                      >
                        {selectedSlot ? "Changer ici" : "Rejoindre"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cam/mic */}
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

          {/* CHAT */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 text-lg font-black">Chat</div>

            <div
              ref={chatBoxRef}
              className="h-64 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-white/55">
                  Aucun message.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = m.user_id === myUserId;
                    const p = profilesById[m.user_id] || { pseudo: m.pseudo || "Membre" };

                    return (
                      <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cx(
                            "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                            mine
                              ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                              : "border border-white/10 bg-white/10 text-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className={cx(mine ? "text-black/80" : "text-white/85")}>
                              <ProfileName profile={p} size="sm" showTitle />
                            </div>
                            <div className={cx("text-[11px] font-bold", mine ? "text-black/60" : "text-white/45")}>
                              {formatMsgTime(m.created_at)}
                            </div>
                          </div>

                          <div className="mt-2 whitespace-pre-wrap leading-6">
                            {m.content}
                          </div>
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
