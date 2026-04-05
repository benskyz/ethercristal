"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";
import { RefreshCw, Search, Shield, Crown, Users } from "lucide-react";

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
  updated_at?: string | null;
  joined_at?: string | null;
};

type MyProfile = DisplayProfile & {
  id: string;
  credits?: number | null;
  vip_expires_at?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function isOnline(updated_at?: string | null) {
  if (!updated_at) return false;
  const t = new Date(updated_at).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 60_000;
}

function roomTitle(r: RoomRow) {
  return r.title || r.name || "Salon privé";
}

function roomDesc(r: RoomRow) {
  return r.description || "Espace privé : présence live + accès direct aux rooms.";
}

function isVipActive(vip_expires_at?: string | null) {
  if (!vip_expires_at) return false;
  const d = new Date(vip_expires_at);
  if (Number.isNaN(d.getTime())) return false;
  return d > new Date();
}

export default function SalonsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [presence, setPresence] = useState<PresenceRow[]>([]);

  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);

  // Cache profils des gens présents
  const [profilesById, setProfilesById] = useState<Record<string, DisplayProfile>>({});

  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function getAuthedUserOrRedirect() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      router.push("/enter");
      return null;
    }
    return user;
  }

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

  async function loadAll() {
    setLoading(true);
    setError("");

    const user = await getAuthedUserOrRedirect();
    if (!user) return;

    const [pRes, roomsRes, presRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, pseudo, credits, vip_expires_at, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("rooms")
        .select("id, slug, name, title, description, is_live, is_vip, members_count, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("room_presence")
        .select("id, room_id, user_id, pseudo, updated_at, joined_at"),
    ]);

    if (pRes.error) setError(pRes.error.message);
    else setMyProfile((pRes.data as any) ?? null);

    if (roomsRes.error) {
      // fallback propre si table rooms vide
      setRooms([
        {
          id: "1",
          title: "Cristal Lounge",
          description: "Salon principal, propre, direct, premium.",
          is_live: true,
          is_vip: false,
        },
        {
          id: "2",
          title: "Velvet Privé",
          description: "Salon filtré, accès VIP.",
          is_live: true,
          is_vip: true,
        },
      ]);
    } else {
      const r = (roomsRes.data ?? []) as RoomRow[];
      setRooms(r.length ? r : [
        {
          id: "1",
          title: "Cristal Lounge",
          description: "Salon principal, propre, direct, premium.",
          is_live: true,
          is_vip: false,
        },
        {
          id: "2",
          title: "Velvet Privé",
          description: "Salon filtré, accès VIP.",
          is_live: true,
          is_vip: true,
        },
      ]);
    }

    if (presRes.error) setError((prev) => prev || presRes.error!.message);
    else setPresence((presRes.data ?? []) as PresenceRow[]);

    // Batch load profiles for online presences
    const online = (presRes.data ?? []).filter((p: any) => isOnline(p.updated_at));
    const ids = Array.from(new Set(online.map((p: any) => p.user_id).filter(Boolean)));
    await ensureProfilesLoaded(ids);

    setLoading(false);
  }

  async function refreshAll() {
    setRefreshing(true);
    setError("");
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime presence updates
  useEffect(() => {
    const channel = supabase
      .channel("salons-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_presence" },
        async () => {
          const { data, error } = await supabase
            .from("room_presence")
            .select("id, room_id, user_id, pseudo, updated_at, joined_at");
          if (error) return;

          const rows = (data ?? []) as PresenceRow[];
          setPresence(rows);

          const online = rows.filter((p) => isOnline(p.updated_at));
          const ids = Array.from(new Set(online.map((p) => p.user_id).filter(Boolean)));
          await ensureProfilesLoaded(ids);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesById]);

  const isAdmin = Boolean(myProfile?.is_admin || myProfile?.role === "admin");
  const vipOk = isVipActive(myProfile?.vip_expires_at) || isAdmin;

  const onlinePresence = useMemo(() => presence.filter((p) => isOnline(p.updated_at)), [presence]);

  const presenceByRoom = useMemo(() => {
    const map = new Map<string, PresenceRow[]>();
    for (const p of onlinePresence) {
      const list = map.get(p.room_id) ?? [];
      list.push(p);
      map.set(p.room_id, list);
    }
    // stable: tri par joined_at
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (a.joined_at || "").localeCompare(b.joined_at || ""));
      map.set(k, list);
    }
    return map;
  }, [onlinePresence]);

  const enrichedRooms = useMemo(() => {
    return rooms.map((r) => ({
      ...r,
      onlineCount: (presenceByRoom.get(r.id) ?? []).length,
      onlineList: (presenceByRoom.get(r.id) ?? []).slice(0, 3), // top 3 names
    }));
  }, [rooms, presenceByRoom]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enrichedRooms;
    return enrichedRooms.filter((r) =>
      (roomTitle(r) + " " + roomDesc(r)).toLowerCase().includes(q)
    );
  }, [enrichedRooms, query]);

  const liveCount = enrichedRooms.filter((r) => Boolean(r.is_live)).length;
  const totalOnline = onlinePresence.length;

  function openRoom(r: RoomRow) {
    if (r.is_vip && !vipOk) {
      setError("Ce salon est réservé aux membres VIP.");
      return;
    }
    router.push(`/salons/${r.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%)]" />
        <div className="relative">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Salons
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                Espaces disponibles
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/62 sm:text-base">
                Pas de webcam ici. Les webcams sont uniquement dans les salles. ✅
              </p>

              {myProfile ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">Toi</div>
                  <div className="mt-2">
                    <ProfileName profile={myProfile} size="md" showTitle />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/70">
                      {myProfile.credits ?? 0} crédits
                    </span>
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-amber-200">
                      {vipOk ? "VIP actif" : "Non VIP"}
                    </span>
                    {isAdmin ? (
                      <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-violet-200">
                        Maître Ether
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <QuickStat label="Salons" value={rooms.length} />
              <QuickStat label="Live" value={liveCount} />
              <QuickStat label="Présents" value={totalOnline} />
              <button
                type="button"
                onClick={refreshAll}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/10 disabled:opacity-60"
              >
                <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search row */}
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un salon..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/10"
            >
              <Shield className="h-4 w-4" />
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => router.push("/boutique")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/10"
            >
              <Crown className="h-4 w-4" />
              Boutique/VIP
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Rooms grid */}
      <section>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[240px] animate-pulse rounded-[28px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <h2 className="text-2xl font-black text-white">Aucun salon</h2>
            <p className="mt-2 text-white/60">Ajuste ta recherche.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((r) => {
              const lockedVip = Boolean(r.is_vip) && !vipOk;

              const list = r.onlineList ?? [];
              const extra = Math.max(0, (r.onlineCount ?? 0) - list.length);

              return (
                <article
                  key={r.id}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cx(
                          "rounded-full px-2.5 py-1 text-[10px] font-black",
                          r.is_live
                            ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border border-white/10 bg-white/10 text-white/60"
                        )}
                      >
                        {r.is_live ? "LIVE" : "OFFLINE"}
                      </span>

                      <span
                        className={cx(
                          "rounded-full px-2.5 py-1 text-[10px] font-black",
                          r.is_vip
                            ? "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
                            : "border border-cyan-400/20 bg-cyan-500/10 text-cyan-300"
                        )}
                      >
                        {r.is_vip ? "VIP" : "STANDARD"}
                      </span>
                    </div>

                    <span className="text-xs text-white/45 inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {r.onlineCount ?? 0}
                    </span>
                  </div>

                  <h2 className="mt-6 text-2xl font-black text-white">{roomTitle(r)}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">{roomDesc(r)}</p>

                  {/* Présents (stylé) */}
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                      Présents
                    </div>

                    {r.onlineCount ? (
                      <div className="mt-3 space-y-2">
                        {list.map((p: PresenceRow) => {
                          const prof = profilesById[p.user_id] || { pseudo: p.pseudo || "Membre" };
                          return (
                            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                              <ProfileName profile={prof} size="sm" showTitle={false} />
                            </div>
                          );
                        })}

                        {extra > 0 ? (
                          <div className="text-xs font-black text-white/50">
                            +{extra} autres…
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-white/55">
                        Personne pour le moment.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openRoom(r)}
                    className={cx(
                      "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-black transition",
                      lockedVip
                        ? "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300/75"
                        : "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
                    )}
                  >
                    {lockedVip ? "Réservé VIP" : "Rejoindre"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
