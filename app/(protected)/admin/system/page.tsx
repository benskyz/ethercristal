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
  Bell,
  Database,
  Flame,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  RefreshCw,
  Server,
  Settings2,
  Shield,
  Sparkles,
  Users,
  Video,
  Wallet,
  Wand2,
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

type SystemMetric = {
  label: string;
  count: number;
  exists: boolean;
};

type SystemState = {
  profiles: SystemMetric;
  rooms: SystemMetric;
  liveRooms: SystemMetric;
  inventory: SystemMetric;
  notifications: SystemMetric;
  payments: SystemMetric;
  reports: SystemMetric;
  sessions: SystemMetric;
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
): Promise<SystemMetric> {
  const supabase = requireSupabaseBrowserClient();

  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (build) query = build(query);

  const res = await query;

  if (res.error) {
    if (isSchemaMismatch(res.error)) {
      return { label: table, count: 0, exists: false };
    }
    throw res.error;
  }

  return {
    label: table,
    count: res.count ?? 0,
    exists: true,
  };
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
  missing = false,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
  missing?: boolean;
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
        {value}
      </div>
      <div className="mt-2 text-xs text-white/40">
        {missing ? "table absente" : "ok"}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  icon,
  onClick,
  tone = "default",
}: {
  title: string;
  desc: string;
  icon: ReactNode;
  onClick: () => void;
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
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[22px] border p-5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1",
        toneClass
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/70">
          {icon}
        </div>
        <div className="text-sm font-black uppercase tracking-[0.14em] text-white">
          {title}
        </div>
      </div>
      <div className="text-sm leading-6 text-white/58">{desc}</div>
    </button>
  );
}

export default function AdminSystemPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [systemState, setSystemState] = useState<SystemState>({
    profiles: { label: "profiles", count: 0, exists: false },
    rooms: { label: "rooms", count: 0, exists: false },
    liveRooms: { label: "rooms_live", count: 0, exists: false },
    inventory: { label: "inventory_items", count: 0, exists: false },
    notifications: { label: "notifications", count: 0, exists: false },
    payments: { label: "payments", count: 0, exists: false },
    reports: { label: "reports", count: 0, exists: false },
    sessions: { label: "desir_sessions", count: 0, exists: false },
  });

  const healthyCount = useMemo(() => {
    return Object.values(systemState).filter((entry) => entry.exists).length;
  }, [systemState]);

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
          profiles,
          rooms,
          liveRooms,
          inventory,
          notifications,
          payments,
          reportsA,
          reportsB,
          sessions,
        ] = await Promise.all([
          safeCount("profiles"),
          safeCount("rooms"),
          safeCount("rooms", (q) => q.eq("is_live", true)).catch(() => ({
            label: "rooms_live",
            count: 0,
            exists: false,
          })),
          safeCount("inventory_items"),
          safeCount("notifications"),
          safeCount("payments").catch(async () => safeCount("transactions")),
          safeCount("reports"),
          safeCount("desir_session_reports"),
          safeCount("desir_sessions"),
        ]);

        setAdminProfile(nextAdmin);
        setSystemState({
          profiles,
          rooms,
          liveRooms: {
            label: "rooms_live",
            count: liveRooms.count,
            exists: liveRooms.exists,
          },
          inventory,
          notifications,
          payments,
          reports: {
            label: "reports_total",
            count: (reportsA.count || 0) + (reportsB.count || 0),
            exists: reportsA.exists || reportsB.exists,
          },
          sessions,
        });
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger le système.",
        });
        console.error("Admin system error:", e);
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
            Admin System
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
                    Santé & maintenance
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Système
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Modules détectés{" "}
                      <span className="font-black text-white">{healthyCount}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      État <span className="font-black text-white">{healthyCount >= 5 ? "stable" : "à vérifier"}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="green">
                      <Server className="h-3.5 w-3.5" />
                      monitoring
                    </Tag>
                    <Tag tone="violet">
                      <Database className="h-3.5 w-3.5" />
                      tables
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
                    Relancer check
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Retour admin
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Profiles"
                value={systemState.profiles.count}
                icon={<Users className="h-4 w-4" />}
                missing={!systemState.profiles.exists}
              />
              <StatCard
                label="Rooms"
                value={systemState.rooms.count}
                icon={<Video className="h-4 w-4" />}
                tone="violet"
                missing={!systemState.rooms.exists}
              />
              <StatCard
                label="Rooms live"
                value={systemState.liveRooms.count}
                icon={<Flame className="h-4 w-4" />}
                tone="red"
                missing={!systemState.liveRooms.exists}
              />
              <StatCard
                label="Inventory"
                value={systemState.inventory.count}
                icon={<Wand2 className="h-4 w-4" />}
                tone="gold"
                missing={!systemState.inventory.exists}
              />
              <StatCard
                label="Notifications"
                value={systemState.notifications.count}
                icon={<Bell className="h-4 w-4" />}
                tone="violet"
                missing={!systemState.notifications.exists}
              />
              <StatCard
                label="Payments"
                value={systemState.payments.count}
                icon={<Wallet className="h-4 w-4" />}
                tone="gold"
                missing={!systemState.payments.exists}
              />
              <StatCard
                label="Reports"
                value={systemState.reports.count}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="red"
                missing={!systemState.reports.exists}
              />
              <StatCard
                label="Desir sessions"
                value={systemState.sessions.count}
                icon={<Activity className="h-4 w-4" />}
                tone="green"
                missing={!systemState.sessions.exists}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title="Outils système" right={<Tag tone="green">actions</Tag>}>
                <div className="grid gap-4 md:grid-cols-2">
                  <ActionCard
                    title="Modération"
                    desc="Aller aux reports ouverts et incidents membres."
                    icon={<Shield className="h-4 w-4" />}
                    onClick={() => router.push("/admin/moderation")}
                    tone="red"
                  />

                  <ActionCard
                    title="Paiements"
                    desc="Vérifier les transactions, remboursements et anomalies."
                    icon={<Wallet className="h-4 w-4" />}
                    onClick={() => router.push("/admin/payments")}
                    tone="gold"
                  />

                  <ActionCard
                    title="Salons"
                    desc="Contrôler l’état live, les rooms et la présence."
                    icon={<Video className="h-4 w-4" />}
                    onClick={() => router.push("/admin/salons")}
                    tone="violet"
                  />

                  <ActionCard
                    title="Boutique"
                    desc="Vérifier le catalogue, les items actifs et le pricing."
                    icon={<Sparkles className="h-4 w-4" />}
                    onClick={() => router.push("/admin/shop")}
                    tone="violet"
                  />

                  <ActionCard
                    title="Membres"
                    desc="Revenir à la liste membres et aux rôles."
                    icon={<Users className="h-4 w-4" />}
                    onClick={() => router.push("/admin/members")}
                  />

                  <ActionCard
                    title="Dashboard"
                    desc="Retour au tableau de bord principal du site."
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    onClick={() => router.push("/dashboard")}
                  />
                </div>
              </Panel>

              <Panel title="Résumé technique" right={<Tag>lecture</Tag>}>
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                      <Database className="h-4 w-4 text-white/60" />
                      Base détectée
                    </div>
                    <div className="text-sm leading-6 text-white/58">
                      {healthyCount >= 5
                        ? "Les tables principales répondent correctement. Le socle du site est présent."
                        : "Certaines tables manquent ou ne répondent pas. Il faut finir la structure SQL ou adapter les pages concernées."}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                      <HardDrive className="h-4 w-4 text-white/60" />
                      Maintenance
                    </div>
                    <div className="text-sm leading-6 text-white/58">
                      Cette page sert à lire l’état réel du projet, pas à lancer des actions destructrices à l’aveugle.
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                      <LifeBuoy className="h-4 w-4 text-white/60" />
                      Conseil
                    </div>
                    <div className="text-sm leading-6 text-white/58">
                      Dès qu’un module est marqué absent, corrige d’abord la table SQL avant de patcher encore le front.
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
                      <Settings2 className="h-4 w-4 text-white/60" />
                      Accès
                    </div>
                    <div className="text-sm leading-6 text-white/58">
                      Profil actuel : <span className="font-black text-white">{adminProfile.pseudo}</span> • rôle{" "}
                      <span className="font-black text-white">{adminProfile.role.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
