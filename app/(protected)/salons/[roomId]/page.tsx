"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  Camera,
  CameraOff,
  Menu,
  Mic,
  MicOff,
  RefreshCw,
  Shield,
  Users,
  Video,
  X,
} from "lucide-react";

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  is_admin?: boolean | null;
};

type RoomRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  is_live?: boolean | null;
  is_vip?: boolean | null;
  members_count?: number | null;
  max_members?: number | null;
  max_visible_slots?: number | null;
};

type RoomMemberRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  slot_number?: number | null;
  cam_enabled?: boolean | null;
  mic_enabled?: boolean | null;
  updated_at?: string | null;
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function FlashBanner({ flash }: { flash: FlashState }) {
  if (!flash) return null;

  return (
    <div
      className={cx(
        "rounded-[22px] border px-4 py-4 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.24)]",
        flash.tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/20 bg-red-500/10 text-red-100"
      )}
    >
      {flash.text}
    </div>
  );
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
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

function SlotCard({
  slotNumber,
  member,
  isSelf,
  camOn,
  localVideoRef,
}: {
  slotNumber: number;
  member?: RoomMemberRow;
  isSelf: boolean;
  camOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const hasMember = Boolean(member);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-red-500/12 bg-[#0d0d12] shadow-[0_16px_45px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />

      <div className="relative z-10">
        <div className="flex items-center justify-between border-b border-red-500/10 px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.20em] text-red-100/36">
            Slot {slotNumber}
          </div>

          {hasMember ? (
            <div className="flex items-center gap-2">
              {member?.cam_enabled ? <Tag tone="red">Cam</Tag> : <Tag>Présent</Tag>}
              {member?.mic_enabled ? <Tag tone="green">Mic</Tag> : null}
            </div>
          ) : null}
        </div>

        <div className="relative aspect-video bg-black/40">
          {isSelf && camOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
          ) : hasMember ? (
            <div className="grid h-full place-items-center px-4 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-red-500/12 bg-red-950/12">
                  <Video className="h-6 w-6 text-white/80" />
                </div>
                <div className="mt-4 text-base font-black text-white">
                  {member?.pseudo || "Membre"}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.14em] text-white/40">
                  {isSelf ? "Toi" : member?.cam_enabled ? "Cam active" : "En attente vidéo"}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center px-4 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-white/8 bg-white/[0.03]">
                  <X className="h-6 w-6 text-white/26" />
                </div>
                <div className="mt-4 text-sm font-black uppercase tracking-[0.14em] text-white/28">
                  Libre
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-red-500/10 px-4 py-3 text-sm text-white/65">
          {hasMember ? (member?.pseudo || "Membre") : "Emplacement disponible"}
        </div>
      </div>
    </div>
  );
}

export default function SalonRoomPage() {
  const router = useRouter();
  const params = useParams();

  const roomId = String(params.roomId || "");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [members, setMembers] = useState<RoomMemberRow[]>([]);
  const [flash, setFlash] = useState<FlashState>(null);

  const [mySlot, setMySlot] = useState<number | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [startingCam, setStartingCam] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const primarySlots = useMemo(() => [1, 2, 3, 4, 5, 6], []);
  const secondarySlots = useMemo(() => [7, 8, 9, 10, 11, 12], []);

  const membersBySlot = useMemo(() => {
    const map = new Map<number, RoomMemberRow>();
    for (const member of members) {
      if (member.slot_number) {
        map.set(member.slot_number, member);
      }
    }
    return map;
  }, [members]);

  const isAdmin = Boolean(profile?.is_admin);
  const shouldShowExtension = members.length > 6;

  const stopLocalMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const loadRoom = useCallback(async () => {
    const activeCutoff = new Date(Date.now() - 45_000).toISOString();

    const { data: roomRes, error: roomError } = await supabase
      .from("rooms")
      .select(
        "id, slug, name, description, is_live, is_vip, members_count, max_members, max_visible_slots"
      )
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) throw roomError;

    const { data: membersRes, error: membersError } = await supabase
      .from("room_members")
      .select(
        "id, room_id, user_id, pseudo, slot_number, cam_enabled, mic_enabled, updated_at"
      )
      .eq("room_id", roomId)
      .gte("updated_at", activeCutoff)
      .order("slot_number", { ascending: true });

    if (membersError) throw membersError;

    setRoom((roomRes as RoomRow | null) ?? null);
    setMembers((membersRes as RoomMemberRow[] | null) ?? []);
  }, [roomId]);

  const syncFlags = useCallback(
    async (nextCam: boolean, nextMic: boolean) => {
      if (!profile) return;

      await supabase
        .from("room_members")
        .update({
          cam_enabled: nextCam,
          mic_enabled: nextMic,
        })
        .eq("room_id", roomId)
        .eq("user_id", profile.id);
    },
    [profile, roomId]
  );

  const enableCamera = useCallback(async () => {
    setStartingCam(true);
    setFlash(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Caméra non supportée sur cet appareil.");
      }

      stopLocalMedia();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCamOn(true);
      setMicOn(true);
      await syncFlags(true, true);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’activer la caméra.",
      });
    } finally {
      setStartingCam(false);
    }
  }, [stopLocalMedia, syncFlags]);

  async function disableCamera() {
    stopLocalMedia();
    setCamOn(false);
    setMicOn(false);
    await syncFlags(false, false);
  }

  async function toggleMic() {
    if (!streamRef.current) return;

    const next = !micOn;
    const track = streamRef.current.getAudioTracks()[0];
    if (track) track.enabled = next;

    setMicOn(next);
    await syncFlags(camOn, next);
  }

  useEffect(() => {
    let mounted = true;
    let heartbeatInterval: number | null = null;
    let refreshInterval: number | null = null;

    async function boot() {
      try {
        setLoading(true);
        setFlash(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const { data: profileRes, error: profileError } = await supabase
          .from("profiles")
          .select("id, pseudo, is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const currentProfile = (profileRes as ProfileRow | null) ?? null;
        if (!currentProfile) {
          throw new Error("Profil introuvable.");
        }

        if (!mounted) return;
        setProfile(currentProfile);

        const { data: joinRes, error: joinError } = await supabase.rpc("join_room", {
          p_room_id: roomId,
          p_pseudo: currentProfile.pseudo || "Membre",
        });

        if (joinError) {
          const msg =
            joinError.message === "ROOM_FULL"
              ? "Salle complète."
              : joinError.message === "ROOM_NOT_FOUND"
              ? "Salle introuvable."
              : joinError.message || "Impossible de rejoindre la salle.";
          throw new Error(msg);
        }

        const slot =
          Array.isArray(joinRes) && joinRes[0]?.slot_number
            ? Number(joinRes[0].slot_number)
            : null;

        if (!mounted) return;
        setMySlot(slot);

        await loadRoom();

        heartbeatInterval = window.setInterval(async () => {
          try {
            await supabase.rpc("heartbeat_room", { p_room_id: roomId });
          } catch {}
        }, 20000);

        refreshInterval = window.setInterval(async () => {
          try {
            await loadRoom();
          } catch {}
        }, 4000);
      } catch (e: any) {
        if (!mounted) return;
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger la salle.",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    boot();

    return () => {
      mounted = false;

      if (heartbeatInterval) window.clearInterval(heartbeatInterval);
      if (refreshInterval) window.clearInterval(refreshInterval);

      stopLocalMedia();

      if (roomId) {
        void supabase.rpc("leave_room", { p_room_id: roomId });
      }
    };
  }, [loadRoom, roomId, router, stopLocalMedia]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,40,200,0.08),transparent_24%),linear-gradient(180deg,#040405_0%,#07070a_100%)]" />
        <div className="relative w-full max-w-md rounded-[32px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement de la salle...
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
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-3 rounded-[24px] border border-red-500/16 bg-red-950/12 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-white shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
            >
              <Menu className="h-5 w-5" />
              Menu
            </button>

            <button
              type="button"
              onClick={() => loadRoom()}
              disabled={syncing}
              className="inline-flex items-center gap-2.5 rounded-[24px] border border-red-500/16 bg-red-950/12 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-white shadow-[0_18px_50px_rgba(0,0,0,0.3)] disabled:opacity-50"
            >
              <RefreshCw className={cx("h-4 w-4", syncing && "animate-spin")} />
              Actualiser
            </button>
          </div>

          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[34px] border border-red-500/16 bg-gradient-to-br from-red-950/14 via-black/28 to-fuchsia-950/10 p-8 shadow-[0_26px_90px_rgba(0,0,0,0.42)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    Salle webcam
                  </div>

                  <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-white md:text-6xl">
                    {room?.name?.trim() || "Salon"}
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62">
                    {room?.description?.trim() || "Salle dynamique avec slots 1–6 puis extension 7–12."}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span>
                      Toi <span className="font-black text-white">{profile?.pseudo || "Membre"}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Slot <span className="font-black text-white">{mySlot ?? "—"}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Membres <span className="font-black text-white">{members.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Capacité <span className="font-black text-white">{room?.max_members ?? 12}</span>
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {room?.is_live ? <Tag tone="red">Live</Tag> : <Tag>Off</Tag>}
                    {room?.is_vip ? <Tag tone="gold">VIP</Tag> : null}
                    {isAdmin ? <Tag tone="green">Admin</Tag> : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      void (camOn ? disableCamera() : enableCamera());
                    }}
                    disabled={startingCam}
                    className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/85 transition hover:bg-red-900/16 disabled:opacity-50"
                  >
                    {camOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    {camOn ? "Couper cam" : startingCam ? "Activation..." : "Activer cam"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleMic()}
                    disabled={!camOn}
                    className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/85 transition hover:bg-red-900/16 disabled:opacity-40"
                  >
                    {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {micOn ? "Micro on" : "Micro off"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadRoom()}
                    className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Rafraîchir
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <section className="rounded-[30px] border border-red-500/14 bg-[#0b0b10] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.40)]">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                        Bloc principal
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">Slots 1 à 6</div>
                    </div>
                    <Tag tone="red">{Math.min(members.length, 6)}/6</Tag>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {primarySlots.map((slotNumber) => {
                      const member = membersBySlot.get(slotNumber);
                      const isSelf = member?.user_id === profile?.id;

                      return (
                        <SlotCard
                          key={slotNumber}
                          slotNumber={slotNumber}
                          member={member}
                          isSelf={Boolean(isSelf)}
                          camOn={camOn}
                          localVideoRef={localVideoRef}
                        />
                      );
                    })}
                  </div>
                </section>

                {shouldShowExtension ? (
                  <section className="rounded-[30px] border border-fuchsia-400/14 bg-[#0b0b10] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.40)]">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.30em] text-fuchsia-200/34">
                          Extension automatique
                        </div>
                        <div className="mt-1 text-2xl font-black text-white">Slots 7 à 12</div>
                      </div>
                      <Tag tone="gold">{Math.max(0, members.length - 6)}/6</Tag>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {secondarySlots.map((slotNumber) => {
                        const member = membersBySlot.get(slotNumber);
                        const isSelf = member?.user_id === profile?.id;

                        return (
                          <SlotCard
                            key={slotNumber}
                            slotNumber={slotNumber}
                            member={member}
                            isSelf={Boolean(isSelf)}
                            camOn={camOn}
                            localVideoRef={localVideoRef}
                          />
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </div>

              <aside className="space-y-6">
                <section className="rounded-[30px] border border-red-500/14 bg-[#0b0b10] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.40)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-[16px] border border-red-500/14 bg-black/25 text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                        Membres présents
                      </div>
                      <div className="mt-1 text-xl font-black text-white">{members.length}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {members.length === 0 ? (
                      <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                        Aucun membre actif.
                      </div>
                    ) : (
                      members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-start justify-between gap-4 rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black uppercase tracking-[0.12em] text-white">
                              Slot {member.slot_number} • {member.pseudo || "Membre"}
                            </div>
                            <div className="mt-1 text-sm text-white/52">
                              {member.user_id === profile?.id ? "Toi" : "Présent dans la salle"}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {member.cam_enabled ? <Tag tone="red">Cam</Tag> : <Tag>Présent</Tag>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[30px] border border-red-500/14 bg-[#0b0b10] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.40)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-[16px] border border-red-500/14 bg-black/25 text-white">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                        Monitoring
                      </div>
                      <div className="mt-1 text-xl font-black text-white">Salle</div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-white/58">
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4">
                      Capacité max : <span className="font-black text-white">{room?.max_members ?? 12}</span>
                    </div>
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4">
                      Slots visibles de base : <span className="font-black text-white">{room?.max_visible_slots ?? 6}</span>
                    </div>
                    <div className="rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4">
                      Extension automatique : <span className="font-black text-white">{shouldShowExtension ? "Oui" : "Non"}</span>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
