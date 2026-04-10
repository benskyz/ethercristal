"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProfileName from "@/components/ProfileName";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { ensureProfileRecord, type ProfileRow } from "@/lib/profileCompat";
import {
  getOrCreatePrivateThread,
  listThreadMessages,
  markThreadMessagesRead,
  sendPrivateMessage,
  type PrivateMessageRow,
} from "@/lib/chat";
import {
  Camera,
  CameraOff,
  Flame,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  Video,
  XCircle,
} from "lucide-react";

type GenderFilter = "any" | "woman" | "man";

type DesirSessionRow = {
  id: string;
  user_a_id: string | null;
  user_b_id: string | null;
  gender_pref_a: string;
  gender_pref_b: string;
  status: "pending" | "active" | "matched" | "ended" | "cancelled";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type PartnerProfile = {
  id: string;
  pseudo: string;
  is_vip: boolean;
  is_admin: boolean;
  master_title: string;
  master_title_style: string | null;
  active_name_fx_key: string | null;
  active_badge_key: string | null;
  active_title_key: string | null;
};

type FlashState =
  | {
      tone: "success" | "error" | "info";
      text: string;
    }
  | null;

const getSupabase = () => requireSupabaseBrowserClient();

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-white/70";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        toneClass
      )}
    >
      {children}
    </span>
  );
}

function FlashBanner({ flash }: { flash: FlashState }) {
  if (!flash) return null;

  const toneClass =
    flash.tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : flash.tone === "error"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100";

  return (
    <div className={cx("rounded-[20px] border px-4 py-4 text-sm", toneClass)}>
      {flash.text}
    </div>
  );
}

function ControlButton({
  onClick,
  active,
  icon,
  label,
  tone = "default",
  disabled = false,
}: {
  onClick: () => void;
  active: boolean;
  icon: ReactNode;
  label: string;
  tone?: "default" | "red" | "violet";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-50",
        active
          ? tone === "red"
            ? "border-red-400/18 bg-red-500/10 text-red-100"
            : tone === "violet"
            ? "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100"
            : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.07]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

async function fetchCurrentSession(userId: string): Promise<DesirSessionRow | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("desir_sessions")
    .select("*")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .in("status", ["pending", "active", "matched"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as DesirSessionRow | null) ?? null;
}

async function fetchPartnerProfile(partnerId: string): Promise<PartnerProfile | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      pseudo,
      is_vip,
      is_admin,
      master_title,
      master_title_style,
      active_name_fx_key,
      active_badge_key,
      active_title_key
    `
    )
    .eq("id", partnerId)
    .maybeSingle();

  if (error) throw error;
  return (data as PartnerProfile | null) ?? null;
}

export default function DesirClient() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [viewer, setViewer] = useState<ProfileRow | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const [genderFilter, setGenderFilter] = useState<GenderFilter>("any");

  const [session, setSession] = useState<DesirSessionRow | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PrivateMessageRow[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [flash, setFlash] = useState<FlashState>(null);

  const [camEnabled, setCamEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const statusLabel = useMemo(() => {
    if (!session) return "hors ligne";
    if (session.status === "pending") return "recherche";
    if (session.status === "matched") return "match trouvé";
    if (session.status === "active") return "session active";
    return session.status;
  }, [session]);

  const partnerId = useMemo(() => {
    if (!session || !viewerId) return null;
    if (session.user_a_id === viewerId) return session.user_b_id;
    if (session.user_b_id === viewerId) return session.user_a_id;
    return null;
  }, [session, viewerId]);

  const stopLocalMedia = useCallback(() => {
    const stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setMediaReady(false);
  }, []);

  const startLocalMedia = useCallback(async () => {
    try {
      setMediaError("");

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error("Caméra non disponible sur cet appareil.");
      }

      stopLocalMedia();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => undefined);
      }

      setCamEnabled(true);
      setMicEnabled(true);
      setMediaReady(true);
    } catch (err: any) {
      setMediaError(err?.message || "Impossible d’activer la caméra.");
      setCamEnabled(false);
      setMicEnabled(false);
      setMediaReady(false);
    }
  }, [stopLocalMedia]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = camEnabled;
    });

    stream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  }, [camEnabled, micEnabled]);

  useEffect(() => {
    return () => {
      stopLocalMedia();
    };
  }, [stopLocalMedia]);

  const hydrateSession = useCallback(async (userId: string) => {
    const activeSession = await fetchCurrentSession(userId);

    if (!activeSession) {
      setSession(null);
      setPartner(null);
      setThreadId(null);
      setMessages([]);
      return;
    }

    setSession(activeSession);

    const computedPartnerId =
      activeSession.user_a_id === userId
        ? activeSession.user_b_id
        : activeSession.user_b_id === userId
        ? activeSession.user_a_id
        : null;

    if (!computedPartnerId) {
      setPartner(null);
      setThreadId(null);
      setMessages([]);
      return;
    }

    const [partnerRow, thread] = await Promise.all([
      fetchPartnerProfile(computedPartnerId),
      getOrCreatePrivateThread(userId, computedPartnerId),
    ]);

    setPartner(partnerRow);
    setThreadId(thread.id);

    const nextMessages = await listThreadMessages(thread.id);
    setMessages(nextMessages);

    await markThreadMessagesRead(thread.id, userId).catch(() => undefined);
  }, []);

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setFlash(null);

        const supabase = getSupabase();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/enter");
          return;
        }

        const ensuredProfile = await ensureProfileRecord(user);
        setViewer(ensuredProfile);
        setViewerId(user.id);

        await hydrateSession(user.id);
      } catch (err: any) {
        setFlash({
          tone: "error",
          text: err?.message || "Impossible de charger Désir.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hydrateSession, router]
  );

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    if (!viewerId) return;

    const interval = window.setInterval(() => {
      void hydrateSession(viewerId);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [hydrateSession, viewerId]);

  async function handleStartSearch() {
    if (!viewerId) return;

    try {
      setBusy(true);
      setFlash(null);

      const supabase = getSupabase();
      const existing = await fetchCurrentSession(viewerId);

      if (!existing) {
        const { error } = await supabase.from("desir_sessions").insert({
          user_a_id: viewerId,
          gender_pref_a: genderFilter,
          gender_pref_b: "any",
          status: "pending",
        });

        if (error) throw error;
      }

      await hydrateSession(viewerId);

      setFlash({
        tone: "info",
        text:
          genderFilter === "any"
            ? "Recherche lancée sans filtre."
            : `Recherche lancée avec filtre ${genderFilter}.`,
      });
    } catch (err: any) {
      setFlash({
        tone: "error",
        text: err?.message || "Impossible de lancer la recherche.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleEndSession() {
    if (!viewerId || !session) return;

    try {
      setBusy(true);
      setFlash(null);

      const supabase = getSupabase();

      const { error } = await supabase
        .from("desir_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (error) throw error;

      setSession(null);
      setPartner(null);
      setThreadId(null);
      setMessages([]);
      setMessageInput("");

      setFlash({
        tone: "success",
        text: "Session terminée.",
      });
    } catch (err: any) {
      setFlash({
        tone: "error",
        text: err?.message || "Impossible de fermer la session.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage() {
    if (!viewerId || !partnerId || !threadId) return;

    const clean = messageInput.trim();
    if (!clean) return;

    try {
      await sendPrivateMessage({
        senderId: viewerId,
        receiverId: partnerId,
        content: clean,
      });

      const nextMessages = await listThreadMessages(threadId);
      setMessages(nextMessages);
      setMessageInput("");
    } catch (err: any) {
      setFlash({
        tone: "error",
        text: err?.message || "Impossible d’envoyer le message.",
      });
    }
  }

  async function handleReportPartner() {
    if (!viewerId || !partnerId || !session) return;

    try {
      const supabase = getSupabase();

      const { error } = await supabase.from("desir_session_reports").insert({
        session_id: session.id,
        reporter_id: viewerId,
        reported_user_id: partnerId,
        reason: "signalement_desir",
        status: "open",
      });

      if (error) throw error;

      setFlash({
        tone: "success",
        text: "Signalement envoyé à la modération.",
      });
    } catch (err: any) {
      setFlash({
        tone: "error",
        text: err?.message || "Impossible d’envoyer le signalement.",
      });
    }
  }

  function handleToggleCam() {
    if (!mediaReady) {
      void startLocalMedia();
      return;
    }

    setCamEnabled((prev) => !prev);
  }

  function handleToggleMic() {
    if (!mediaReady) {
      void startLocalMedia();
      return;
    }

    setMicEnabled((prev) => !prev);
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            Désir
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative min-h-screen lg:pl-[290px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,20,20,0.20),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(170,50,170,0.12),transparent_35%),radial-gradient(circle_at_50%_5%,rgba(59,130,246,0.10),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)]" />
          <div className="absolute -left-24 top-16 h-[450px] w-[450px] rounded-full bg-gradient-to-r from-red-700/20 via-fuchsia-700/16 to-blue-700/12 blur-[160px]" />
          <div className="absolute right-8 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-red-600/16 via-pink-600/16 to-orange-600/14 blur-[150px]" />
        </div>

        <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-3 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            <button
              type="button"
              onClick={() => void loadPage(false)}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[30px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    cam to cam
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Désir intense
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {sanitizeText(viewer?.pseudo, "Membre")}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      statut <span className="font-black text-white">{statusLabel}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits{" "}
                      <span className="font-black text-white">{viewer?.credits ?? 0}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="red">
                      <Flame className="h-3.5 w-3.5" />
                      désir
                    </Tag>
                    <Tag tone="violet">
                      <MessageSquare className="h-3.5 w-3.5" />
                      chat privé
                    </Tag>
                    {viewer?.is_vip ? <Tag tone="gold">vip</Tag> : null}
                    {viewer?.is_admin ? <Tag tone="red">admin</Tag> : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleStartSearch()}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16 disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    Lancer la recherche
                  </button>

                  <button
                    type="button"
                    disabled={busy || !session}
                    onClick={() => void handleEndSession()}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-500/16 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Quitter
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <section className="rounded-[26px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                filtre de recherche
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { key: "any", label: "Tous" },
                  { key: "woman", label: "Femme" },
                  { key: "man", label: "Homme" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGenderFilter(item.key as GenderFilter)}
                    className={cx(
                      "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                      genderFilter === item.key
                        ? "border-red-400/18 bg-red-500/10 text-red-100"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.07]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                    ta caméra
                  </div>
                  <Tag tone={mediaReady ? "green" : "default"}>
                    {mediaReady ? "active" : "inactive"}
                  </Tag>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-red-500/12 bg-black/30 aspect-video">
                  <video
                    ref={localVideoRef}
                    muted
                    playsInline
                    autoPlay
                    className={cx(
                      "h-full w-full object-cover",
                      mediaReady ? "opacity-100" : "opacity-0"
                    )}
                  />

                  {!mediaReady ? (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <Video className="mx-auto h-12 w-12 text-white/20" />
                        <div className="mt-3 text-sm text-white/52">
                          Caméra locale inactive
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {mediaError ? (
                  <div className="mt-4 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                    {mediaError}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <ControlButton
                    onClick={() => void startLocalMedia()}
                    active={mediaReady}
                    icon={<Video className="h-4 w-4" />}
                    label={mediaReady ? "Réactiver média" : "Activer caméra"}
                    tone="violet"
                  />

                  <ControlButton
                    onClick={handleToggleCam}
                    active={camEnabled}
                    icon={camEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                    label={camEnabled ? "Cam on" : "Cam off"}
                    tone="red"
                    disabled={!mediaReady && busy}
                  />

                  <ControlButton
                    onClick={handleToggleMic}
                    active={micEnabled}
                    icon={micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    label={micEnabled ? "Mic on" : "Mic off"}
                    tone="violet"
                    disabled={!mediaReady && busy}
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                    match distant
                  </div>
                  <Tag tone={partner ? "green" : session ? "gold" : "default"}>
                    {partner ? "connecté" : session ? "en attente" : "aucun match"}
                  </Tag>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-red-500/12 bg-black/30 aspect-video">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.05),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(255,0,90,0.10),transparent_24%)]" />

                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    {partner ? (
                      <>
                        <div className="mb-4 grid h-20 w-20 place-items-center rounded-full border border-fuchsia-400/18 bg-fuchsia-500/10">
                          <Users className="h-8 w-8 text-fuchsia-100" />
                        </div>

                        <ProfileName
                          pseudo={partner.pseudo}
                          isVip={partner.is_vip}
                          isAdmin={partner.is_admin}
                          masterTitle={partner.master_title}
                          masterTitleStyle={partner.master_title_style}
                          activeNameFxKey={partner.active_name_fx_key}
                          activeBadgeKey={partner.active_badge_key}
                          activeTitleKey={partner.active_title_key}
                          className="max-w-full"
                        />

                        <div className="mt-4 max-w-md text-sm leading-6 text-white/58">
                          Le slot distant est prêt. Le vrai flux vidéo distant dépend encore
                          de ton branchement WebRTC/signaling.
                        </div>
                      </>
                    ) : session ? (
                      <>
                        <RefreshCw className="h-12 w-12 animate-spin text-amber-200/60" />
                        <div className="mt-4 text-lg font-black text-white">
                          Recherche en cours...
                        </div>
                        <div className="mt-2 text-sm text-white/52">
                          On attend qu’un partenaire rejoigne la session.
                        </div>
                      </>
                    ) : (
                      <>
                        <Video className="h-12 w-12 text-white/20" />
                        <div className="mt-4 text-lg font-black text-white">
                          Aucun match actif
                        </div>
                        <div className="mt-2 text-sm text-white/52">
                          Lance la recherche pour ouvrir un slot distant.
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!partner || busy}
                    onClick={() => void handleReportPartner()}
                    className="inline-flex items-center gap-2 rounded-[16px] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition disabled:opacity-50"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Signaler
                  </button>

                  <button
                    type="button"
                    disabled={!partner || busy}
                    onClick={() => void handleEndSession()}
                    className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Terminer
                  </button>
                </div>
              </section>
            </div>

            <section className="rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                  chat privé
                </div>
                <Tag tone={partner ? "green" : "default"}>
                  {partner ? "ouvert" : "en attente"}
                </Tag>
              </div>

              <div className="rounded-[22px] border border-red-500/10 bg-black/20 p-4">
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <div className="flex h-[220px] items-center justify-center text-center text-sm text-white/45">
                      {partner
                        ? "Aucun message pour le moment."
                        : "Le chat s’active quand un partenaire est connecté."}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const mine = msg.sender_id === viewerId;

                      return (
                        <div
                          key={msg.id}
                          className={cx(
                            "flex",
                            mine ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cx(
                              "max-w-[85%] rounded-[18px] px-4 py-3 text-sm leading-6",
                              mine
                                ? "border border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100"
                                : "border border-white/10 bg-white/[0.04] text-white/80"
                            )}
                          >
                            <div>{msg.content}</div>
                            <div className="mt-1 text-[11px] text-white/40">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    disabled={!partner}
                    placeholder={
                      partner ? "Écris un message..." : "Chat indisponible sans match"
                    }
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    disabled={!partner || !messageInput.trim()}
                    onClick={() => void handleSendMessage()}
                    className="inline-flex shrink-0 items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Envoyer
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
