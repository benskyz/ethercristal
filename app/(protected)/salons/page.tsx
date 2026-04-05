"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  DoorOpen,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
  Radio,
  ChevronRight,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

type RoomRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  is_live?: boolean | null;
  is_vip?: boolean | null;
  members_count?: number | null;
};

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  is_admin?: boolean | null;
  is_vip?: boolean | null;
  role?: string | null;
};

type PresenceRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  joined_at?: string | null;
  updated_at?: string | null;
};

const supabase = requireSupabaseBrowserClient();

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getRoomTitle(room: RoomRow) {
  return room.title || room.name || "Salon privé";
}

function getRoomDescription(room: RoomRow) {
  return (
    room.description ||
    "Espace privé avec ambiance soignée, accès rapide et présence en direct."
  );
}

function getUniqueOnlineCount(rows: PresenceRow[]) {
  return new Set(rows.map((row) => row.user_id)).size;
}

export default function SalonsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function loadData(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/enter");
        return;
      }

      const [profileRes, roomsRes, presenceRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, pseudo, is_admin, is_vip, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("rooms")
          .select("id, slug, name, title, description, is_live, is_vip, members_count")
          .order("created_at", { ascending: true }),
        supabase
          .from("room_presence")
          .select("id, room_id, user_id, pseudo, joined_at, updated_at"),
      ]);

      if (profileRes.error) {
        setError((prev) => prev || profileRes.error.message);
      } else {
        setProfile((profileRes.data as ProfileRow) ?? null);
      }

      if (roomsRes.error) {
        setError((prev) => prev || roomsRes.error.message);
        setRooms([
          {
            id: "1",
            title: "Cristal Lounge",
            description: "Salon principal, propre, direct et premium.",
            is_live: true,
            is_vip: false,
            members_count: 0,
          },
          {
            id: "2",
            title: "Velvet Privé",
            description: "Salle plus filtrée, plus exclusive, accès VIP.",
            is_live: true,
            is_vip: true,
            members_count: 0,
          },
        ]);
      } else {
        const dbRooms = (roomsRes.data ?? []) as RoomRow[];

        setRooms(
          dbRooms.length > 0
            ? dbRooms
            : [
                {
                  id: "1",
                  title: "Cristal Lounge",
                  description: "Salon principal, propre, direct et premium.",
                  is_live: true,
                  is_vip: false,
                  members_count: 0,
                },
                {
                  id: "2",
                  title: "Velvet Privé",
                  description: "Salle plus filtrée, plus exclusive, accès VIP.",
                  is_live: true,
                  is_vip: true,
                  members_count: 0,
                },
              ]
        );
      }

      if (presenceRes.error) {
        setError((prev) => prev || presenceRes.error.message);
      } else {
        setPresence((presenceRes.data ?? []) as PresenceRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData("initial");
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("rooms-presence-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_presence",
        },
        async () => {
          const { data, error } = await supabase
            .from("room_presence")
            .select("id, room_id, user_id, pseudo, joined_at, updated_at");

          if (!error) {
            setPresence((data ?? []) as PresenceRow[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const canAccessVip = Boolean(
    profile?.is_vip || profile?.is_admin || profile?.role === "admin"
  );

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");

  const livePresenceRows = useMemo(() => {
    const now = Date.now();

    return presence.filter((row) => {
      const updated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      return updated > 0 && now - updated < 60_000;
    });
  }, [presence]);

  const livePresenceByRoom = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of livePresenceRows) {
      map.set(row.room_id, (map.get(row.room_id) ?? 0) + 1);
    }

    return map;
  }, [livePresenceRows]);

  const enrichedRooms = useMemo(() => {
    return rooms.map((room) => ({
      ...room,
      liveMembers: livePresenceByRoom.get(room.id) ?? 0,
    }));
  }, [rooms, livePresenceByRoom]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return enrichedRooms;

    return enrichedRooms.filter((room) =>
      [getRoomTitle(room), getRoomDescription(room)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [enrichedRooms, query]);

  const liveCount = enrichedRooms.filter((room) => Boolean(room.is_live)).length;
  const totalOnline = getUniqueOnlineCount(livePresenceRows);
  const vipRoomsCount = enrichedRooms.filter((room) => Boolean(room.is_vip)).length;

  function openRoom(room: RoomRow & { liveMembers: number }) {
    if (room.is_vip && !canAccessVip) {
      setError("Cette salle est réservée aux membres VIP.");
      return;
    }

    router.push(`/salons/${room.id}`);
  }

  return (
    <div className="relative min-h-screen space-y-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-140px] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute left-[-90px] top-[260px] h-[260px] w-[260px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-70px] right-[-70px] h-[300px] w-[300px] rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            <DoorOpen className="h-3.5 w-3.5" />
            Hall des salons
          </div>

          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                Les espaces disponibles
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                Ici, tu choisis ta salle. Pas de webcam dans ce hall. Juste un
                accès clair, propre et direct vers les espaces en ligne.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <QuickStat label="Salons" value={rooms.length} icon={DoorOpen} />
              <QuickStat label="Live" value={liveCount} icon={Radio} />
              <QuickStat label="Présents" value={totalOnline} icon={Users} />
              <QuickStat label="VIP" value={vipRoomsCount} icon={Crown} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un salon..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-rose-400/35"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadData("refresh")}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
            >
              Dashboard
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/15"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <section>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[260px] animate-pulse rounded-[28px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <h2 className="text-2xl font-black text-white">Aucun salon trouvé</h2>
            <p className="mt-2 text-white/60">Ajuste ta recherche.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const lockedVip = Boolean(room.is_vip) && !canAccessVip;

              return (
                <article
                  key={room.id}
                  className="group rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cx(
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em]",
                          room.is_live
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-white/10 text-white/60"
                        )}
                      >
                        {room.is_live ? "LIVE" : "OFFLINE"}
                      </span>

                      <span
                        className={cx(
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em]",
                          room.is_vip
                            ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
                            : "border-cyan-400/20 bg-cyan-500/10 text-cyan-300"
                        )}
                      >
                        {room.is_vip ? "VIP" : "STANDARD"}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/55">
                      <Users className="h-3.5 w-3.5" />
                      {room.liveMembers} en ligne
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/5">
                      {room.is_vip ? (
                        <Crown className="h-6 w-6 text-yellow-300" />
                      ) : (
                        <Sparkles className="h-6 w-6 text-cyan-300" />
                      )}
                    </div>

                    <h2 className="text-2xl font-black text-white">
                      {getRoomTitle(room)}
                    </h2>

                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/60">
                      {getRoomDescription(room)}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/40">
                      {lockedVip ? "Accès restreint" : "Accès disponible"}
                    </div>

                    <button
                      type="button"
                      onClick={() => openRoom(room)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                        lockedVip
                          ? "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300/75"
                          : "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
                      )}
                    >
                      {lockedVip ? (
                        <>
                          <Lock className="h-4 w-4" />
                          Réservé VIP
                        </>
                      ) : (
                        <>
                          Rejoindre
                          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2 text-white/40">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
