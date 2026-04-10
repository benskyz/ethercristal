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
  BadgeCheck,
  Check,
  Eye,
  Menu,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
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

type VerificationRow = {
  id: string;
  userId: string | null;
  status: string;
  note: string;
  createdAt: string | null;
  reviewedAt: string | null;
  sourceTable: "verification_requests" | "profile_verifications";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "pending" | "approved" | "rejected";

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

function normalizeVerification(
  row: any,
  sourceTable: "verification_requests" | "profile_verifications"
): VerificationRow {
  return {
    id: String(row?.id ?? crypto.randomUUID()),
    userId: row?.user_id
      ? String(row.user_id)
      : row?.profile_id
      ? String(row.profile_id)
      : row?.member_id
      ? String(row.member_id)
      : null,
    status: sanitizeText(row?.status, "pending").toLowerCase(),
    note: sanitizeText(
      row?.note || row?.admin_note || row?.reason || row?.comment,
      ""
    ),
    createdAt: row?.created_at || row?.submitted_at || null,
    reviewedAt: row?.reviewed_at || row?.verified_at || null,
    sourceTable,
  };
}

async function loadVerificationsCompat(): Promise<VerificationRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const tries: Array<{
    table: "verification_requests" | "profile_verifications";
  }> = [
    { table: "verification_requests" },
    { table: "profile_verifications" },
  ];

  const results: VerificationRow[] = [];

  for (const attempt of tries) {
    const res = await supabase.from(attempt.table).select("*").limit(300);

    if (res.error) {
      if (isSchemaMismatch(res.error)) continue;
      throw res.error;
    }

    results.push(
      ...((res.data ?? []) as any[]).map((row) =>
        normalizeVerification(row, attempt.table)
      )
    );
  }

  return results.sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });
}

async function updateVerificationStatus(
  row: VerificationRow,
  nextStatus: "approved" | "rejected" | "pending"
) {
  const supabase = requireSupabaseBrowserClient();

  const res = await supabase
    .from(row.sourceTable)
    .update({ status: nextStatus })
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

export default function AdminVerificationPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return verifications.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;

      if (!q) return true;

      return (
        row.id.toLowerCase().includes(q) ||
        (row.userId || "").toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.note.toLowerCase().includes(q)
      );
    });
  }, [verifications, search, filter]);

  const pendingCount = useMemo(
    () => verifications.filter((row) => row.status === "pending").length,
    [verifications]
  );
  const approvedCount = useMemo(
    () => verifications.filter((row) => row.status === "approved").length,
    [verifications]
  );
  const rejectedCount = useMemo(
    () => verifications.filter((row) => row.status === "rejected").length,
    [verifications]
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

        const rows = await loadVerificationsCompat();

        setAdminProfile(nextAdmin);
        setVerifications(rows);
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger les vérifications.",
        });
        console.error("Admin verification error:", e);
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
    row: VerificationRow,
    nextStatus: "approved" | "rejected" | "pending"
  ) {
    try {
      setBusyId(row.id);
      await updateVerificationStatus(row, nextStatus);

      setVerifications((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: nextStatus } : item
        )
      );

      setFlash({
        tone: "success",
        text:
          nextStatus === "approved"
            ? "Vérification approuvée."
            : nextStatus === "rejected"
            ? "Vérification rejetée."
            : "Vérification repassée en attente.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier cette vérification.",
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
            Admin Verification
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
                    Validation & sécurité
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Vérification
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Pending <span className="font-black text-white">{pendingCount}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Approved <span className="font-black text-white">{approvedCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="gold">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      vérification
                    </Tag>
                    <Tag tone="red">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      contrôle admin
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
                label="Total demandes"
                value={verifications.length}
                icon={<BadgeCheck className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Pending"
                value={pendingCount}
                icon={<ShieldAlert className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Approved"
                value={approvedCount}
                icon={<Check className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Rejected"
                value={rejectedCount}
                icon={<X className="h-4 w-4" />}
                tone="red"
              />
            </div>

            <Panel title="Recherche & filtres" right={<Tag tone="gold">filtre</Tag>}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ID, user ID, note, statut..."
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "all", label: "Toutes" },
                    { key: "pending", label: "Pending" },
                    { key: "approved", label: "Approved" },
                    { key: "rejected", label: "Rejected" },
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

            <Panel title="Demandes de vérification" right={<Tag>{filteredRows.length} affichées</Tag>}>
              {filteredRows.length === 0 ? (
                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                  Aucune demande trouvée avec ce filtre.
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRows.map((row) => {
                    const busy = busyId === row.id;
                    const tone =
                      row.status === "approved"
                        ? "green"
                        : row.status === "rejected"
                        ? "red"
                        : "gold";

                    return (
                      <div
                        key={`${row.sourceTable}-${row.id}`}
                        className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-xl font-black tracking-[-0.02em] text-white">
                              Vérification {row.id}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Tag tone={tone}>{row.status}</Tag>
                              <Tag tone="violet">{row.sourceTable}</Tag>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                            Note
                          </div>
                          <div className="mt-2 text-sm leading-6 text-white/62">
                            {row.note || "Aucune note fournie."}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleStatus(row, "approved")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition disabled:opacity-60"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Approver
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleStatus(row, "rejected")}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition disabled:opacity-60"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            Rejeter
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
                              <ShieldAlert className="h-4 w-4" />
                            )}
                            Remettre pending
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
                                    text: "Aucun user ID lié à cette demande.",
                                  })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                          >
                            <Eye className="h-4 w-4" />
                            Voir membre
                          </button>
                        </div>

                        {row.reviewedAt ? (
                          <div className="mt-3 text-xs text-white/42">
                            Dernière révision : {new Date(row.reviewedAt).toLocaleString()}
                          </div>
                        ) : null}
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
