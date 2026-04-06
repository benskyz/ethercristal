"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Shield,
  Sparkles,
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

const supabase = requireSupabaseBrowserClient();

type ProfileRow = DisplayProfile & {
  id: string;
  pseudo?: string | null;
  email?: string | null;
};

type FullTarget = "me" | "them" | null;

type LocalChatMessage = {
  id: string;
  pseudo: string;
  content: string;
  createdAt: string;
  mine?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

export default function DesirPage() {
  const router = useRouter();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [localStarted, setLocalStarted] = useState(false);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [full, setFull] = useState<FullTarget>(null);

  const [chat, setChat] = useState("");
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([]);

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");

  const topButtons = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        onClick: () => router.push("/dashboard"),
      },
      {
        label: "Salons",
        icon: <Users className="h-4 w-4" />,
        onClick: () => router.push("/salons"),
      },
      {
        label: "Boutique",
        icon: <ShoppingBag className="h-4 w-4" />,
        onClick: () => router.push("/boutique"),
      },
    ],
    [router]
  );

  async function loadProfile() {
    setError("");
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/enter");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, pseudo, email, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setProfile(null);
    } else {
      setProfile((data as ProfileRow) ?? null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startLocalPreview() {
    setError("");
    setInfo("");

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

      setLocalStarted(true);
      setInfo("Caméra prête.");
    } catch {
      setError("Impossible d'accéder à la caméra/micro. Vérifie les permissions du navigateur.");
    }
  }

  function stopLocalPreview() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setLocalStarted(false);
    setInfo("Caméra arrêtée.");
  }

  function toggleCamera() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    const next = !camEnabled;

    stream?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });

    setCamEnabled(next);
  }

  function toggleMic() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    const next = !micEnabled;

    stream?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });

    setMicEnabled(next);
  }

  function toggleSound() {
    setSoundEnabled((v) => !v);
  }

  useEffect(() => {
    return () => {
      const stream = localVideoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  function sendChat() {
    setError("");
    const content = chat.trim();
    if (!content) return;

    const msg: LocalChatMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pseudo: profile?.pseudo || "Membre",
      content,
      createdAt: new Date().toISOString(),
      mine: true,
    };

    setChatMessages((prev) => [...prev, msg]);
    setChat("");
  }

  return (
    <div className="space-y-4">
      {full ? (
        <FullscreenOverlay
          title={full === "me" ? "Ta caméra" : "Partenaire"}
          onClose={() => setFull(null)}
        >
          {full === "me" ? (
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black">
              <div className="aspect-[4/5] w-full max-h-[80vh]">
                <video
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                  ref={(node) => {
                    if (!node) return;
                    const stream = localVideoRef.current?.srcObject as MediaStream | null;
                    if (stream && node.srcObject !== stream) {
                      node.srcObject = stream;
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="grid place-items-center rounded-[22px] border border-white/10 bg-black/70 py-24 text-white/65">
              Partenaire à connecter
            </div>
          )}
        </FullscreenOverlay>
      ) : null}

      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.08),transparent_36%)]" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/5 text-2xl">
              💎
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">
                EtherCristal
              </div>
              <h1 className="text-2xl font-black text-white">Désir Intense</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {topButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white/85 hover:bg-white/10"
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}

            {isAdmin ? (
              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-black text-violet-200 hover:bg-violet-500/15"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            ) : null}
          </div>
        </div>

        {profile && !loading ? (
          <div className="relative mt-3 rounded-[20px] border border-white/10 bg-black/30 p-3">
            <ProfileName profile={profile} size="md" showTitle showBadge />
            <div className="mt-3 flex flex-wrap gap-2">
              {!localStarted ? (
                <button
                  onClick={startLocalPreview}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2 text-xs font-black text-black hover:opacity-95"
                >
                  <Play className="h-4 w-4" />
                  Démarrer
                </button>
              ) : (
                <button
                  onClick={stopLocalPreview}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-200 hover:bg-red-500/15"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              )}

              <button
                onClick={toggleCamera}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition",
                  camEnabled
                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                )}
              >
                {camEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                Cam
              </button>

              <button
                onClick={toggleMic}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition",
                  micEnabled
                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                )}
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                Mic
              </button>

              <button
                onClick={toggleSound}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition",
                  soundEnabled
                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                )}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Son
              </button>
            </div>
          </div>
        ) : null}
      </section>

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

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="mb-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/45">Stage</div>
            <div className="mt-1 text-xl font-black text-white">Cam-to-cam</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <VideoCard
              title="Toi"
              onFull={() => setFull("me")}
            >
              <div className="aspect-[4/5] xl:aspect-square w-full max-h-[420px] overflow-hidden rounded-[18px] border border-white/10 bg-black/70">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                {!localStarted ? (
                  <div className="grid h-full place-items-center text-white/60">
                    Clique “Démarrer”
                  </div>
                ) : null}
              </div>
            </VideoCard>

            <VideoCard
              title="Partenaire"
              onFull={() => setFull("them")}
            >
              <div className="grid aspect-[4/5] xl:aspect-square w-full max-h-[420px] place-items-center overflow-hidden rounded-[18px] border border-white/10 bg-black/70 text-white/60">
                Partenaire à connecter
              </div>
            </VideoCard>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Chat</div>
              <div className="mt-1 text-xl font-black text-white">Écrire</div>
            </div>
          </div>

          <div className="mt-4 h-[300px] xl:h-[420px] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4">
            {chatMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <div className="text-sm font-black text-white">Aucun message</div>
                  <div className="mt-2 text-xs text-white/55">Écris ici.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((m) => (
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
                          {formatTime(m.createdAt)}
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

function VideoCard({
  title,
  onFull,
  children,
}: {
  title: string;
  onFull: () => void;
  children: React.ReactNode;
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
      <div className="mt-3">{children}</div>
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
