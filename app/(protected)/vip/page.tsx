"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  ensureProfileRecord,
  isVipActive,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";
import {
  Check,
  Crown,
  Gem,
  Loader2,
  Lock,
  Menu,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from "lucide-react";

type PlanRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  duration_days: number | null;
  perks: string | null;
  is_active: boolean | null;
};

type PaymentRow = {
  id: string;
  user_id: string | null;
  purchase_type: string;
  plan_slug: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  provider: string;
  created_at: string;
  updated_at?: string;
};

type SubscriptionPurchaseRow = {
  id: string;
  user_id: string;
  payment_id: string | null;
  plan_id: string | null;
  plan_slug: string;
  title: string;
  amount: number;
  currency: string;
  status: "pending" | "active" | "expired" | "cancelled" | "refunded";
  starts_at: string;
  expires_at: string | null;
  created_at: string;
};

type SessionResult = {
  ok?: boolean;
  paymentId?: string;
  status?: string;
  checkoutUrl?: string;
  message?: string;
  error?: string;
};

const FALLBACK_PLANS: PlanRow[] = [
  {
    id: "vip-7j-fallback",
    slug: "vip-7j",
    title: "VIP 7 jours",
    description: "Accès premium court pour tester les options VIP.",
    price: 14.99,
    duration_days: 7,
    perks: "Badge VIP, Accès zones VIP, Style profil premium",
    is_active: true,
  },
  {
    id: "vip-30j-fallback",
    slug: "vip-30j",
    title: "VIP 30 jours",
    description: "Le meilleur équilibre entre prix et avantages premium.",
    price: 29.99,
    duration_days: 30,
    perks: "Badge VIP, Accès salons VIP, Priorité futures options premium, Style nom premium",
    is_active: true,
  },
  {
    id: "vip-90j-fallback",
    slug: "vip-90j",
    title: "VIP 90 jours",
    description: "Longue durée, meilleure valeur.",
    price: 69.99,
    duration_days: 90,
    perks: "Tous les avantages VIP, Longue durée, Meilleure valeur",
    is_active: true,
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(amount: number, currency = "CAD") {
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-CA");
}

function parsePerks(input?: string | null) {
  if (!input) return [];
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function Tag({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "gold" | "violet" | "green" | "red";
}) {
  const styles =
    tone === "gold"
      ? "border-amber-400/18 bg-amber-500/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "green"
      ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
      : tone === "red"
      ? "border-red-400/18 bg-red-500/10 text-red-100"
      : "border-white/10 bg-white/[0.04] text-white/72";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]",
        styles
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
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

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
        {label}
      </div>
      <div className="text-right text-sm font-black text-white">{value}</div>
    </div>
  );
}

function PlanCard({
  plan,
  currentPlanSlug,
  vipActive,
  isAdmin,
  buying,
  onBuy,
}: {
  plan: PlanRow;
  currentPlanSlug: string | null;
  vipActive: boolean;
  isAdmin: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const perks = parsePerks(plan.perks);
  const isCurrent = vipActive && currentPlanSlug === plan.slug;
  const featured = plan.slug === "vip-30j";

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] border p-6 shadow-[0_18px_55px_rgba(0,0,0,0.28)]",
        featured
          ? "border-fuchsia-400/18 bg-gradient-to-br from-[#160910] via-[#0f0a12] to-[#0b0b10]"
          : "border-red-500/12 bg-[#0d0d12]"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.07),rgba(255,0,90,0.03),rgba(255,255,255,0.01))]" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/36">
              {plan.slug}
            </div>
            <div className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
              {plan.title}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {featured ? <Tag tone="violet">recommandé</Tag> : null}
            {isCurrent ? <Tag tone="green">actif</Tag> : null}
            {isAdmin ? <Tag tone="red">admin</Tag> : null}
          </div>
        </div>

        <div className="mt-5 flex items-end gap-2">
          <div className="text-4xl font-black tracking-[-0.05em] text-white">
            {formatMoney(Number(plan.price || 0))}
          </div>
          <div className="pb-1 text-sm text-white/46">
            / {plan.duration_days || 0} jours
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/60">
          {plan.description || "Plan VIP EtherCristal."}
        </p>

        <div className="mt-5 space-y-3">
          {perks.map((perk) => (
            <div
              key={`${plan.slug}-${perk}`}
              className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-black/20 px-4 py-3"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <div className="text-sm leading-6 text-white/74">{perk}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={buying || isCurrent || isAdmin}
          onClick={onBuy}
          className={cx(
            "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border px-4 py-4 text-sm font-black uppercase tracking-[0.14em] transition",
            buying || isCurrent || isAdmin
              ? "border-white/10 bg-white/[0.05] text-white/42"
              : "border-amber-400/18 bg-amber-500/10 text-amber-100 hover:bg-amber-500/16"
          )}
        >
          {buying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création...
            </>
          ) : isCurrent ? (
            <>
              <Check className="h-4 w-4" />
              Déjà actif
            </>
          ) : isAdmin ? (
            <>
              <Shield className="h-4 w-4" />
              Inclus admin
            </>
          ) : (
            <>
              <Crown className="h-4 w-4" />
              Acheter ce plan
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function VipPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyingSlug, setBuyingSlug] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPurchaseRow[]>([]);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const activeSubscription = useMemo(() => {
    const now = Date.now();
    return (
      subscriptions.find((row) => {
        if (row.status !== "active") return false;
        if (!row.expires_at) return true;
        return new Date(row.expires_at).getTime() > now;
      }) || null
    );
  }, [subscriptions]);

  const vipActive = useMemo(
    () => isVipActive(profile) || Boolean(activeSubscription),
    [profile, activeSubscription]
  );

  const currentPlanSlug = activeSubscription?.plan_slug || null;
  const latestPayment = payments[0] || null;
  const isAdmin = Boolean(profile?.is_admin);

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setError("");

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const nextProfile = await ensureProfileRecord(user);

        const [plansRes, paymentsRes, subscriptionsRes] = await Promise.all([
          supabase
            .from("subscription_plans")
            .select("id, slug, title, description, price, duration_days, perks, is_active")
            .eq("is_active", true)
            .order("price", { ascending: true }),
          supabase
            .from("payments")
            .select("id, user_id, purchase_type, plan_slug, amount, currency, status, provider, created_at, updated_at")
            .eq("user_id", user.id)
            .eq("purchase_type", "vip")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("subscription_purchases")
            .select("id, user_id, payment_id, plan_id, plan_slug, title, amount, currency, status, starts_at, expires_at, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (plansRes.error) throw plansRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        if (subscriptionsRes.error) throw subscriptionsRes.error;

        setProfile(nextProfile);
        setPlans((plansRes.data as PlanRow[] | null)?.length ? (plansRes.data as PlanRow[]) : FALLBACK_PLANS);
        setPayments((paymentsRes.data || []) as PaymentRow[]);
        setSubscriptions((subscriptionsRes.data || []) as SubscriptionPurchaseRow[]);
      } catch (err: any) {
        setError(err?.message || "Impossible de charger la page VIP.");
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

  const handleCreateVipPayment = useCallback(
    async (plan: PlanRow) => {
      try {
        setBuyingSlug(plan.slug);
        setError("");
        setSuccess("");

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Session utilisateur introuvable.");
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
          throw new Error("Variables publiques Supabase manquantes.");
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/create-payment-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: anonKey,
            },
            body: JSON.stringify({
              purchaseType: "vip",
              amount: Number(plan.price || 0),
              currency: "CAD",
              planSlug: plan.slug,
              metadata: {
                title: plan.title,
                source: "vip-page",
              },
            }),
          }
        );

        const result = (await response.json()) as SessionResult;

        if (!response.ok) {
          throw new Error(result?.error || "Impossible de créer la session VIP.");
        }

        setSuccess(
          result?.checkoutUrl
            ? `Session créée. Payment ID: ${result.paymentId}. URL de sortie: ${result.checkoutUrl}`
            : `Session créée. Payment ID: ${result.paymentId}.`
        );

        await loadPage(false);
      } catch (err: any) {
        setError(err?.message || "Impossible de créer le paiement VIP.");
      } finally {
        setBuyingSlug(null);
      }
    },
    [loadPage]
  );

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <Loader2 className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal VIP
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
            <section className="relative overflow-hidden rounded-[32px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    statut premium
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    VIP
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {profileDisplayName(profile)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits{" "}
                      <span className="font-black text-white">
                        {profile?.credits ?? 0}
                      </span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      statut{" "}
                      <span className="font-black text-white">
                        {isAdmin ? "ADMIN" : vipActive ? "VIP" : "MEMBRE"}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isAdmin ? <Tag tone="red">admin</Tag> : null}
                    {vipActive ? <Tag tone="gold">vip actif</Tag> : <Tag>standard</Tag>}
                    {currentPlanSlug ? <Tag tone="violet">{currentPlanSlug}</Tag> : null}
                    {profile?.master_title ? (
                      <Tag tone="violet">{profile.master_title}</Tag>
                    ) : null}
                  </div>

                  <p className="mt-5 max-w-3xl text-sm leading-7 text-white/58">
                    Le backend paiement est validé. Cette page crée maintenant
                    des sessions de paiement propres côté Supabase pour les plans VIP.
                  </p>
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
                    <Gem className="h-4 w-4" />
                    Dashboard
                  </button>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="statut"
                value={isAdmin ? "ADMIN" : vipActive ? "VIP" : "MEMBRE"}
                icon={<Crown className="h-4 w-4" />}
              />
              <Stat
                label="crédits"
                value={profile?.credits ?? 0}
                icon={<Wallet className="h-4 w-4" />}
              />
              <Stat
                label="plan actif"
                value={currentPlanSlug || "aucun"}
                icon={<Star className="h-4 w-4" />}
              />
              <Stat
                label="paiements VIP"
                value={payments.length}
                icon={<Sparkles className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card title="Offres VIP" right={<Tag tone="gold">{plans.length} plans</Tag>}>
                <div className="grid gap-4 xl:grid-cols-3">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      currentPlanSlug={currentPlanSlug}
                      vipActive={vipActive}
                      isAdmin={isAdmin}
                      buying={buyingSlug === plan.slug}
                      onBuy={() => void handleCreateVipPayment(plan)}
                    />
                  ))}
                </div>
              </Card>

              <div className="space-y-6">
                <Card
                  title="Résumé compte"
                  right={
                    isAdmin ? (
                      <Tag tone="red">
                        <Shield className="h-3.5 w-3.5" />
                        admin
                      </Tag>
                    ) : vipActive ? (
                      <Tag tone="gold">
                        <Crown className="h-3.5 w-3.5" />
                        vip
                      </Tag>
                    ) : (
                      <Tag>
                        <Lock className="h-3.5 w-3.5" />
                        standard
                      </Tag>
                    )
                  }
                >
                  <div className="grid gap-3">
                    <Row label="membre" value={profileDisplayName(profile)} />
                    <Row label="rôle" value={profile?.role || "member"} />
                    <Row label="VIP actif" value={vipActive ? "Oui" : "Non"} />
                    <Row
                      label="expire le"
                      value={formatDate(activeSubscription?.expires_at || profile?.vip_expires_at)}
                    />
                    <Row label="titre" value={profile?.master_title || "Aucun"} />
                    <Row label="effet nom" value={profile?.active_name_fx_key || "Aucun"} />
                    <Row label="badge" value={profile?.active_badge_key || "Aucun"} />
                  </div>
                </Card>

                <Card title="Dernier paiement" right={<Tag tone="violet">trace</Tag>}>
                  {latestPayment ? (
                    <div className="grid gap-3">
                      <Row
                        label="montant"
                        value={formatMoney(Number(latestPayment.amount || 0), latestPayment.currency)}
                      />
                      <Row label="plan" value={latestPayment.plan_slug || "—"} />
                      <Row label="statut" value={latestPayment.status} />
                      <Row label="provider" value={latestPayment.provider} />
                      <Row label="créé" value={formatDate(latestPayment.created_at)} />
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/52">
                      Aucun paiement VIP enregistré.
                    </div>
                  )}
                </Card>

                <Card title="Avantages VIP" right={<Tag tone="violet">premium</Tag>}>
                  <div className="space-y-3">
                    {[
                      "Accès aux zones et salons VIP",
                      "Badge premium visible sur ton profil",
                      "Style de nom / effets premium",
                      "Base prête pour provider réel",
                      "Logique backend déjà validée",
                    ].map((perk) => (
                      <div
                        key={perk}
                        className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-black/20 px-4 py-3"
                      >
                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
                        <div className="text-sm leading-6 text-white/68">{perk}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <Card title="Historique abonnements" right={<Tag>{subscriptions.length} lignes</Tag>}>
              {subscriptions.length === 0 ? (
                <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/48">
                  Aucun abonnement enregistré.
                </div>
              ) : (
                <div className="grid gap-3">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-[20px] border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-black text-white">
                            {sub.title || sub.plan_slug}
                          </div>
                          <div className="mt-1 text-xs text-white/42">
                            {sub.plan_slug}
                          </div>
                        </div>
                        <Tag
                          tone={
                            sub.status === "active"
                              ? "green"
                              : sub.status === "pending"
                              ? "gold"
                              : sub.status === "refunded"
                              ? "violet"
                              : "red"
                          }
                        >
                          {sub.status}
                        </Tag>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <Row
                          label="montant"
                          value={formatMoney(Number(sub.amount || 0), sub.currency)}
                        />
                        <Row label="début" value={formatDate(sub.starts_at)} />
                        <Row label="expiration" value={formatDate(sub.expires_at)} />
                        <Row label="créé" value={formatDate(sub.created_at)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
