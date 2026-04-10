"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DoorOpen,
  Lock,
  Menu,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  ensureProfileRecord,
  isVipActive,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";
import {
  EtherFXStyles,
  FXBadge,
  FXName,
} from "@/components/effects/EtherFX";

type RoomRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_live: boolean;
  is_vip: boolean;
  members_count: number;
  max_members: number;
  visible_slots: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type PresenceRow = {
  id?: string;
  room_id: string;
  user_id: string;
  pseudo: string;
  updated_at?: string | null;
};

type RoomCardData = {
  room: RoomRow;
  activeMembers: number;
  present: boolean;
  viewers: PresenceRow[];
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

function safeText(value: unknown, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRoom(row: Record<string, unknown>): RoomRow {
  return {
    id: safeText(row.id),
    slug: safeText(row.slug),
    name: safeText(row.name, "Salon"),
    description: safeText(row.description, "Aucune description."),
    is_live: Boolean(row.is_live),
    is_vip: Boolean(row.is_vip),
    members_count: toNumber(row.members_count, 0),
    max_members: Math.max(1, toNumber(row.max_members, 12)),
    visible_slots: Math.max(1, toNumber(row.visible_slots, 6)),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function normalizePresence(row: Record<string, unknown>): PresenceRow {
  return {
    id: row.id ? String(row.id) : undefined,
    room_id: safeText(row.room_id),
    user_id: safeText(row.user_id),
    pseudo: safeText(row.pseudo, "Membre"),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function roomVariant(room: RoomRow) {
  if (room.is_vip) return "obsidian";
  if (room.is_live) return "ember";
  return "void";
}

function FlashBanner({ flash }: { flash: FlashState }) {
  if (!flash) return null;

  return (
    <div
      className={cx(
        "rounded-[20px] border px-4 py-4 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
        flash.tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/20 bg-red-500/10 text-red-100"
      )}
    >
      {flash.text}
    </div>
  );
}

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="bg-gradient-to-r from-red-300/80 via-white/90 to-fuchsia-300/80 bg-clip-text text-[11px] font-black uppercase tracking-[0.35em] text-transparent">
            {title}
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
  );
}

function RoomCard({
  item,
  vipActive,
  isAdmin,
  busy,
  onTogglePresence,
  onEnter,
}: {
  item: RoomCardData;
  vipActive: boolean;
  isAdmin: boolean;
  busy: boolean;
  onTogglePresence: () => void;
  onEnter: () => void;
}) {
  const { room, activeMembers, present, viewers } = item;

  const vipLocked = room.is_vip && !vipActive && !isAdmin;
  const full = activeMembers >= room.max_members && !present && !isAdmin;

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0b0b10] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-1 hover:border-red-400/18">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,0,90,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_26%)]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <FXName
              text={room.name}
              variant={roomVariant(room)}
              size="xl"
              className="truncate"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {room.is_live ? (
                <FXBadge label="Live" variant="ember" icon={<Video className="h-3.5 w-3.5" />} />
              ) : (
                <FXBadge label="Ouvert" variant="void" />
              )}

              {room.is_vip ? (
                <FXBadge label="VIP" variant="obsidian" icon={<Lock className="h-3.5 w-3.5" />} />
              ) : (
                <FXBadge label="Public" variant="ether" />
              )}

              <FXBadge label={`${activeMembers}/${room.max_members}`} variant="ruby" icon={<Users className="h-3.5 w-3.5" />} />
              <FXBadge label={`${room.visible_slots} slots visuels`} variant="crystal" />
            </div>
          </div>

          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white/70">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/58">
          {room.description}
        </p>

        <div className="mt-4 rounded-[22px] border border-red-500/10 bg-black/20 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
            Spectateurs présents
          </div>

          {viewers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {viewers.slice(0, 8).map((viewer) => (
                <span
                  key={`${viewer.room_id}-${viewer.user_id}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/80"
                >
                  {viewer.pseudo}
                </span>
              ))}
              {viewers.length > 8 ? (
                <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
                  +{viewers.length - 8}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/45">
              Aucun membre visible pour le moment.
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={onTogglePresence}
            className={cx(
              "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-50",
              present
                ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.16)]"
                : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.06]"
            )}
          >
            {busy ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            {present ? "Membre présent" : "Membre"}
          </button>

          <button
            type="button"
            disabled={vipLocked || full}
            onClick={onEnter}
            className={cx(
              "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50",
              vipLocked || full
                ? "border-white/10 bg-white/[0.04] text-white/45"
                : "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/16"
            )}
          >
            <DoorOpen className="h-4 w-4" />
            {vipLocked ? "VIP requis" : full ? "Salon complet" : "Entrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalonsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [viewer, setViewer] = useState<ProfileRow | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [flash, setFlash] = useState<FlashState>(null);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);

  const vipActive = useMemo(() => isVipActive(viewer), [viewer]);
  const isAdmin = Boolean(viewer?.is_admin);

  const roomCards = useMemo<RoomCardData[]>(() => {
    const map = new Map<string, PresenceRow[]>();

    for (const row of presenceRows) {
      if (!map.has(row.room_id)) map.set(row.room_id, []);
      map.get(row.room_id)!.push(row);
    }

    return rooms.map((room) => {
      const viewers = map.get(room.id) ?? [];
      const activeMembers = Math.max(viewers.length, room.members_count ?? 0);
      const present = !!viewers.find((viewerRow) => viewerRow.user_id === viewerId);

      return {
        room,
        activeMembers,
        present,
        viewers,
      };
    });
  }, [rooms, presenceRows, viewerId]);

  const filteredCards = useMemo(() => {
    const clean = searchTerm.trim().toLowerCase();

    if (!clean) return roomCards;

    return roomCards.filter((item) => {
      const text = `${item.room.name} ${item.room.slug} ${item.room.description}`.toLowerCase();
      return text.includes(clean);
    });
  }, [roomCards, searchTerm]);

  const presentRoomIds = useMemo(
    () =>
      new Set(
        roomCards.filter((item) => item.present).map((item) => item.room.id)
      ),
    [roomCards]
  );

  const totalMembers = useMemo(
    () => roomCards.reduce((sum, item) => sum + item.activeMembers, 0),
    [roomCards]
  );

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setFlash(null);

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const nextViewer = await ensureProfileRecord(user);
        setViewer(nextViewer);
        setViewerId(user.id);

        const roomsRes = await supabase
          .from("rooms")
          .select("*")
          .order("is_live", { ascending: false })
          .order("name", { ascending: true });

        if (roomsRes.error) throw roomsRes.error;

        const roomRows = ((roomsRes.data ?? []) as Record<string, unknown>[]).map(normalizeRoom);
        setRooms(roomRows);

        if (roomRows.length === 0) {
          setPresenceRows([]);
          return;
        }

        const threshold = new Date(Date.now() - 90 * 1000).toISOString();

        const presenceRes = await supabase
          .from("room_presence")
          .select("id, room_id, user_id, pseudo, updated_at")
          .in(
            "room_id",
            roomRows.map((room) => room.id)
          )
          .gte("updated_at", threshold)
          .order("updated_at", { ascending: false });

        if (presenceRes.error) throw presenceRes.error;

        setPresenceRows(
          ((presenceRes.data ?? []) as Record<string, unknown>[]).map(normalizePresence)
        );
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les salons.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    if (!viewerId || presentRoomIds.size === 0 || !viewer) return;

    const roomIds = [...presentRoomIds];
    const pseudo = profileDisplayName(viewer);

    const timer = window.setInterval(async () => {
      try {
        const supabase = requireSupabaseBrowserClient();
        const now = new Date().toISOString();

        await Promise.all(
          roomIds.map((roomId) =>
            supabase.from("room_presence").upsert(
              {
                room_id: roomId,
                user_id: viewerId,
                pseudo,
                updated_at: now,
              },
              { onConflict: "room_id,user_id" }
            )
          )
        );
      } catch {
        // silence
      }
    }, 20000);

    return () => {
      window.clearInterval(timer);
    };
  }, [presentRoomIds, viewerId, viewer]);

  useEffect(() => {
    if (!viewerId) return;

    const supabase = requireSupabaseBrowserClient();

    const channel = supabase
      .channel(`salons-${viewerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        async () => {
          await loadPage(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_presence",
        },
        async () => {
          await loadPage(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewerId, loadPage]);

  async function handleTogglePresence(item: RoomCardData) {
    if (!viewerId || !viewer) return;

    try {
      setBusyRoomId(item.room.id);

      const supabase = requireSupabaseBrowserClient();

      if (item.present) {
        const { error } = await supabase
          .from("room_presence")
          .delete()
          .eq("room_id", item.room.id)
          .eq("user_id", viewerId);

        if (error) throw error;

        setFlash({
          tone: "success",
          text: `Tu as quitté ${item.room.name}.`,
        });
      } else {
        if (item.room.is_vip && !vipActive && !isAdmin) {
          throw new Error("Ce salon demande un accès VIP.");
        }

        if (item.activeMembers >= item.room.max_members && !isAdmin) {
          throw new Error("Ce salon est complet.");
        }

        const { error } = await supabase.from("room_presence").upsert(
          {
            room_id: item.room.id,
            user_id: viewerId,
            pseudo: profileDisplayName(viewer),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "room_id,user_id" }
        );

        if (error) throw error;

        setFlash({
          tone: "success",
          text: `Présence activée dans ${item.room.name}.`,
        });
      }

      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier ta présence.",
      });
    } finally {
      setBusyRoomId(null);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement salons...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <EtherFXStyles />

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
              <section className="relative overflow-hidden rounded-[34px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

                <div className="relative z-10">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    salons publics protégés
                  </div>

                  <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
                    Salons
                    <span className="block bg-gradient-to-r from-red-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                      actifs & présents
                    </span>
                  </h1>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {profileDisplayName(viewer)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      salons <span className="font-black text-white">{roomCards.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      membres visibles <span className="font-black text-white">{totalMembers}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      ta présence <span className="font-black text-white">{presentRoomIds.size}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {vipActive ? (
                      <FXBadge label="VIP actif" variant="obsidian" icon={<Sparkles className="h-3.5 w-3.5" />} />
                    ) : (
                      <FXBadge label="Compte standard" variant="ether" />
                    )}

                    {isAdmin ? (
                      <FXBadge label="Admin" variant="ember" icon={<Shield className="h-3.5 w-3.5" />} />
                    ) : null}
                  </div>
                </div>
              </section>

              <FlashBanner flash={flash} />

              <Panel
                title="Liste des salons"
                right={<FXBadge label={`${filteredCards.length} affichés`} variant="ruby" />}
              >
                <div className="mb-5 relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Chercher un salon..."
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>

                {filteredCards.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun salon disponible avec ce filtre.
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {filteredCards.map((item) => (
                      <RoomCard
                        key={item.room.id}
                        item={item}
                        vipActive={vipActive}
                        isAdmin={isAdmin}
                        busy={busyRoomId === item.room.id}
                        onTogglePresence={() => void handleTogglePresence(item)}
                        onEnter={() => router.push(`/salons/${item.room.id}`)}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
