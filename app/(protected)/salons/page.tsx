"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";
import { Search, Users, Shield, RefreshCw, ArrowRight } from "lucide-react";

const supabase = requireSupabaseBrowserClient();

type RoomRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  is_live?: boolean | null;
  is_vip?: boolean | null;
  members_count?: number | null;
  created_at?: string | null;
};

type PresenceRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  joined_at?: string | null;
  updated_at?: string | null;
};

type ProfileRow = DisplayProfile & {
  id: string;
  pseudo?: string | null;
  is_admin?: boolean | null;
  is_vip?: boolean | null;
  role?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function getRoomTitle(room: RoomRow) {
  return room.title || room.name || "Salon privé";
}
function getRoomDescription(room: RoomRow) {
  return room.description || "Espace privé premium, présence en direct.";
}

export default function SalonsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [presence, setPresence] = useState<PresenceRow[]>([]);

  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");
  const canAccessVip = Boolean(profile?.is_vip || isAdmin);

  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    setError("");

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      router.replace("/enter");
      return;
    }

    const [pRes, roomsRes, presRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, pseudo, is_admin, is_vip, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("rooms")
        .select("id, slug, name, title, description, is_live, is_vip, members_count, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("room_presence")
        .select("id, room_id, user_id, pseudo, joined_at, updated_at"),
    ]);

    if (pRes.error) setError(pRes.error.message);
    else setProfile((pRes.data as any) ?? null);

    if (roomsRes.error) {
      // fallback si table rooms vide / pas prête
      setError((prev) => prev || roomsRes.error!.message);
      setRooms([
        {
          id: "1",
          title: "Cristal Lounge",
          description: "Salon principal, propre, direct et premium.",
          is_live: true,
          is_vip: false,
        },
        {
          id: "2",
          title: "Velvet Privé",
          description: "Salon VIP filtré, plus exclusif.",
          is_live: true,
          is_vip: true,
        },
      ]);
    } else {
      const list = (roomsRes.data ?? []) as RoomRow[];
      setRooms(
        list.length
          ? list
          : [
              {
                id: "1",
                title: "Cristal Lounge",
                description: "Salon principal, propre, direct et premium.",
                is_live: true,
                is_vip: false,
              },
              {
                id: "2",
                title: "Velvet Privé",
                description: "Salon VIP filtré, plus exclusif.",
                is_live: true,
                is_vip: true,
              },
            ]
      );
    }

    if (presRes.error) setError((prev) => prev || presRes.error!.message);
    else setPresence((presRes.data ?? []) as PresenceRow[]);

    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadAll(true);
    setRefreshing(false);
  }

  // ✅ REALTIME FIXED: unique channel name + cleanup
  useEffect(() => {
    let alive = true;
    let channel: any = null;

    const channelName = `salons-presence-${Date.now()}`;

    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_presence" },
        async () => {
          if (!alive) return;
          const { data, error } = await supabase
            .from("room_presence")
            .select("id, room_id, user_id, pseudo, joined_at, updated_at");

          if (!error) setPresence((data ?? []) as PresenceRow[]);
        }
      )
      .subscribe();

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const livePresenceByRoom = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, number>();
    for (const row of presence) {
      const updated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (now - updated > 60000) continue;
      map.set(row.room_id, (map.get(row.room_id) ?? 0) + 1);
    }
    return map;
  }, [presence]);

  const enrichedRooms = useMemo(() => {
    return rooms.map((r) => ({
      ...r,
      liveMembers: livePresenceByRoom.get(r.id) ?? 0,
    }));
  }, [rooms, livePresenceByRoom]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enrichedRooms;
    return enrichedRooms.filter((r) =>
      `${getRoomTitle(r)} ${getRoomDescription(r)}`.toLowerCase().includes(q)
    );
  }, [enrichedRooms, query]);

  const liveCount = enrichedRooms.filter((r) => Boolean(r.is_live)).length;
  const totalOnline = enrichedRooms.reduce((sum, r) => sum + r.liveMembers, 0);

  function openRoom(room: RoomRow & { liveMembers: number }) {
    if (room.is_vip && !canAccessVip) {
      setError("Ce salon est réservé aux membres VIP.");
      return;
    }
    router.push(`/salons/${room.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header premium (même vibe que /enter) */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Salons
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Les espaces disponibles
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Ici c’est une liste propre. Les webcams sont seulement dans les salles.
            </p>

            {profile ? (
              <div className="mt-5">
                <ProfileName profile={profile} size="md" showTitle showBadge />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill label="Salons" value={rooms.length} />
              <Pill label="Live" value={liveCount} />
              <Pill label="Présents" value={totalOnline} />
              {canAccessVip ? (
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                  VIP OK
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/55">
                  Standard
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10 disabled:opacity-70"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </button>

            {isAdmin ? (
              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-200 hover:bg-violet-500/15"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un salon..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-rose-400/35"
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Rooms list */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[220px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <h2 className="text-2xl font-black text-white">Aucun salon</h2>
          <p className="mt-2 text-white/60">Ajuste ta recherche.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const lockedVip = Boolean(room.is_vip) && !canAccessVip;

            return (
              <article
                key={room.id}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[10px] font-black",
                        room.is_live
                          ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          : "border border-white/10 bg-white/10 text-white/60"
                      )}
                    >
                      {room.is_live ? "LIVE" : "OFFLINE"}
                    </span>

                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[10px] font-black",
                        room.is_vip
                          ? "border border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                      )}
                    >
                      {room.is_vip ? "VIP" : "STANDARD"}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-2 text-xs text-white/50">
                    <Users className="h-4 w-4" />
                    {room.liveMembers}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-black text-white">{getRoomTitle(room)}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {getRoomDescription(room)}
                </p>

                <button
                  type="button"
                  onClick={() => openRoom(room)}
                  className={cx(
                    "mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                    lockedVip
                      ? "border border-amber-400/20 bg-amber-500/10 text-amber-200/80"
                      : "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
                  )}
                >
                  {lockedVip ? "Réservé VIP" : "Rejoindre"}
                  {!lockedVip ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70">
      {label}: {value}
    </span>
  );
}
