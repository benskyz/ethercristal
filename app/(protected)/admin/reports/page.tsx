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
  AlertTriangle,
  Check,
  Eye,
  Flame,
  Menu,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  StopCircle,
  Users,
  Video,
  X,
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

type DesirSessionRow = {
  id: string;
  status: string;
  userAId: string | null;
  userBId: string | null;
  startedAt: string | null;
  createdAt: string | null;
};

type DesirReportRow = {
  id: string;
  reporterId: string | null;
  reportedUserId: string | null;
  reason: string;
  status: string;
  createdAt: string | null;
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type SessionFilter = "all" | "active" | "matched" | "ended";

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

function normalizeSession(row: any): DesirSessionRow {
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
    startedAt: row?.started_at || null,
    createdAt: row?.created_at || null,
  };
}

function normalizeReport(row: any): DesirReportRow {
  return {
    id: String(row?.id ?? crypto.randomUUID()),
    reporterId: row?.reporter_id ? String(row.reporter_id) : null,
    reportedUserId: row?.reported_user_id
      ? String(row.reported_user_id)
      : row?.target_user_id
      ? String(row.target_user_id)
      : null,
    reason: sanitizeText(row?.reason, "Sans motif"),
    status: sanitizeText(row?.status, "open").toLowerCase(),
    createdAt: row?.created_at || null,
  };
}

async function loadDesirSessionsCompat(): Promise<DesirSessionRow[]> {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase.from("desir_sessions").select("*").limit(300);

  if (res.error) {
    if (isSchemaMismatch(res.error)) return [];
    throw res.error;
  }

  return ((res.data ?? []) as any[])
    .map(normalizeSession)
    .sort((a, b) => {
      const da = new Date(a.startedAt || a.createdAt || 0).getTime();
      const db = new Date(b.startedAt || b.createdAt || 0).getTime();
      return db - da;
    });
}

async function loadDesirReportsCompat(): Promise<DesirReportRow[]> {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase
    .from("desir_session_reports")
    .select("*")
    .limit(300);

  if (res.error) {
    if (isSchemaMismatch(res.error)) return [];
    throw res.error;
  }

  return ((res.data ?? []) as any[])
    .map(normalizeReport)
    .sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });
}

async function updateSessionStatus(
  sessionId: string,
  nextStatus: "ended" | "active"
) {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase
    .from("desir_sessions")
    .update({ status: nextStatus })
    .eq("id", sessionId);

  if (res.error) throw res.error;
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

export default function AdminDesirPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [sessions, setSessions] = useState<DesirSessionRow[]>([]);
  const [reports, setReports] = useState<DesirReportRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (filter !== "all" && session.status !== filter) return false;

      if (!q) return true;

      return (
        session.id.toLowerCase().includes(q) ||
        (session.userAId || "").toLowerCase().includes(q) ||
        (session.userBId || "").toLowerCase().includes(q) ||
        session.status.toLowerCase().includes(q)
      );
    });
  }, [sessions, search, filter]);

  const activeCount = useMemo(
    () =>
      sessions.filter(
        (session) => session.status === "active" || session.status === "matched"
      ).length,
    [sessions]
  );

  const endedCount = useMemo(
    () => sessions.filter((session) => session.status === "ended").length,
    [sessions]
  );

  const openReportsCount = useMemo(
    () => reports.filter((report) => report.status === "open").length,
    [reports]
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

        const [nextSessions, nextReports] = await Promise.all([
          loadDesirSessionsCompat(),
          loadDesirReportsCompat(),
        ]);

        setAdminProfile(nextAdmin);
        setSessions(nextSessions);
        setReports(nextReports);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger le module Désir.",
        });
        console.error("Admin desir error:", e);
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

  async function handleEndSession(sessionId: string) {
    try {
      setBusyId(sessionId);
      await updateSessionStatus(sessionId, "ended");

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: "ended" } : session
        )
      );

      setFlash({
        tone: "success",
        text: "Session arrêtée.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’arrêter cette session.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,40,200,0.08),transparent_24%),linear-gradient(180deg,#040405_0%,#07070a_100%)]" />
        <div className="relative w-full max-w-md rounded-[32px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>

          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            Admin Desir
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
                    Matching & sessions
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Désir
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Sessions <span className="font-black text-white">{sessions.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Reports ouverts <span className="font-black text-white">{openReportsCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="red">
                      <Flame className="h-3.5 w-3.5" />
                      cam-to-cam
                    </Tag>
                    <Tag tone="violet">
                      <Video className="h-3.5 w-3.5" />
                      sessions live
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
                    onClick={() => router.push("/desir")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                  >
                    <Eye className="h-4 w-4" />
                    Voir le module
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Sessions actives"
                value={activeCount}
                icon={<Flame className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Sessions terminées"
                value={endedCount}
                icon={<Check className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Reports ouverts"
                value={openReportsCount}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Module"
                value="surveillé"
                icon={<Sparkles className="h-4 w-4" />}
                tone="violet"
              />
            </div>

            <Panel title="Recherche & filtres" right={<Tag tone="gold">filtre</Tag>}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Session ID, user ID, statut..."
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "all", label: "Toutes" },
                    { key: "active", label: "Actives" },
                    { key: "matched", label: "Matched" },
                    { key: "ended", label: "Terminées" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key as SessionFilter)}
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        filter === item.key
                          ? "border-red-400/18 bg-red-500/10 text-red-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
              <Panel title="Sessions Désir" right={<Tag>{filteredSessions.length} affichées</Tag>}>
                {filteredSessions.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucune session trouvée avec ce filtre.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredSessions.map((session) => {
                      const busy = busyId === session.id;
                      const statusTone =
                        session.status === "ended"
                          ? "green"
                          : session.status === "matched"
                          ? "violet"
                          : "red";

                      return (
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
                                <Tag tone={statusTone}>{session.status}</Tag>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                              {session.startedAt || session.createdAt
                                ? new Date(
                                    session.startedAt || session.createdAt || ""
                                  ).toLocaleString()
                                : "Inconnu"}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                              <Shield className="h-4 w-4" />
                              Modération
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/admin/members?search=${encodeURIComponent(
                                    session.userAId || ""
                                  )}`
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                            >
                              <Users className="h-4 w-4" />
                              Voir membre
                            </button>

                            <button
                              type="button"
                              disabled={busy || session.status === "ended"}
                              onClick={() => void handleEndSession(session.id)}
                              className={cx(
                                "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                                session.status === "ended"
                                  ? "border-white/10 bg-white/[0.04] text-white/50"
                                  : "border-red-400/18 bg-red-500/10 text-red-100"
                              )}
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <StopCircle className="h-4 w-4" />
                              )}
                              Stop session
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel title="Reports récents" right={<Tag tone="red">{reports.length} total</Tag>}>
                {reports.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun report Désir trouvé.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {reports.slice(0, 8).map((report) => {
                      const tone =
                        report.status === "open"
                          ? "red"
                          : report.status === "resolved"
                          ? "green"
                          : "violet";

                      return (
                        <div
                          key={report.id}
                          className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-black tracking-[-0.02em] text-white">
                                {report.reason}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Tag tone={tone}>{report.status}</Tag>
                              </div>

                              <div className="mt-3 text-sm leading-6 text-white/58">
                                Reporteur :{" "}
                                <span className="font-black text-white">
                                  {report.reporterId || "Inconnu"}
                                </span>
                              </div>

                              <div className="text-sm leading-6 text-white/58">
                                Cible :{" "}
                                <span className="font-black text-white">
                                  {report.reportedUserId || "Inconnue"}
                                </span>
                              </div>

                              <div className="mt-2 text-sm text-white/50">
                                {report.createdAt
                                  ? new Date(report.createdAt).toLocaleString()
                                  : "Date inconnue"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/admin/moderation?member=${encodeURIComponent(
                                    report.reportedUserId || ""
                                  )}`
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/12 bg-red-950/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-900/16"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Ouvrir modération
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push("/admin/moderation")}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                            >
                              <Eye className="h-4 w-4" />
                              Voir tous les reports
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
