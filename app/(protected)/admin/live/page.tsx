"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  Activity,
  AlertTriangle,
  Crown,
  Eye,
  Flame,
  Menu,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

type AdminProfile = {
  id: string;
  pseudo: string;
  credits: number;
  isVip: boolean;
  isAdmin: boolean;
  vipExpiresAt: string | null;
  role: string;
  masterTitle: string;
};

type LiveRoomRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isLive: boolean;
  isVip: boolean;
  membersCount: number;
};

type ActiveSessionRow = {
  id: string;
  status: string;
  userAId: string | null;
  userBId: string | null;
  startedAt: string | null;
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

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function isSchemaMismatch(error: any) {
  const code = error?.code;
  return code === "42703" || code === "42P01";
}

async function loadAdminProfileCompat(userId: string): Promise<AdminProfile | null> {
  const supabase = requireSupabaseBrowserClient();

  const snake = await supabase
    .from("profiles")
    .select(
      "id, pseudo, credits, is_vip, is_admin, vip_expires_at, role, master_title"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!snake.error && snake.data) {
    return {
      id: snake.data.id,
      pseudo: sanitizeText(snake.data.pseudo, "Membre Ether"),
      credits: Number(snake.data.credits ?? 0),
      isVip: Boolean(snake.data.is_vip),
      isAdmin: Boolean(snake.data.is_admin),
      vipExpiresAt: snake.data.vip_expires_at ?? null,
      role: sanitizeText(snake.data.role, "member"),
      masterTitle: sanitizeText(snake.data.master_title, "Aucun titre"),
    };
  }

  if (snake.error && !isSchemaMismatch(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase
    .from("profiles")
    .select(
      'id, username, "etherBalance", "isPremium", "isAdmin", "premiumExpiresAt", role, "masterTitle"'
    )
    .eq("id", userId)
    .maybeSingle();

  if (!camel.error && camel.data) {
    return {
      id: camel.data.id,
      pseudo: sanitizeText(camel.data.username, "Membre Ether"),
      credits: Number(camel.data.etherBalance ?? 0),
      isVip: Boolean(camel.data.isPremium),
      isAdmin: Boolean(camel.data.isAdmin),
      vipExpiresAt: camel.data.premiumExpiresAt ?? null,
      role: sanitizeText(camel.data.role, "member"),
      masterTitle: sanitizeText(camel.data.masterTitle, "Aucun titre"),
    };
  }

  if (camel.error && !isSchemaMismatch(camel.error)) {
    throw camel.error;
  }

  return null;
}

function normalizeRoom(row: any): LiveRoomRow {
  return {
    id: String(row?.id ?? crypto.randomUUID()),
    slug: sanitizeText(row?.slug, ""),
    name: sanitizeText(row?.name || row?.title || row?.room_name, "Salon"),
    description: sanitizeText(row?.description, ""),
    isLive: Boolean(row?.is_live ?? row?.isLive ?? row?.live ?? false),
    isVip: Boolean(row?.is_vip ?? row?.isVip ?? false),
    membersCount: Number(
      row?.members_count ?? row?.membersCount ?? row?.viewer_count ?? 0
    ),
  };
}

function normalizeSession(row: any): ActiveSessionRow {
  return {
    id: String(row?.id ?? crypto.randomUUID()),
    status: sanitizeText(row?.status, "active").toLowerCase(),
    userAId: row?.user_a_id
      ? String(row.user_a_id)
      : row?.user1_id
      ? String(row.user1_id)
      : row?.left_user_id
      ? String(row.left_user_id)
      : row?.caller_id
      ? String(row.caller_id)
      : row?.user_id
      ? String(row.user_id)
      : null,
    userBId: row?.user_b_id
      ? String(row.user_b_id)
      : row?.user2_id
      ? String(row.user2_id)
      : row?.right_user_id
      ? String(row.right_user_id)
      : row?.partner_id
      ? String(row.partner_id)
      : row?.match_user_id
      ? String(row.match_user_id)
      : null,
    startedAt: row?.started_at || row?.created_at || null,
  };
}

async function loadLiveRoomsCompat(): Promise<LiveRoomRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const res = await supabase.from("rooms").select("*").limit(300);

  if (res.error) {
    if (isSchemaMismatch(res.error)) return [];
    throw res.error;
  }

  return ((res.data ?? []) as any[])
    .map(normalizeRoom)
    .filter((room) => room.isLive)
    .sort((a, b) => b.membersCount - a.membersCount);
}

async function loadActiveSessionsCompat(): Promise<ActiveSessionRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const res = await supabase.from("desir_sessions").select("*").limit(300);

  if (res.error) {
    if (isSchemaMismatch(res.error)) return [];
    throw res.error;
  }

  return ((res.data ?? []) as any[])
    .map(normalizeSession)
    .filter((session) => session.status === "active" || session.status === "matched")
    .sort((a, b) => {
      const da = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const db = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return db - da;
    });
}

async function safeCount(
  table: string,
  build?: (query: any) => any
): Promise<number> {
  const supabase = requireSupabaseBrowserClient();

  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (build) query = build(query);

  const res = await query;

  if (res.error) {
    if (isSchemaMismatch(res.error)) return 0;
    throw res.error;
  }

  return res.count ?? 0;
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
    <section className="relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
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

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/14 bg-red-950/10"
      : tone === "green"
      ? "border-emerald-500/14 bg-emerald-950/10"
      : tone === "gold"
      ? "border-amber-500/14 bg-amber-950/10"
      : tone === "violet"
      ? "border-fuchsia-500/14 bg-fuchsia-950/10"
      : "border-white/10 bg-black/20";

  return (
    <div
      className={cx(
        "rounded-[22px] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]",
        toneClass
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

export default function AdminLivePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [rooms, setRooms] = useState<LiveRoomRow[]>([]);
  const [sessions, setSessions] = useState<ActiveSessionRow[]>([]);
  const [search, setSearch] = useState("");

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;

    return rooms.filter((room) => {
      return (
        room.name.toLowerCase().includes(q) ||
        room.slug.toLowerCase().includes(q) ||
        room.description.toLowerCase().includes(q)
      );
    });
  }, [rooms, search]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;

    return sessions.filter((session) => {
      return (
        session.id.toLowerCase().includes(q) ||
        (session.userAId || "").toLowerCase().includes(q) ||
        (session.userBId || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, search]);

  const totalRoomMembers = useMemo(
    () => rooms.reduce((sum, room) => sum + room.membersCount, 0),
    [rooms]
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

        const nextAdmin = await loadAdminProfileCompat(user.id);

        if (!nextAdmin || !nextAdmin.isAdmin) {
          router.replace("/dashboard");
          return;
        }

        const [liveRooms, activeSessions] = await Promise.all([
          loadLiveRoomsCompat(),
          loadActiveSessionsCompat(),
        ]);

        setAdminProfile(nextAdmin);
        setRooms(liveRooms);
        setSessions(activeSessions);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger le monitoring live.",
        });
        console.error("Admin live error:", e);
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

  const reportsOpenCount = useMemo(async () => {
    return 0;
  }, []);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,40,200,0.08),transparent_24%),linear-gradient(180deg,#040405_0%,#07070a_100%)]" />
        <div className="relative w-full max-w-md rounded-[32px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>

          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            Admin Live
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="w-full max-w-md rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-8 text-center">
          <div className="text-lg font-black text-white">Accès admin refusé</div>
          <div className="mt-2 text-sm text-white/56">
            Recharge la page ou reconnecte-toi.
          </div>
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
          <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
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
                    Surveillance temps réel
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Live
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Salons live <span className="font-black text-white">{rooms.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Sessions Désir <span className="font-black text-white">{sessions.length}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="red">
                      <Flame className="h-3.5 w-3.5" />
                      live monitoring
                    </Tag>
                    <Tag tone="violet">
                      <Video className="h-3.5 w-3.5" />
                      salons webcam
                    </Tag>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void loadPage(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
                  >
                    <Shield className="h-4 w-4" />
                    Retour admin
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Salons live"
                value={rooms.length}
                icon={<Video className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Membres visibles"
                value={totalRoomMembers}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="Sessions Désir"
                value={sessions.length}
                icon={<Flame className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Monitoring"
                value="actif"
                icon={<Activity className="h-4 w-4" />}
                tone="green"
              />
            </div>

            <Panel title="Recherche" right={<Tag tone="gold">filtre</Tag>}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Salon, slug, description, user ID, session ID..."
                  className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                />
              </div>
            </Panel>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel title="Salons live" right={<Tag>{filteredRooms.length} actifs</Tag>}>
                {filteredRooms.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun salon live pour le moment.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredRooms.map((room) => (
                      <div
                        key={room.id}
                        className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-black tracking-[-0.02em] text-white">
                              {room.name}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Tag tone="red">
                                <Flame className="h-3.5 w-3.5" />
                                live
                              </Tag>

                              {room.isVip ? (
                                <Tag tone="gold">
                                  <Crown className="h-3.5 w-3.5" />
                                  vip
                                </Tag>
                              ) : null}

                              <Tag tone="violet">{room.slug || "sans-slug"}</Tag>
                            </div>

                            <div className="mt-3 text-sm leading-6 text-white/58">
                              {room.description || "Aucune description."}
                            </div>

                            <div className="mt-3 text-sm text-white/58">
                              Membres présents :{" "}
                              <span className="font-black text-white">
                                {room.membersCount}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => router.push(`/salons/${room.id}`)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/salons`)}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                          >
                            <Sparkles className="h-4 w-4" />
                            Gérer salons
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/members?room=${encodeURIComponent(room.id)}`)
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/12 bg-red-950/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-900/16"
                          >
                            <Users className="h-4 w-4" />
                            Voir membres
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Sessions Désir actives" right={<Tag tone="red">{filteredSessions.length} actives</Tag>}>
                {filteredSessions.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucune session active pour le moment.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-black tracking-[-0.02em] text-white">
                              Session {session.id}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Tag tone="red">
                                <Flame className="h-3.5 w-3.5" />
                                {session.status}
                              </Tag>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                                  User A
                                </div>
                                <div className="mt-2 break-all text-sm text-white/68">
                                  {session.userAId || "Inconnu"}
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                                  User B
                                </div>
                                <div className="mt-2 break-all text-sm text-white/68">
                                  {session.userBId || "Inconnu"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 text-sm text-white/58">
                              Début :{" "}
                              <span className="font-black text-white">
                                {session.startedAt
                                  ? new Date(session.startedAt).toLocaleString()
                                  : "Inconnu"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/admin/moderation?member=${encodeURIComponent(
                                  session.userAId || session.userBId || ""
                                )}`
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/12 bg-red-950/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-900/16"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Modération
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push("/desir")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                          >
                            <Flame className="h-4 w-4" />
                            Voir module Désir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
