"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Shield,
  LayoutDashboard,
  Users,
  ShoppingBag,
  Play,
  Square,
  Expand,
  X,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Send,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";
import { createSafeChannel } from "@/lib/realtime";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = DisplayProfile & {
  id: string;
  email?: string | null;
};

type DesirState =
  | { phase: "idle" }
  | { phase: "queue"; since: number }
  | { phase: "matched"; since: number; roomName: string; sessionId?: string | null }
  | { phase: "connected"; roomName: string; token: string; url?: string | null; sessionId?: string | null };

type FullTarget = "me" | "them" | null;

type ChatMsg = {
  id: string;
  pseudo: string;
  content: string;
  at: string;
  mine?: boolean;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function pickString(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
function pickMaybe(obj: any, keys: string[]) {
  const s = pickString(obj, keys);
  return s || null;
}
function isoNow() {
  return new Date().toISOString();
}

export default function DesirProtectedPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [state, setState] = useState<DesirState>({ phase: "idle" });

  const [sound, setSound] = useState(true);
  const [full, setFull] = useState<FullTarget>(null);

  const [chat, setChat] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");

  async function loadProfile() {
    setError("");
    setLoading(true);

    const { data, error: authErr } = await supabase.auth.getUser();
    if (authErr || !data?.user) {
      router.replace("/enter");
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select(
        "id, pseudo, email, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (pErr) setError(pErr.message);
    setProfile((p as any) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function apiJSON(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    });
    const txt = await res.text();
    let json: any = null;
    try {
      json = txt ? JSON.parse(txt) : null;
    } catch {
      json = { raw: txt };
    }
    if (!res.ok) {
      const msg = pickString(json, ["error", "message"]) || `Erreur API (${res.status})`;
      throw new Error(msg);
    }
    return json;
  }

  async function desirJoinQueue() {
    return apiJSON("/api/desir/join", { method: "POST", body: JSON.stringify({}) });
  }
  async function desirLeaveQueue() {
    return apiJSON("/api/desir/leave", { method: "POST", body: JSON.stringify({}) });
  }
  async function desirActiveSession() {
    return apiJSON("/api/desir/active-session", { method: "GET" });
  }
  async function desirEndSession() {
    return apiJSON("/api/desir/end", { method: "POST", body: JSON.stringify({}) });
  }

  async function getLiveKitToken(roomName: string) {
    let json: any = null;
    try {
      json = await apiJSON(`/api/livekit/token?room=${encodeURIComponent(roomName)}`, { method: "GET" });
    } catch {
      json = await apiJSON("/api/livekit/token", {
        method: "POST",
        body: JSON.stringify({ room: roomName }),
      });
    }

    const token = pickString(json, ["token", "accessToken", "jwt"]);
    if (!token) throw new Error("Token LiveKit introuvable.");

    const url =
      pickMaybe(json, ["url", "serverUrl", "wsUrl", "livekitUrl"]) ||
      (process.env.NEXT_PUBLIC_LIVEKIT_URL as any) ||
      null;

    return { token, url };
  }

  async function startQueue() {
    setError("");
    setInfo("");
    setState({ phase: "queue", since: Date.now() });

    try {
      const j = await desirJoinQueue();
      const roomName = pickString(j, ["roomName", "room", "room_name"]);
      const sessionId = pickMaybe(j, ["sessionId", "session_id", "id"]);
      if (roomName) setState({ phase: "matched", since: Date.now(), roomName, sessionId });
      else setState({ phase: "queue", since: Date.now() });
    } catch (e: any) {
      setError(e?.message || "Impossible de rejoindre la file.");
      setState({ phase: "idle" });
    }
  }

  async function stopEverything() {
    setError("");
    setInfo("");
    try {
      await desirLeaveQueue();
    } catch {}
    setState({ phase: "idle" });
  }

  async function connect(roomName: string, sessionId?: string | null) {
    setError("");
    setInfo("");
    try {
      const { token, url } = await getLiveKitToken(roomName);
      setState({ phase: "connected", roomName, token, url, sessionId: sessionId ?? null });
      setInfo("Connecté ✅");
    } catch (e: any) {
      setError(e?.message || "Connexion impossible.");
      setState({ phase: "matched", since: Date.now(), roomName, sessionId: sessionId ?? null });
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      while (alive) {
        if (state.phase === "queue" || state.phase === "matched") {
          try {
            const j = await desirActiveSession();
            const roomName = pickString(j, ["roomName", "room", "room_name"]);
            const sessionId = pickMaybe(j, ["sessionId", "session_id", "id"]);
            if (roomName) setState({ phase: "matched", since: Date.now(), roomName, sessionId });
            else if (state.phase === "matched") setState({ phase: "queue", since: Date.now() });
          } catch {}
        }
        await sleep(2000);
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.phase]);

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  const chatKey = useMemo(() => {
    if (state.phase === "connected") return `desir:${state.roomName}`;
    if (state.phase === "matched") return `desir:${state.roomName}`;
    return "desir:lobby";
  }, [state.phase, (state as any).roomName]);

  useEffect(() => {
    setChatMsgs([]);
    let alive = true;

    const { channel, cleanup } = createSafeChannel(supabase as any, `desir-chat-${chatKey}`);

    channel
      .on("broadcast", { event: "chat" }, (payload: any) => {
        if (!alive) return;
        const msg = payload?.payload as ChatMsg;
        if (!msg?.id) return;
        setChatMsgs((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].slice(-200);
        });
      })
      .subscribe();

    return () => {
      alive = false;
      cleanup();
    };
  }, [chatKey]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs.length]);

  async function sendChat() {
    setError("");
    const content = chat.trim();
    if (!content) return;

    const pseudo = profile?.pseudo || "Membre";
    const msg: ChatMsg = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pseudo,
      content,
      at: isoNow(),
      mine: true,
    };

    setChatMsgs((prev) => [...prev, msg].slice(-200));
    setChat("");

    const { channel } = createSafeChannel(supabase as any, `desir-chat-send-${chatKey}`);
    try {
      await channel.send({ type: "broadcast", event: "chat", payload: msg });
    } catch {}

    try {
      await supabase.from("room_messages").insert({
        room_id: chatKey,
        user_id: profile?.id,
        pseudo,
        content,
      });
    } catch {
    } finally {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
  }

  return (
    <div className="space-y-4">
      {full ? (
        <FullscreenOverlay title={full === "me" ? "Toi" : "Partenaire"} onClose={() => setFull(null)}>
          {state.phase === "connected" ? (
            <div className="rounded-[22px] border border-white/10 bg-black/60 p-3">
              <LiveTilePreview />
            </div>
          ) : (
            <div className="grid place-items-center h-[55vh] rounded-[18px] border border-white/10 bg-black/60 text-white/70">
              Pas connecté.
            </div>
          )}
        </FullscreenOverlay>
      ) : null}

      {/* top compact */}
      <header className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.08),transparent_36%)]" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <LogoBadge />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">EtherCristal</div>
              <div className="truncate text-2xl font-black text-white">Désir Intense</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TopBtn icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" onClick={() => router.push("/dashboard")} />
            <TopBtn icon={<Users className="h-4 w-4" />} label="Salons" onClick={() => router.push("/salons")} />
            <TopBtn icon={<ShoppingBag className="h-4 w-4" />} label="Boutique" onClick={() => router.push("/boutique")} />

            {isAdmin ? (
              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-black text-violet-200 hover:bg-violet-500/15"
              >
                <Shield className="h-4 w-4" /> Admin
              </button>
            ) : null}
          </div>
        </div>

        {profile && !loading ? (
          <div className="relative mt-3 rounded-[20px] border border-white/10 bg-black/30 p-3">
            <ProfileName profile={profile} size="md" showTitle showBadge />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                {state.phase.toUpperCase()}
              </span>

              {state.phase === "idle" ? (
                <button
                  onClick={startQueue}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-xs font-black text-black hover:opacity-95"
                >
                  <Play className="h-4 w-4" /> Démarrer
                </button>
              ) : state.phase === "matched" ? (
                <button
                  onClick={() => connect(state.roomName, state.sessionId)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-xs font-black text-black hover:opacity-95"
                >
                  <Play className="h-4 w-4" /> Connect
                </button>
              ) : (
                <button
                  onClick={stopEverything}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-200 hover:bg-red-500/15"
                >
                  <Square className="h-4 w-4" /> Stop
                </button>
              )}

              <button
                onClick={() => setSound((v) => !v)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition",
                  sound
                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                )}
              >
                {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Son
              </button>
            </div>
          </div>
        ) : null}
      </header>

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

      {/* videos + chat side by side on desktop */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Stage</div>
              <div className="mt-1 text-xl font-black text-white">Cam-to-cam</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {state.phase !== "connected" ? (
              <>
                <BigVideoCard title="Toi" onFull={() => setFull("me")} placeholder="En attente…" compact />
                <BigVideoCard title="Partenaire" onFull={() => setFull("them")} placeholder="En attente…" compact />
              </>
            ) : (
              <div className="lg:col-span-2 rounded-[20px] border border-white/10 bg-black/50 p-3">
                <LiveKitRoom
                  token={state.token}
                  serverUrl={state.url ?? undefined}
                  connect={true}
                  audio={true}
                  video={true}
                  data-lk-theme="default"
                  style={{ width: "100%" }}
                >
                  <TwoCompactTiles
                    sound={sound}
                    onFullMe={() => setFull("me")}
                    onFullThem={() => setFull("them")}
                    onStop={stopEverything}
                  />
                </LiveKitRoom>
              </div>
            )}
          </div>
        </section>

        {/* chat */}
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Chat</div>
              <div className="mt-1 text-xl font-black text-white">Écrire</div>
            </div>
            <span className="text-[11px] text-white/40">{chatKey}</span>
          </div>

          <div className="mt-4 h-[300px] xl:h-[420px] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4">
            {chatMsgs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <div className="text-sm font-black text-white">Aucun message</div>
                  <div className="mt-2 text-xs text-white/55">Écris ici.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMsgs.map((m) => (
                  <div key={m.id} className={cx("flex", m.mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cx(
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
                        m.mine
                          ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                          : "border border-white/10 bg-white/10 text-white"
                      )}
                    >
                      <div className={cx("mb-1 text-[11px] font-black", m.mine ? "text-black/70" : "text-white/60")}>
                        {m.pseudo}
                        <span className={cx("ml-2 font-normal", m.mine ? "text-black/60" : "text-white/45")}>
                          {new Date(m.at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap leading-6">{m.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <textarea
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              placeholder="Écris ici…"
              className="min-h-[66px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") sendChat();
              }}
            />
            <button
              onClick={sendChat}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3 text-sm font-black text-black hover:opacity-95"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function TopBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white/85 hover:bg-white/10"
    >
      {icon} {label}
    </button>
  );
}

function LogoBadge() {
  return (
    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
      <span className="text-2xl">💎</span>
    </div>
  );
}

function BigVideoCard({
  title,
  onFull,
  placeholder,
  compact,
}: {
  title: string;
  onFull: () => void;
  placeholder: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-white/85">{title}</div>
        <button
          onClick={onFull}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/80 hover:bg-white/10"
        >
          <Expand className="h-4 w-4" />
          Plein écran
        </button>
      </div>

      <div
        className={cx(
          "mt-3 grid w-full place-items-center overflow-hidden rounded-[18px] border border-white/10 bg-black/70 text-white/65",
          compact ? "aspect-[4/5] xl:aspect-square max-h-[420px]" : "aspect-square"
        )}
      >
        {placeholder}
      </div>
    </div>
  );
}

function FullscreenOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/70 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="text-sm font-black text-white/90">{title}</div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
            aria-label="Close fullscreen"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function TwoCompactTiles({
  sound,
  onFullMe,
  onFullThem,
  onStop,
}: {
  sound: boolean;
  onFullMe: () => void;
  onFullThem: () => void;
  onStop: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  async function toggleCam() {
    const next = !cam;
    setCam(next);
    try {
      await localParticipant.setCameraEnabled(next);
    } catch {}
  }

  async function toggleMic() {
    const next = !mic;
    setMic(next);
    try {
      await localParticipant.setMicrophoneEnabled(next);
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={toggleCam}
          className={cx(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
            cam
              ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
              : "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
          )}
        >
          {cam ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          Cam
        </button>

        <button
          onClick={toggleMic}
          className={cx(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
            mic
              ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
              : "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
          )}
        >
          {mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          Mic
        </button>

        <button
          onClick={onStop}
          className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/15"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>

        <span className="self-center text-xs text-white/40">Son: {sound ? "ON" : "OFF"}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-black/40 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-white/85">Toi</div>
            <button
              onClick={onFullMe}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/80 hover:bg-white/10"
            >
              <Expand className="h-4 w-4" />
              Plein écran
            </button>
          </div>
          <div className="mt-3 overflow-hidden rounded-[18px] border border-white/10 bg-black/70">
            <div className="aspect-[4/5] xl:aspect-square w-full max-h-[420px]">
              <GridLayout tracks={tracks} style={{ height: "100%" as any }}>
                <ParticipantTile />
              </GridLayout>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-black/40 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-white/85">Partenaire</div>
            <button
              onClick={onFullThem}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/80 hover:bg-white/10"
            >
              <Expand className="h-4 w-4" />
              Plein écran
            </button>
          </div>
          <div className="mt-3 overflow-hidden rounded-[18px] border border-white/10 bg-black/70">
            <div className="aspect-[4/5] xl:aspect-square w-full max-h-[420px]">
              <GridLayout tracks={tracks} style={{ height: "100%" as any }}>
                <ParticipantTile />
              </GridLayout>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveTilePreview() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  return (
    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black/60">
      <div style={{ height: "55vh" as any }}>
        <GridLayout tracks={tracks} style={{ height: "100%" as any }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    </div>
  );
}
