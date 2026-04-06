"use client";

import { useEffect, useRef, useState } from "react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Send,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Shield,
} from "lucide-react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

const supabase = requireSupabaseBrowserClient();

type Phase = "idle" | "queue" | "matched" | "connecting" | "connected";

type ChatMessage = {
  id: string;
  author: string;
  content: string;
  at: string;
  mine?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StageConnected() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const first = tracks[0];
  const second = tracks[1];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <VideoShell title="Toi" badge="LOCAL">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
          <div className="aspect-[4/5] xl:aspect-[3/4] w-full min-h-[520px]">
            {first ? (
              <GridLayout tracks={[first]} style={{ height: "100%" }}>
                <ParticipantTile />
              </GridLayout>
            ) : (
              <div className="grid h-full place-items-center text-white/45">
                Cam locale…
              </div>
            )}
          </div>
        </div>
      </VideoShell>

      <VideoShell title="Partenaire" badge="LIVE">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
          <div className="aspect-[4/5] xl:aspect-[3/4] w-full min-h-[520px]">
            {second ? (
              <GridLayout tracks={[second]} style={{ height: "100%" }}>
                <ParticipantTile />
              </GridLayout>
            ) : (
              <div className="grid h-full place-items-center text-white/45">
                En attente du partenaire…
              </div>
            )}
          </div>
        </div>
      </VideoShell>
    </div>
  );
}

function VideoShell({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">
            Désir
          </div>
          <div className="mt-1 text-lg font-black text-white">{title}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-white/60">
          {badge}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DesirPage() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const connectingRef = useRef(false);
  const leavingRef = useRef(false);
  const pollingRef = useRef(false);
  const mountedRef = useRef(true);
  const autoConnectLockRef = useRef(false);
  const nextCooldownRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const [cameraReady, setCameraReady] = useState(false);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [chat, setChat] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [nextCooldownLeft, setNextCooldownLeft] = useState(0);

  async function getSessionData() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Non authentifié.");
    }

    return {
      accessToken: session.access_token,
      userId: session.user.id,
    };
  }

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks().forEach((track) => {
        track.enabled = camEnabled;
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = micEnabled;
      });

      if (mountedRef.current) {
        setCameraReady(true);
        setInfo("Caméra prête.");
      }
    } catch {
      if (mountedRef.current) {
        setError("Permission caméra refusée ou appareil inaccessible.");
      }
    }
  }

  function stopCameraOnly() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (mountedRef.current) {
      setCameraReady(false);
    }
  }

  function toggleCamera() {
    const next = !camEnabled;
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCamEnabled(next);
  }

  function toggleMic() {
    const next = !micEnabled;
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  }

  function toggleSound() {
    setSoundEnabled((v) => !v);
  }

  async function startSearch() {
    if (connectingRef.current || leavingRef.current) return;

    setError("");
    setInfo("Recherche en cours...");
    setLivekitToken(null);
    setLivekitUrl(null);
    setRoomName(null);
    setSessionId(null);
    autoConnectLockRef.current = false;

    try {
      if (!cameraReady) {
        await startCamera();
      }

      const { accessToken } = await getSessionData();

      const res = await fetch("/api/desir/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erreur join");
      }

      if (mountedRef.current) {
        setPhase("queue");
        setInfo("Recherche en cours...");
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setPhase("idle");
        setError(e?.message || "Impossible de lancer la recherche.");
      }
    }
  }

  async function leave() {
    if (leavingRef.current) return;
    leavingRef.current = true;

    setError("");

    try {
      const { accessToken } = await getSessionData();

      await fetch("/api/desir/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // ignore
    }

    if (mountedRef.current) {
      setPhase("idle");
      setRoomName(null);
      setSessionId(null);
      setLivekitToken(null);
      setLivekitUrl(null);
      setInfo("");
    }

    leavingRef.current = false;
    connectingRef.current = false;
    pollingRef.current = false;
    autoConnectLockRef.current = false;
  }

  function startNextCooldown() {
    nextCooldownRef.current = true;
    setNextCooldownLeft(3);

    let left = 3;

    const interval = setInterval(() => {
      left -= 1;
      setNextCooldownLeft(left);

      if (left <= 0) {
        clearInterval(interval);
        nextCooldownRef.current = false;
      }
    }, 1000);
  }

  async function nextPartner() {
    if (connectingRef.current || nextCooldownRef.current) return;

    setError("");
    setInfo("Recherche d'un nouveau partenaire...");
    startNextCooldown();

    await leave();
    await new Promise((r) => setTimeout(r, 500));
    await startSearch();
  }

  async function connect() {
    if (connectingRef.current || leavingRef.current) return;

    connectingRef.current = true;
    pollingRef.current = false;

    setError("");
    setInfo("Connexion au partenaire...");
    setPhase("connecting");

    try {
      if (!roomName) {
        throw new Error("roomName manquant.");
      }

      const { accessToken, userId } = await getSessionData();

      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          room: roomName,
          identity: userId,
          sessionId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erreur token LiveKit");
      }

      if (!json.token || !json.url) {
        throw new Error("Token ou URL LiveKit manquant.");
      }

      if (mountedRef.current) {
        setLivekitToken(json.token);
        setLivekitUrl(json.url);
        setPhase("connected");
        setInfo("Connecté 🔥");
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setPhase("matched");
        setError(e?.message || "Connexion impossible.");
      }
      connectingRef.current = false;
      autoConnectLockRef.current = false;
      return;
    }

    connectingRef.current = false;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== "queue") return;
    if (pollingRef.current) return;

    pollingRef.current = true;
    let active = true;

    async function poll() {
      while (
        active &&
        mountedRef.current &&
        phase === "queue" &&
        !connectingRef.current &&
        !leavingRef.current
      ) {
        try {
          const { accessToken } = await getSessionData();

          const res = await fetch("/api/desir/active-session", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const json = await res.json();
          const s = json?.session;

          if (s?.id) {
            if (!mountedRef.current) return;

            setSessionId(String(s.id));
            setRoomName(s.room_name || `desir-${s.id}`);
            setPhase("matched");
            setInfo("🔥 Partenaire trouvé !");
            pollingRef.current = false;
            return;
          }
        } catch {
          // ignore
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      pollingRef.current = false;
    }

    poll();

    return () => {
      active = false;
      pollingRef.current = false;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "matched") return;
    if (!roomName) return;
    if (autoConnectLockRef.current) return;

    autoConnectLockRef.current = true;
    connect();
  }, [phase, roomName]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  useEffect(() => {
    return () => {
      stopCameraOnly();
    };
  }, []);

  function sendChat() {
    setError("");
    const content = chat.trim();
    if (!content) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: "Toi",
      content,
      at: new Date().toISOString(),
      mine: true,
    };

    setChatMessages((prev) => [...prev, msg]);
    setChat("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,0,130,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(130,80,255,0.16),transparent_28%),#060608] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,0,140,0.10),transparent_26%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/45">
                <Sparkles className="h-4 w-4" />
                EtherCristal
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Désir Intense
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60 md:text-base">
                Cam-to-cam premium, gros visuel, auto-connect, et contrôle rapide du partenaire.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {phase === "idle" ? (
                <>
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:scale-[1.02]"
                  >
                    <Camera className="h-4 w-4" />
                    Caméra
                  </button>

                  <button
                    onClick={startSearch}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-500 to-amber-300 px-5 py-3 font-bold text-black shadow-[0_14px_40px_rgba(255,0,140,0.35)] transition hover:scale-[1.02]"
                  >
                    <Play className="h-4 w-4" />
                    Recherche
                  </button>
                </>
              ) : null}

              {(phase === "queue" ||
                phase === "matched" ||
                phase === "connecting" ||
                phase === "connected") ? (
                <>
                  <button
                    onClick={nextPartner}
                    disabled={phase === "connecting" || nextCooldownRef.current}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 font-bold text-black shadow-[0_14px_40px_rgba(255,165,0,0.35)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <SkipForward className="h-4 w-4" />
                    {nextCooldownLeft > 0 ? `Suivant (${nextCooldownLeft}s)` : "Suivant"}
                  </button>

                  <button
                    onClick={leave}
                    disabled={phase === "connecting"}
                    className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-900/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                </>
              ) : null}

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-300 shadow-[0_10px_40px_rgba(255,0,0,0.12)]">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-emerald-300 shadow-[0_10px_40px_rgba(0,255,120,0.12)]">
            {info}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                  Stage
                </div>
                <div className="mt-1 text-2xl font-black md:text-3xl">
                  Cam-to-cam
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleCamera}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition",
                    camEnabled
                      ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                      : "bg-red-700 text-white"
                  )}
                >
                  {camEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  Cam
                </button>

                <button
                  onClick={toggleMic}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition",
                    micEnabled
                      ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                      : "bg-red-700 text-white"
                  )}
                >
                  {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  Mic
                </button>

                <button
                  onClick={toggleSound}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition",
                    soundEnabled
                      ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                      : "bg-red-700 text-white"
                  )}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Son
                </button>
              </div>
            </div>

            {phase === "connected" && livekitToken && livekitUrl ? (
              <LiveKitRoom
                token={livekitToken}
                serverUrl={livekitUrl}
                connect={true}
                audio={true}
                video={true}
                data-lk-theme="default"
                style={{ width: "100%" }}
              >
                <StageConnected />
              </LiveKitRoom>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                <VideoShell title="Toi" badge={cameraReady ? "READY" : "OFF"}>
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
                    <div className="aspect-[4/5] xl:aspect-[3/4] w-full min-h-[520px]">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      {!cameraReady ? (
                        <div className="grid h-full place-items-center text-white/45">
                          Clique « Caméra »
                        </div>
                      ) : null}
                    </div>
                  </div>
                </VideoShell>

                <VideoShell
                  title="Partenaire"
                  badge={
                    phase === "queue"
                      ? "SEARCH"
                      : phase === "matched"
                      ? "MATCH"
                      : phase === "connecting"
                      ? "CONNECT"
                      : "WAIT"
                  }
                >
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
                    <div className="grid aspect-[4/5] xl:aspect-[3/4] w-full min-h-[520px] place-items-center text-white/45">
                      {phase === "idle" && "Clique Recherche"}
                      {phase === "queue" && "Recherche..."}
                      {phase === "matched" && "Auto-connect..."}
                      {phase === "connecting" && "Connexion..."}
                      {phase === "connected" && "Connecté"}
                    </div>
                  </div>
                </VideoShell>
              </div>
            )}
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                  Chat
                </div>
                <div className="mt-1 text-2xl font-black md:text-3xl">
                  Messages
                </div>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-white/60">
                LIVE
              </div>
            </div>

            <div className="h-[540px] overflow-auto rounded-[26px] border border-white/10 bg-black/35 p-4 shadow-inner">
              {chatMessages.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/5">
                      <Heart className="h-6 w-6 text-pink-300" />
                    </div>
                    <div className="text-lg font-bold text-white/75">
                      Aucun message
                    </div>
                    <div className="mt-2 text-sm text-white/40">
                      Le chat sera encore plus beau avec le realtime branché.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cx("flex", m.mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cx(
                          "max-w-[88%] rounded-[24px] px-4 py-3 text-sm shadow-lg",
                          m.mine
                            ? "bg-gradient-to-r from-pink-600 via-fuchsia-500 to-amber-300 text-black"
                            : "border border-white/10 bg-white/10 text-white"
                        )}
                      >
                        <div className="mb-1 text-[11px] font-bold">
                          {m.author}
                          <span className="ml-2 font-normal opacity-70">
                            {fmtTime(m.at)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap leading-6">
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <textarea
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                placeholder="Écris ici..."
                className="min-h-[72px] flex-1 resize-none rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/30 focus:bg-white/[0.08]"
              />
              <button
                onClick={sendChat}
                className="inline-flex items-center gap-2 rounded-[24px] bg-gradient-to-r from-pink-600 via-fuchsia-500 to-amber-300 px-5 py-4 font-bold text-black shadow-[0_14px_40px_rgba(255,0,140,0.35)] transition hover:scale-[1.02]"
              >
                <Send className="h-4 w-4" />
                Envoyer
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white/80">
                <Shield className="h-4 w-4" />
                Statut session
              </div>
              <div className="space-y-1 text-sm text-white/55">
                <div>Phase: {phase}</div>
                <div>Room: {roomName || "—"}</div>
                <div>Session: {sessionId || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
