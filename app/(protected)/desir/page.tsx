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

type Phase = "idle" | "queue" | "matched" | "connected";

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
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

function StageConnected() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const first = tracks[0];
  const second = tracks[1];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
        <div className="mb-3 text-sm font-bold text-white/80">Toi</div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <div className="aspect-[4/5] w-full max-h-[520px]">
            {first ? (
              <GridLayout tracks={[first]} style={{ height: "100%" }}>
                <ParticipantTile />
              </GridLayout>
            ) : (
              <div className="grid h-full place-items-center text-white/50">
                Cam locale…
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
        <div className="mb-3 text-sm font-bold text-white/80">Partenaire</div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <div className="aspect-[4/5] w-full max-h-[520px]">
            {second ? (
              <GridLayout tracks={[second]} style={{ height: "100%" }}>
                <ParticipantTile />
              </GridLayout>
            ) : (
              <div className="grid h-full place-items-center text-white/50">
                En attente du partenaire…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesirPage() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

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

  async function getAccessToken() {
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

      setCameraReady(true);
      setInfo("Caméra prête.");
    } catch {
      setError("Permission caméra refusée.");
    }
  }

  function stopCameraOnly() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setCameraReady(false);
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
    setError("");
    setInfo("Recherche en cours...");
    setLivekitToken(null);
    setLivekitUrl(null);
    setRoomName(null);
    setSessionId(null);

    try {
      if (!cameraReady) {
        await startCamera();
      }

      const { accessToken } = await getAccessToken();

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

      setPhase("queue");
      setInfo("Recherche en cours...");
    } catch (e: any) {
      setPhase("idle");
      setError(e?.message || "Impossible de lancer la recherche.");
    }
  }

  async function leave() {
    setError("");

    try {
      const { accessToken } = await getAccessToken();

      await fetch("/api/desir/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // ignore
    }

    setPhase("idle");
    setRoomName(null);
    setSessionId(null);
    setLivekitToken(null);
    setLivekitUrl(null);
    setInfo("");
  }

  async function nextPartner() {
    setError("");
    setInfo("Recherche d'un nouveau partenaire...");

    await leave();
    await new Promise((r) => setTimeout(r, 500));
    await startSearch();
  }

  async function connect() {
    setError("");
    setInfo("Connexion au partenaire...");

    try {
      if (!roomName) {
        throw new Error("roomName manquant.");
      }

      const { accessToken, userId } = await getAccessToken();

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

      setLivekitToken(json.token);
      setLivekitUrl(json.url);
      setPhase("connected");
      setInfo("Connecté 🔥");
    } catch (e: any) {
      setError(e?.message || "Connexion impossible.");
    }
  }

  useEffect(() => {
    let active = true;

    async function poll() {
      while (active && phase === "queue") {
        try {
          const { accessToken } = await getAccessToken();

          const res = await fetch("/api/desir/active-session", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const json = await res.json();
          const s = json?.session;

          if (s?.id) {
            setSessionId(String(s.id));
            setRoomName(s.room_name || `desir-${s.id}`);
            setPhase("matched");
            setInfo("🔥 Partenaire trouvé !");
            break;
          }
        } catch {
          // ignore
        }

        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (phase === "queue") {
      poll();
    }

    return () => {
      active = false;
    };
  }, [phase]);

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
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-3xl font-black text-white">Désir Intense</h1>
        <p className="mt-2 text-sm text-white/55">
          Cam-to-cam stable avec match puis connexion LiveKit.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
          {info}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {phase === "idle" ? (
          <>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
            >
              <Camera className="h-4 w-4" />
              Caméra
            </button>

            <button
              onClick={startSearch}
              className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2 font-semibold text-white"
            >
              <Play className="h-4 w-4" />
              Recherche
            </button>
          </>
        ) : null}

        {phase === "matched" ? (
          <button
            onClick={connect}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
          >
            <Play className="h-4 w-4" />
            Connect
          </button>
        ) : null}

        {(phase === "queue" || phase === "matched" || phase === "connected") ? (
          <>
            <button
              onClick={nextPartner}
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-600 px-4 py-2 font-semibold text-white"
            >
              <SkipForward className="h-4 w-4" />
              Suivant
            </button>

            <button
              onClick={leave}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </>
        ) : null}

        <button
          onClick={toggleCamera}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white",
            camEnabled ? "bg-zinc-700" : "bg-red-700"
          )}
        >
          {camEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          Cam
        </button>

        <button
          onClick={toggleMic}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white",
            micEnabled ? "bg-zinc-700" : "bg-red-700"
          )}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          Mic
        </button>

        <button
          onClick={toggleSound}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white",
            soundEnabled ? "bg-zinc-700" : "bg-red-700"
          )}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Son
        </button>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 text-sm uppercase tracking-wide text-white/45">
            Stage
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
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
                <div className="mb-3 text-sm font-bold text-white/80">Toi</div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <div className="aspect-[4/5] w-full max-h-[520px]">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    {!cameraReady ? (
                      <div className="grid h-full place-items-center text-white/50">
                        Clique « Caméra »
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
                <div className="mb-3 text-sm font-bold text-white/80">Partenaire</div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <div className="grid aspect-[4/5] w-full max-h-[520px] place-items-center text-white/50">
                    {phase === "idle" && "Clique Recherche"}
                    {phase === "queue" && "Recherche..."}
                    {phase === "matched" && "Clique Connect"}
                    {phase === "connected" && "Connecté"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 text-sm uppercase tracking-wide text-white/45">
            Chat
          </div>

          <div className="h-[320px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4">
            {chatMessages.length === 0 ? (
              <div className="grid h-full place-items-center text-white/50">
                Aucun message
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
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
                        m.mine
                          ? "bg-gradient-to-r from-pink-600 to-amber-300 text-black"
                          : "border border-white/10 bg-white/10 text-white"
                      )}
                    >
                      <div className="mb-1 text-[11px] font-bold">
                        {m.author}
                        <span className="ml-2 font-normal opacity-70">
                          {fmtTime(m.at)}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
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
              placeholder="Écris ici..."
              className="min-h-[66px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />
            <button
              onClick={sendChat}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-amber-300 px-5 py-3 font-bold text-black"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
