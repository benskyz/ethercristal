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
  BadgeCheck,
  Bell,
  CreditCard,
  FileSearch,
  FileText,
  Flame,
  LayoutDashboard,
  Lock,
  Megaphone,
  Menu,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  Users,
  Video,
  Wallet,
  Wrench,
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

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type OverviewState = {
  members: number;
  vip: number;
  reports: number;
  liveRooms: number;
  desirSessions: number;
  payments: number;
  revenue: number;
  contentBlocks: number;
  settings: number;
  verifications: number;
};

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

function moneyFormat(amount: number, currency = "CAD") {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
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

async function safeRevenueFromTable(
  table: string,
  amountField: string
): Promise<{ total: number; count: number }> {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase.from(table).select(`id, ${amountField}`).limit(1000);

  if (res.error) {
    if (isSchemaMismatch(res.error)) return { total: 0, count: 0 };
    throw res.error;
  }

  const rows = (res.data ?? []) as Array<Record<string, any>>;
  const total = rows.reduce((sum, row) => sum + Number(row?.[amountField] ?? 0), 0);

  return {
    total,
    count: rows.length,
  };
}

async function countVipProfiles(): Promise<number> {
  const snake = await safeCount("profiles", (q) => q.eq("is_vip", true)).catch(
    () => 0
  );
  if (snake > 0) return snake;

  return safeCount("profiles", (q) => q.eq("isPremium", true)).catch(() => 0);
}

async function countLiveRooms(): Promise<number> {
  const snake = await safeCount("rooms", (q) => q.eq("is_live", true)).catch(
    () => 0
  );
  if (snake > 0) return snake;

  return safeCount("rooms", (q) => q.eq("isLive", true)).catch(() => 0);
}

async function countAllReports(): Promise<number> {
  const a = await safeCount("reports").catch(() => 0);
  const b = await safeCount("desir_session_reports").catch(() => 0);
  return a + b;
}

async function countSettingsCompat(): Promise<number> {
  const a = await safeCount("site_settings").catch(() => 0);
  if (a > 0) return a;
  return safeCount("app_settings").catch(() => 0);
}

async function countContentCompat(): Promise<number> {
  const a = await safeCount("content_blocks").catch(() => 0);
  if (a > 0) return a;
  return safeCount("site_content").catch(() => 0);
}

async function countVerificationCompat(): Promise<number> {
  const a = await safeCount("verification_requests").catch(() => 0);
  const b = await safeCount("profile_verifications").catch(() => 0);
  return a + b;
}

async function revenueCompat(): Promise<{ total: number; count: number }> {
  const payments = await safeRevenueFromTable("payments", "amount").catch(() => ({
    total: 0,
    count: 0,
  }));
  if (payments.count > 0 || payments.total > 0) return payments;

  return safeRevenueFromTable("transactions", "amount").catch(() => ({
    total: 0,
    count: 0,
  }));
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

function StatCard({
  label,
  value,
  icon,
  tone = "default",
  sub,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
  sub?: string;
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
      {sub ? <div className="mt-2 text-xs text-white/42">{sub}</div> : null}
    </div>
  );
}

function MenuCard({
  title,
  desc,
  icon,
  href,
  tone = "default",
  router,
}: {
  title: string;
  desc: string;
  icon: ReactNode;
  href: string;
  tone?: "default" | "red" | "green" | "gold" | "violet";
  router: ReturnType<typeof useRouter>;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/14 bg-red-950/10 hover:bg-red-900/16"
      : tone === "green"
      ? "border-emerald-500/14 bg-emerald-950/10 hover:bg-emerald-900/16"
      : tone === "gold"
      ? "border-amber-500/14 bg-amber-950/10 hover:bg-amber-900/16"
      : tone === "violet"
      ? "border-fuchsia-500/14 bg-fuchsia-950/10 hover:bg-fuchsia-900/16"
      : "border-white/10 bg-black/20 hover:bg-black/30";

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={cx(
        "rounded-[24px] border p-5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1",
        toneClass
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white/75">
          {icon}
        </div>
        <div className="text-sm font-black uppercase tracking-[0.16em] text-white">
          {title}
        </div>
      </div>

      <div className="text-sm leading-6 text-white/58">{desc}</div>
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [overview, setOverview] = useState<OverviewState>({
    members: 0,
    vip: 0,
    reports: 0,
    liveRooms: 0,
    desirSessions: 0,
    payments: 0,
    revenue: 0,
    contentBlocks: 0,
    settings: 0,
    verifications: 0,
  });

  const vipRate = useMemo(() => {
    if (!overview.members) return 0;
    return Math.round((overview.vip / overview.members) * 100);
  }, [overview.members, overview.vip]);

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

        const [
          members,
          vip,
          reports,
          liveRooms,
          desirSessions,
          revenueInfo,
          contentBlocks,
          settings,
          verifications,
        ] = await Promise.all([
          safeCount("profiles").catch(() => 0),
          countVipProfiles(),
          countAllReports(),
          countLiveRooms(),
          safeCount("desir_sessions", (q) => q.eq("status", "active")).catch(
            () => 0
          ),
          revenueCompat(),
          countContentCompat(),
          countSettingsCompat(),
          countVerificationCompat(),
        ]);

        setAdminProfile(nextAdmin);
        setOverview({
          members,
          vip,
          reports,
          liveRooms,
          desirSessions,
          payments: revenueInfo.count,
          revenue: revenueInfo.total,
          contentBlocks,
          settings,
          verifications,
        });
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger le hub admin.",
        });
        console.error("Admin page error:", e);
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

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,40,200,0.08),transparent_24%),linear-gradient(180deg,#040405_0%,#07070a_100%)]" />
        <div className="relative w-full max-w-md rounded-[32px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>

          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            Admin Hub
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
                    Centre de contrôle
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Admin
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Membres <span className="font-black text-white">{overview.members}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      VIP <span className="font-black text-white">{vipRate}%</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Revenu{" "}
                      <span className="font-black text-white">
                        {moneyFormat(overview.revenue)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="red">
                      <Shield className="h-3.5 w-3.5" />
                      contrôle total
                    </Tag>
                    <Tag tone="violet">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      hub admin
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
                    onClick={() => router.push("/dashboard")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Retour site
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Membres"
                value={overview.members}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="VIP"
                value={overview.vip}
                icon={<Sparkles className="h-4 w-4" />}
                tone="gold"
                sub={`${vipRate}% du total`}
              />
              <StatCard
                label="Reports"
                value={overview.reports}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Salons live"
                value={overview.liveRooms}
                icon={<Video className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Sessions Désir"
                value={overview.desirSessions}
                icon={<Flame className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Paiements"
                value={overview.payments}
                icon={<CreditCard className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Revenu"
                value={moneyFormat(overview.revenue)}
                icon={<Wallet className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Contenu"
                value={overview.contentBlocks}
                icon={<FileText className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Settings"
                value={overview.settings}
                icon={<Settings2 className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Vérifications"
                value={overview.verifications}
                icon={<BadgeCheck className="h-4 w-4" />}
                tone="green"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              <MenuCard
                title="Membres"
                desc="Lister, retrouver et contrôler les comptes."
                icon={<Users className="h-5 w-5" />}
                href="/admin/members"
                tone="default"
                router={router}
              />
              <MenuCard
                title="Modération"
                desc="Reports, sanctions, suivi des incidents."
                icon={<Shield className="h-5 w-5" />}
                href="/admin/moderation"
                tone="red"
                router={router}
              />
              <MenuCard
                title="Sécurité"
                desc="Bans, risques, incidents et contrôle sensible."
                icon={<Wrench className="h-5 w-5" />}
                href="/admin/security"
                tone="red"
                router={router}
              />
              <MenuCard
                title="Rapports"
                desc="Vue business globale, chiffres et synthèse."
                icon={<Activity className="h-5 w-5" />}
                href="/admin/reports"
                tone="gold"
                router={router}
              />

              <MenuCard
                title="Paiements"
                desc="Transactions, statuts, remboursements, revenus."
                icon={<CreditCard className="h-5 w-5" />}
                href="/admin/payments"
                tone="gold"
                router={router}
              />
              <MenuCard
                title="Abonnements"
                desc="Plans VIP, prix, durée, activation."
                icon={<Sparkles className="h-5 w-5" />}
                href="/admin/subscriptions"
                tone="violet"
                router={router}
              />
              <MenuCard
                title="Contenu"
                desc="Blocs éditoriaux, homepage, textes du site."
                icon={<FileText className="h-5 w-5" />}
                href="/admin/content"
                tone="green"
                router={router}
              />
              <MenuCard
                title="Annonces"
                desc="Messages système, bannières, communication."
                icon={<Bell className="h-5 w-5" />}
                href="/admin/announcements"
                tone="violet"
                router={router}
              />

              <MenuCard
                title="Live"
                desc="Monitoring salons live et trafic instantané."
                icon={<Video className="h-5 w-5" />}
                href="/admin/live"
                tone="red"
                router={router}
              />
              <MenuCard
                title="Désir"
                desc="Cam-to-cam aléatoire, sessions et matching."
                icon={<Flame className="h-5 w-5" />}
                href="/admin/desir"
                tone="red"
                router={router}
              />
              <MenuCard
                title="Vérification"
                desc="Demandes pending, validation et contrôle."
                icon={<BadgeCheck className="h-5 w-5" />}
                href="/admin/verification"
                tone="green"
                router={router}
              />
              <MenuCard
                title="Audit"
                desc="Logs admin, historique et traçabilité."
                icon={<FileSearch className="h-5 w-5" />}
                href="/admin/audit"
                tone="default"
                router={router}
              />

              <MenuCard
                title="Settings"
                desc="Configuration globale du site et options."
                icon={<Settings2 className="h-5 w-5" />}
                href="/admin/settings"
                tone="violet"
                router={router}
              />
              <MenuCard
                title="System"
                desc="Lecture santé, tables, maintenance."
                icon={<Wrench className="h-5 w-5" />}
                href="/admin/system"
                tone="default"
                router={router}
              />
              <MenuCard
                title="Salons"
                desc="Gestion rooms, live, présence et salons."
                icon={<Video className="h-5 w-5" />}
                href="/admin/salons"
                tone="violet"
                router={router}
              />
              <MenuCard
                title="Retour dashboard"
                desc="Revenir au dashboard utilisateur normal."
                icon={<LayoutDashboard className="h-5 w-5" />}
                href="/dashboard"
                tone="default"
                router={router}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
