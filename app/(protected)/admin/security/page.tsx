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
  Clock3,
  Eye,
  FileSearch,
  Menu,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCog,
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

type AuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  status: string;
  details: string;
  createdAt: string | null;
  sourceTable: "audit_logs" | "admin_audit_logs" | "activity_logs";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "success" | "warning" | "error";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function safeStringify(value: unknown) {
  try {
    if (typeof value === "string") return value;
    if (value == null) return "";
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeStatus(value: unknown) {
  const raw = safeStringify(value).toLowerCase().trim();

  if (
    ["ok", "success", "succeeded", "done", "completed", "approved"].includes(raw)
  ) {
    return "success";
  }

  if (
    ["warning", "warn", "pending", "reviewed", "soft_fail"].includes(raw)
  ) {
    return "warning";
  }

  if (
    ["error", "failed", "denied", "rejected", "blocked", "fatal"].includes(raw)
  ) {
    return "error";
  }

  return raw || "success";
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

function normalizeAuditRow(
  row: any,
  sourceTable: "audit_logs" | "admin_audit_logs" | "activity_logs"
): AuditRow {
  return {
    id: String(row?.id ?? crypto.randomUUID()),
    actorId: row?.actor_id
      ? String(row.actor_id)
      : row?.admin_id
      ? String(row.admin_id)
      : row?.user_id
      ? String(row.user_id)
      : row?.member_id
      ? String(row.member_id)
      : null,
    action: sanitizeText(
      row?.action || row?.action_type || row?.event || row?.type,
      "unknown_action"
    ).toLowerCase(),
    targetType: sanitizeText(
      row?.target_type || row?.resource_type || row?.entity_type || row?.scope,
      "system"
    ).toLowerCase(),
    targetId: row?.target_id
      ? String(row.target_id)
      : row?.entity_id
      ? String(row.entity_id)
      : row?.resource_id
      ? String(row.resource_id)
      : row?.subject_id
      ? String(row.subject_id)
      : null,
    status: normalizeStatus(
      row?.status || row?.result || row?.outcome || row?.level || "success"
    ),
    details: sanitizeText(
      row?.details ||
        row?.message ||
        row?.note ||
        row?.reason ||
        safeStringify(row?.payload),
      ""
    ),
    createdAt: row?.created_at || row?.timestamp || row?.logged_at || null,
    sourceTable,
  };
}

async function loadAuditRowsCompat(): Promise<AuditRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const tables: Array<"audit_logs" | "admin_audit_logs" | "activity_logs"> = [
    "audit_logs",
    "admin_audit_logs",
    "activity_logs",
  ];

  const rows: AuditRow[] = [];

  for (const table of tables) {
    const res = await supabase.from(table).select("*").limit(400);

    if (res.error) {
      if (isSchemaMismatch(res.error)) continue;
      throw res.error;
    }

    rows.push(
      ...((res.data ?? []) as any[]).map((row) => normalizeAuditRow(row, table))
    );
  }

  return rows.sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });
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

function QuickAction({
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

export default function AdminAuditPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;

      if (!q) return true;

      return (
        row.id.toLowerCase().includes(q) ||
        (row.actorId || "").toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.targetType.toLowerCase().includes(q) ||
        (row.targetId || "").toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.details.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const successCount = useMemo(
    () => rows.filter((row) => row.status === "success").length,
    [rows]
  );
  const warningCount = useMemo(
    () => rows.filter((row) => row.status === "warning").length,
    [rows]
  );
  const errorCount = useMemo(
    () => rows.filter((row) => row.status === "error").length,
    [rows]
  );
  const adminActionsCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.sourceTable === "admin_audit_logs" ||
          row.action.includes("admin") ||
          row.action.includes("ban") ||
          row.action.includes("role")
      ).length,
    [rows]
  );
  const last24hCount = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return rows.filter((row) => {
      const time = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      return time > 0 && now - time <= oneDay;
    }).length;
  }, [rows]);

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

        const nextRows = await loadAuditRowsCompat();

        setAdminProfile(nextAdmin);
        setRows(nextRows);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les logs d’audit.",
        });
        console.error("Admin audit error:", e);
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
            Admin Audit
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
                    Traçabilité & logs
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Audit
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Logs total <span className="font-black text-white">{rows.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      24h <span className="font-black text-white">{last24hCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="violet">
                      <FileSearch className="h-3.5 w-3.5" />
                      audit logs
                    </Tag>
                    <Tag tone="gold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      historique
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Succès"
                value={successCount}
                icon={<ShieldCheck className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Warnings"
                value={warningCount}
                icon={<Activity className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Erreurs"
                value={errorCount}
                icon={<Shield className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Actions admin"
                value={adminActionsCount}
                icon={<UserCog className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Dernières 24h"
                value={last24hCount}
                icon={<Clock3 className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title="Accès rapides audit" right={<Tag tone="gold">actions</Tag>}>
                <div className="grid gap-4 md:grid-cols-2">
                  <QuickAction
                    title="Sécurité"
                    desc="Voir incidents, bans et alertes critiques."
                    icon={<Shield className="h-4 w-4" />}
                    onClick={() => router.push("/admin/security")}
                    tone="red"
                  />

                  <QuickAction
                    title="Modération"
                    desc="Vérifier les actions de contrôle et les reports."
                    icon={<Sparkles className="h-4 w-4" />}
                    onClick={() => router.push("/admin/moderation")}
                    tone="violet"
                  />

                  <QuickAction
                    title="Système"
                    desc="Voir l’état global des tables et modules."
                    icon={<Wrench className="h-4 w-4" />}
                    onClick={() => router.push("/admin/system")}
                    tone="gold"
                  />

                  <QuickAction
                    title="Membres"
                    desc="Retrouver le compte ciblé par une action."
                    icon={<UserCog className="h-4 w-4" />}
                    onClick={() => router.push("/admin/members")}
                    tone="green"
                  />
                </div>
              </Panel>

              <Panel title="Recherche & filtres" right={<Tag>logs</Tag>}>
                <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ID, actor ID, action, cible, détail..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Tous" },
                      { key: "success", label: "Success" },
                      { key: "warning", label: "Warning" },
                      { key: "error", label: "Error" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key as FilterValue)}
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
            </div>

            <Panel title="Journal d’audit" right={<Tag>{filteredRows.length} affichés</Tag>}>
              {filteredRows.length === 0 ? (
                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                  Aucun log trouvé avec ce filtre.
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRows.map((row) => {
                    const statusTone =
                      row.status === "success"
                        ? "green"
                        : row.status === "warning"
                        ? "gold"
                        : "red";

                    return (
                      <div
                        key={`${row.sourceTable}-${row.id}`}
                        className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-black tracking-[-0.02em] text-white">
                              {row.action}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Tag tone={statusTone}>{row.status}</Tag>
                              <Tag tone="violet">{row.targetType}</Tag>
                              <Tag>{row.sourceTable}</Tag>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                              Actor ID
                            </div>
                            <div className="mt-2 break-all text-sm text-white/68">
                              {row.actorId || "Inconnu"}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                              Target ID
                            </div>
                            <div className="mt-2 break-all text-sm text-white/68">
                              {row.targetId || "Aucune cible"}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                              Date
                            </div>
                            <div className="mt-2 text-sm text-white/68">
                              {row.createdAt
                                ? new Date(row.createdAt).toLocaleString()
                                : "Inconnue"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                            Détails
                          </div>
                          <div className="mt-2 text-sm leading-6 text-white/62">
                            {row.details || "Aucun détail."}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              row.actorId
                                ? router.push(
                                    `/admin/members?search=${encodeURIComponent(
                                      row.actorId
                                    )}`
                                  )
                                : setFlash({
                                    tone: "error",
                                    text: "Aucun actor ID lié à ce log.",
                                  })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                          >
                            <Eye className="h-4 w-4" />
                            Voir acteur
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              row.targetId
                                ? router.push(
                                    `/admin/members?search=${encodeURIComponent(
                                      row.targetId
                                    )}`
                                  )
                                : setFlash({
                                    tone: "error",
                                    text: "Aucune cible membre liée à ce log.",
                                  })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07]"
                          >
                            <UserCog className="h-4 w-4" />
                            Voir cible
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
  );
}
