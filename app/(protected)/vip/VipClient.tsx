"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProfileName from "@/components/ProfileName";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { ensureProfileRecord, isVipActive, type ProfileRow } from "@/lib/profileCompat";
import {
  Check,
  Crown,
  Gem,
  Menu,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Timer,
  Zap,
} from "lucide-react";

type SubscriptionPlanRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  duration_days: number;
  perks: string;
  is_active: boolean;
};

type VipSubscriptionRow = {
  id: string;
  user_id: string;
  plan_slug: string;
  amount: number;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type FlashState =
  | {
      tone: "success" | "error" | "info";
      text: string;
    }
  | null;

const getSupabase = () => requireSupabaseBrowserClient();

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(value: number, currency = "CAD") {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
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

  const toneClass =
    flash.tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : flash.tone === "error"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100";

  return (
    <div className={cx("rounded-[20px] border px-4 py-4 text-sm", toneClass)}>
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

async function fetchPlans(): Promise<SubscriptionPlanRow[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SubscriptionPlanRow[];
}

async function fetchLatestVipSub(userId: string): Promise<VipSubscriptionRow | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("vip_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return null;
    }
    throw error;
  }

  return (data as VipSubscriptionRow | null) ?? null;
}

export default function VipClient() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const [viewer, setViewer] = useState<ProfileRow | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [latestVipSub, setLatestVipSub] = useState<VipSubscriptionRow | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);

  const vipActive = useMemo(() => isVipActive(viewer), [viewer]);

  const activePlanLabel = useMemo(() => {
    if (viewer?.is_admin) return "Admin";
    if (vipActive) return "VIP actif";
    return "Membre";
  }, [viewer, vipActive]);

  const activePerks = useMemo(
    () => [
      "Badge VIP visible",
      "Accès zones et expériences premium",
      "Style profil enrichi",
      "Priorité sur certaines fonctions",
    ],
    []
  );

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setFlash(null);

        const supabase = getSupabase();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/enter");
          return;
        }

        const [profile, fetchedPlans, vipSub] = await Promise.all([
          ensureProfileRecord(user),
          fetchPlans(),
          fetchLatestVipSub(user.id),
        ]);

        setViewer(profile);
        setPlans(fetchedPlans);
        setLatestVipSub(vipSub);
      } catch (err: any) {
        setFlash({
          tone: "error",
          text: err?.message || "Impossible de charger la page VIP.",
        });
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

  async function handleBuyPlan(plan: SubscriptionPlanRow) {
    if (!viewer) return;

    if (viewer.is_admin) {
      setFlash({
        tone: "info",
        text: "Le compte admin a déjà tous les privilèges VIP.",
      });
      return;
    }

    if (viewer.credits < Number(plan.price)) {
      setFlash({
        tone: "error",
        text: "Crédits insuffisants pour ce plan.",
      });
      return;
    }

    try {
      setBusySlug(plan.slug);
      setFlash(null);

      const supabase = getSupabase();

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000
      ).toISOString();

      const nextCredits = Number(viewer.credits) - Number(plan.price);

      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          credits: nextCredits,
          is_vip: true,
          vip_expires_at: expiresAt,
        })
        .eq("id", viewer.id);

      if (updateProfileError) throw updateProfileError;

      const subscriptionInsert = await supabase.from("vip_subscriptions").insert({
        user_id: viewer.id,
        plan_slug: plan.slug,
        amount: plan.price,
        status: "paid",
        started_at: now.toISOString(),
        expires_at: expiresAt,
      });

      if (
        subscriptionInsert.error &&
        subscriptionInsert.error.code !== "42P01" &&
        subscriptionInsert.error.code !== "PGRST205"
      ) {
        throw subscriptionInsert.error;
      }

      setViewer((prev) =>
        prev
          ? {
              ...prev,
              credits: nextCredits,
              is_vip: true,
              vip_expires_at: expiresAt,
            }
          : prev
      );

      setLatestVipSub({
        id: crypto.randomUUID(),
        user_id: viewer.id,
        plan_slug: plan.slug,
        amount: plan.price,
        status: "paid",
        started_at: now.toISOString(),
        expires_at: expiresAt,
        created_at: now.toISOString(),
      });

      setFlash({
        tone: "success",
        text: `${plan.title} activé avec succès.`,
      });
    } catch (err: any) {
      setFlash({
        tone: "error",
        text: err?.message || "Impossible d’activer ce plan VIP.",
      });
    } finally {
      setBusySlug(null);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            VIP
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
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
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
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
                    espace premium
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    VIP
                  </h1>

                  {viewer ? (
                    <div className="mt-5">
                      <ProfileName
                        pseudo={viewer.pseudo}
                        isVip={viewer.is_vip}
                        isAdmin={viewer.is_admin}
                        masterTitle={viewer.master_title}
                        masterTitleStyle={viewer.master_title_style}
                        activeNameFxKey={viewer.active_name_fx_key}
                        activeBadgeKey={viewer.active_badge_key}
                        activeTitleKey={viewer.active_title_key}
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span>
                      statut <span className="font-black text-white">{activePlanLabel}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits{" "}
                      <span className="font-black text-white">{viewer?.credits ?? 0}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      expiration{" "}
                      <span className="font-black text-white">
                        {viewer?.vip_expires_at
                          ? new Date(viewer.vip_expires_at).toLocaleDateString()
                          : "aucune"}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone={vipActive || viewer?.is_admin ? "gold" : "default"}>
                      <Crown className="h-3.5 w-3.5" />
                      {activePlanLabel}
                    </Tag>
                    <Tag tone="violet">
                      <Sparkles className="h-3.5 w-3.5" />
                      premium
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
                    onClick={() => router.push("/boutique")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                  >
                    <Gem className="h-4 w-4" />
                    Boutique
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Statut"
                value={viewer?.is_admin ? "ADMIN" : vipActive ? "VIP" : "MEMBRE"}
                icon={<Crown className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Crédits"
                value={viewer?.credits ?? 0}
                icon={<Sparkles className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Plan actif"
                value={latestVipSub?.plan_slug || "aucun"}
                icon={<Star className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Durée restante"
                value={
                  viewer?.vip_expires_at
                    ? new Date(viewer.vip_expires_at).toLocaleDateString()
                    : "n/a"
                }
                icon={<Timer className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                  avantages premium
                </div>

                <div className="space-y-3">
                  {activePerks.map((perk) => (
                    <div
                      key={perk}
                      className="flex items-start gap-3 rounded-[18px] border border-red-500/10 bg-black/20 px-4 py-4"
                    >
                      <div className="mt-0.5 rounded-full border border-emerald-400/18 bg-emerald-500/10 p-1 text-emerald-100">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-sm leading-6 text-white/70">{perk}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[20px] border border-amber-400/14 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {viewer?.is_admin
                    ? "Le compte admin possède déjà tous les privilèges."
                    : vipActive
                    ? "Ton accès VIP est actuellement actif."
                    : "Choisis un plan ci-contre pour activer les privilèges premium."}
                </div>
              </section>

              <section className="rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                    abonnements disponibles
                  </div>
                  <Tag tone="gold">
                    <Zap className="h-3.5 w-3.5" />
                    VIP plans
                  </Tag>
                </div>

                <div className="grid gap-4">
                  {plans.length === 0 ? (
                    <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                      Aucun plan actif pour le moment.
                    </div>
                  ) : (
                    plans.map((plan) => {
                      const perks = sanitizeText(plan.perks, "")
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean);

                      return (
                        <div
                          key={plan.id}
                          className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="text-2xl font-black tracking-[-0.03em] text-white">
                                {plan.title}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Tag tone="gold">{formatMoney(Number(plan.price))}</Tag>
                                <Tag tone="violet">{plan.duration_days} jours</Tag>
                                <Tag>{plan.slug}</Tag>
                              </div>

                              <div className="mt-4 text-sm leading-6 text-white/60">
                                {plan.description}
                              </div>

                              {perks.length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {perks.map((perk) => (
                                    <Tag key={perk}>{perk}</Tag>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              disabled={busySlug === plan.slug || viewer?.is_admin === true}
                              onClick={() => void handleBuyPlan(plan)}
                              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16 disabled:opacity-50"
                            >
                              {busySlug === plan.slug ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Crown className="h-4 w-4" />
                              )}
                              Activer
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
                  Si la table <span className="font-black text-white">vip_subscriptions</span> n’existe
                  pas encore, l’achat mettra quand même à jour le profil VIP sans casser la page.
                </div>
              </section>
            </div>

            <section className="rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-red-100/34">
                résumé compte
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                    statut
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {viewer?.is_admin ? "Admin" : vipActive ? "VIP" : "Membre"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                    accès premium
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {viewer?.is_admin || vipActive ? "Oui" : "Non"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                    rôle
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {viewer?.role || "member"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                    crédits
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {viewer?.credits ?? 0}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
