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
  Check,
  CreditCard,
  Eye,
  Menu,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Wallet,
  X,
  RotateCcw,
  AlertTriangle,
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

type PaymentRow = {
  id: string;
  userId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  reference: string;
  createdAt: string | null;
  sourceTable: "payments" | "transactions";
  statusField: "status" | "payment_status";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "paid" | "pending" | "failed" | "refunded";

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

function normalizePaymentStatus(value: unknown) {
  const raw = sanitizeText(String(value ?? ""), "").toLowerCase();

  if (
    ["paid", "completed", "success", "succeeded", "done", "approved"].includes(raw)
  ) {
    return "paid";
  }

  if (["refund", "refunded", "chargeback"].includes(raw)) {
    return "refunded";
  }

  if (
    ["failed", "error", "cancelled", "canceled", "denied", "rejected"].includes(raw)
  ) {
    return "failed";
  }

  if (
    ["pending", "processing", "waiting", "created", "initiated"].includes(raw)
  ) {
    return "pending";
  }

  return raw || "pending";
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

function normalizePaymentRow(
  row: any,
  sourceTable: "payments" | "transactions"
): PaymentRow {
  const hasPaymentStatus = typeof row?.payment_status !== "undefined";

  return {
    id: String(row?.id ?? crypto.randomUUID()),
    userId: row?.user_id
      ? String(row.user_id)
      : row?.profile_id
      ? String(row.profile_id)
      : row?.member_id
      ? String(row.member_id)
      : row?.buyer_id
      ? String(row.buyer_id)
      : null,
    amount: Number(row?.amount ?? row?.total ?? row?.value ?? 0),
    currency: sanitizeText(row?.currency, "CAD").toUpperCase(),
    status: normalizePaymentStatus(
      hasPaymentStatus ? row?.payment_status : row?.status
    ),
    provider: sanitizeText(
      row?.provider || row?.gateway || row?.processor,
      "manual"
    ),
    reference: sanitizeText(
      row?.reference || row?.payment_ref || row?.transaction_ref || row?.stripe_id,
      ""
    ),
    createdAt: row?.created_at || row?.createdAt || row?.paid_at || null,
    sourceTable,
    statusField: hasPaymentStatus ? "payment_status" : "status",
  };
}

async function loadPaymentsCompat(): Promise<PaymentRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const tables: Array<"payments" | "transactions"> = ["payments", "transactions"];
  const rows: PaymentRow[] = [];

  for (const table of tables) {
    const res = await supabase.from(table).select("*").limit(500);

    if (res.error) {
      if (isSchemaMismatch(res.error)) continue;
      throw res.error;
    }

    rows.push(
      ...((res.data ?? []) as any[]).map((row) => normalizePaymentRow(row, table))
    );
  }

  return rows.sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });
}

async function updatePaymentStatus(
  row: PaymentRow,
  nextStatus: "paid" | "pending" | "failed" | "refunded"
) {
  const supabase = requireSupabaseBrowserClient();

  const res = await supabase
    .from(row.sourceTable)
    .update({ [row.statusField]: nextStatus })
    .eq("id", row.id);

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

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return payments.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;

      if (!q) return true;

      return (
        row.id.toLowerCase().includes(q) ||
        (row.userId || "").toLowerCase().includes(q) ||
        row.provider.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.currency.toLowerCase().includes(q)
      );
    });
  }, [payments, search, filter]);

  const paidRows = useMemo(
    () => payments.filter((row) => row.status === "paid"),
    [payments]
  );
  const paidCount = paidRows.length;
  const pendingCount = useMemo(
    () => payments.filter((row) => row.status === "pending").length,
    [payments]
  );
  const failedCount = useMemo(
    () => payments.filter((row) => row.status === "failed").length,
    [payments]
  );
  const refundedCount = useMemo(
    () => payments.filter((row) => row.status === "refunded").length,
    [payments]
  );

  const revenueTotal = useMemo(() => {
    return paidRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [paidRows]);

  const averageTicket = useMemo(() => {
    if (!paidRows.length) return 0;
    return revenueTotal / paidRows.length;
  }, [paidRows, revenueTotal]);

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

        const rows = await loadPaymentsCompat();

        setAdminProfile(nextAdmin);
        setPayments(rows);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les paiements.",
        });
        console.error("Admin payments error:", e);
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

  async function handleStatus(
    row: PaymentRow,
    nextStatus: "paid" | "pending" | "failed" | "refunded"
  ) {
    try {
      setBusyId(row.id);
      await updatePaymentStatus(row, nextStatus);

      setPayments((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: nextStatus } : item
        )
      );

      setFlash({
        tone: "success",
        text:
          nextStatus === "paid"
            ? "Paiement marqué payé."
            : nextStatus === "pending"
            ? "Paiement remis en attente."
            : nextStatus === "failed"
            ? "Paiement marqué échoué."
            : "Paiement marqué remboursé.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier ce paiement.",
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
            Admin Payments
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
                    Transactions & revenus
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Paiements
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Revenu <span className="font-black text-white">{moneyFormat(revenueTotal)}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Payés <span className="font-black text-white">{paidCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="gold">
                      <Wallet className="h-3.5 w-3.5" />
                      revenus
                    </Tag>
                    <Tag tone="violet">
                      <CreditCard className="h-3.5 w-3.5" />
                      transactions
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
                    onClick={() => router.push("/admin/reports")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                  >
                    <Sparkles className="h-4 w-4" />
                    Voir rapports
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total transactions"
                value={payments.length}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <StatCard
                label="Payées"
                value={paidCount}
                icon={<Check className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="En attente"
                value={pendingCount}
                icon={<RefreshCw className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Échouées"
                value={failedCount}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="red"
              />
              <StatCard
                label="Remboursées"
                value={refundedCount}
                icon={<RotateCcw className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Revenu total"
                value={moneyFormat(revenueTotal)}
                icon={<Wallet className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Panier moyen"
                value={moneyFormat(averageTicket)}
                icon={<CreditCard className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Admin"
                value="actif"
                icon={<Shield className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Tables lues"
                value="payments / transactions"
                icon={<Sparkles className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Monnaie dominante"
                value="CAD"
                icon={<Wallet className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title="Accès rapides paiements" right={<Tag tone="gold">actions</Tag>}>
                <div className="grid gap-4 md:grid-cols-2">
                  <QuickAction
                    title="Rapports"
                    desc="Voir la vue globale revenus, VIP et activité."
                    icon={<Wallet className="h-4 w-4" />}
                    onClick={() => router.push("/admin/reports")}
                    tone="gold"
                  />

                  <QuickAction
                    title="Boutique"
                    desc="Vérifier les items et le catalogue lié aux achats."
                    icon={<Sparkles className="h-4 w-4" />}
                    onClick={() => router.push("/admin/shop")}
                    tone="violet"
                  />

                  <QuickAction
                    title="Abonnements"
                    desc="Contrôler les plans VIP et les tarifs."
                    icon={<Shield className="h-4 w-4" />}
                    onClick={() => router.push("/admin/subscriptions")}
                    tone="green"
                  />

                  <QuickAction
                    title="Membres"
                    desc="Retrouver l’utilisateur lié à une transaction."
                    icon={<Eye className="h-4 w-4" />}
                    onClick={() => router.push("/admin/members")}
                  />
                </div>
              </Panel>

              <Panel title="Recherche & filtres" right={<Tag>paiements</Tag>}>
                <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ID, user ID, provider, reference..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Tous" },
                      { key: "paid", label: "Payés" },
                      { key: "pending", label: "Pending" },
                      { key: "failed", label: "Failed" },
                      { key: "refunded", label: "Refunded" },
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

            <Panel title="Liste des paiements" right={<Tag>{filteredRows.length} affichés</Tag>}>
              {filteredRows.length === 0 ? (
                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                  Aucun paiement trouvé avec ce filtre.
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRows.map((row) => {
                    const busy = busyId === row.id;

                    const tone =
                      row.status === "paid"
                        ? "green"
                        : row.status === "pending"
                        ? "gold"
                        : row.status === "refunded"
                        ? "violet"
                        : "red";

                    return (
                      <div
                        key={`${row.sourceTable}-${row.id}`}
                        className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-black tracking-[-0.02em] text-white">
                              {moneyFormat(row.amount, row.currency)}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Tag tone={tone}>{row.status}</Tag>
                              <Tag tone="violet">{row.provider}</Tag>
                              <Tag>{row.sourceTable}</Tag>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                              User ID
                            </div>
                            <div className="mt-2 break-all text-sm text-white/68">
                              {row.userId || "Inconnu"}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-red-500/10 bg-[#0f0f14] p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
                              Référence
                            </div>
                            <div className="mt-2 break-all text-sm text-white/68">
                              {row.reference || "Aucune"}
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

                        <div className="mt-4 grid gap-3 md:grid-cols-5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleStatus(row, "paid")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition disabled:opacity-60"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Paid
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleStatus(row, "pending")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-amber-400/18 bg-amber-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-amber-100 transition disabled:opacity-60"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            Pending
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleStatus(row, "failed")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition disabled:opacity-60"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            Failed
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleStatus(row, "refunded")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition disabled:opacity-60"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Refund
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              row.userId
                                ? router.push(
                                    `/admin/members?search=${encodeURIComponent(
                                      row.userId
                                    )}`
                                  )
                                : setFlash({
                                    tone: "error",
                                    text: "Aucun user ID lié à ce paiement.",
                                  })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07]"
                          >
                            <Eye className="h-4 w-4" />
                            Voir membre
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
