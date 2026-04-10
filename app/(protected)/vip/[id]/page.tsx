"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Crown,
  Lock,
  Menu,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  ensureProfileRecord,
  isVipActive,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";
import {
  EtherFXStyles,
  FXBadge,
  FXName,
  FXTitle,
  FXVipCard,
  type VIPGrade,
} from "@/components/effects/EtherFX";

type VipPlanRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  duration_days: number;
  perks: string;
  is_active: boolean;
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

function safeText(value: unknown, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toMoney(value: number, currency = "CAD") {
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizePlan(row: Record<string, unknown>): VipPlanRow {
  return {
    id: safeText(row.id),
    slug: safeText(row.slug),
    title: safeText(row.title, "VIP"),
    description: safeText(row.description, "Plan VIP"),
    price: toNumber(row.price, 0),
    duration_days: toNumber(row.duration_days, 30),
    perks: safeText(row.perks, ""),
    is_active: Boolean(row.is_active),
  };
}

function planGradeFromSlug(plan: VipPlanRow): VIPGrade {
  const raw = `${plan.slug} ${plan.title}`.toLowerCase();

  if (raw.includes("ruby")) return "ruby_vip";
  if (raw.includes("crystal")) return "crystal_vip";
  if (raw.includes("obsidian")) return "obsidian_vip";
  if (raw.includes("black") && raw.includes("diamond")) return "black_diamond";
  if (raw.includes("elite")) return "ether_elite";
  if (raw.includes("god")) return "god_mode";
  return "vip";
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
    <section className="relative overflow-hidden rounded-[30px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between gap-3">
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

export default function VipPlanPage() {
  const router = useRouter();
  const params = useParams();

  const planKey = Array.isArray(params?.id) ? params.id[0] : String(params?.id || "");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [plan, setPlan] = useState<VipPlanRow | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);

  const vipActive = useMemo(() => isVipActive(profile), [profile]);
  const isAdmin = Boolean(profile?.is_admin);

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

        const nextProfile = await ensureProfileRecord(user);

        let planRes;
        if (isUuid(planKey)) {
          planRes = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", planKey)
            .eq("is_active", true)
            .maybeSingle();
        } else {
          planRes = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("slug", planKey)
            .eq("is_active", true)
            .maybeSingle();
        }

        if (planRes.error) throw planRes.error;

        if (!planRes.data) {
          setProfile(nextProfile);
          setPlan(null);
          return;
        }

        setProfile(nextProfile);
        setPlan(normalizePlan(planRes.data as Record<string, unknown>));
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger ce plan VIP.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [planKey, router]
  );

  useEffect(() => {
    if (!planKey) {
      router.replace("/vip");
      return;
    }
    void loadPage(true);
  }, [planKey, router, loadPage]);

  async function handleActivate() {
    if (!profile || !plan) return;

    if (isAdmin) {
      setFlash({
        tone: "success",
        text: "Ton compte admin a déjà accès aux privilèges premium.",
      });
      return;
    }

    if (profile.credits < plan.price) {
      setFlash({
        tone: "error",
        text: "Tu n’as pas assez de crédits pour ce plan.",
      });
      return;
    }

    try {
      setBuying(true);
      setFlash(null);

      const supabase = requireSupabaseBrowserClient();

      const now = Date.now();
      const base =
        profile.vip_expires_at && new Date(profile.vip_expires_at).getTime() > now
          ? new Date(profile.vip_expires_at).getTime()
          : now;

      const expiresAt = new Date(
        base + plan.duration_days * 24 * 60 * 60 * 1000
      ).toISOString();

      const nextCredits = profile.credits - plan.price;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          credits: nextCredits,
          is_vip: true,
          vip_expires_at: expiresAt,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      const subInsert = await supabase.from("vip_subscriptions").insert({
        user_id: profile.id,
        plan_id: plan.id,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: "active",
      });

      if (subInsert.error) {
        console.warn("vip_subscriptions warning:", subInsert.error.message);
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              credits: nextCredits,
              is_vip: true,
              vip_expires_at: expiresAt,
            }
          : prev
      );

      setFlash({
        tone: "success",
        text: `${plan.title} activé. Ton VIP est maintenant prolongé jusqu’au ${new Date(
          expiresAt
        ).toLocaleString()}.`,
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Activation VIP impossible.",
      });
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement plan VIP...
          </h1>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <>
        <EtherFXStyles />
        <div className="min-h-screen bg-[#050507] text-white">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="relative min-h-screen lg:pl-[290px]">
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
              </div>

              <Panel title="Plan introuvable">
                <div className="rounded-[24px] border border-red-500/12 bg-black/20 p-8 text-center">
                  <div className="text-2xl font-black text-white">
                    Ce plan n’existe pas ou n’est plus actif.
                  </div>
                  <div className="mt-3 text-sm text-white/54">
                    Retourne à la page VIP pour choisir une autre formule.
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/vip")}
                    className="mt-6 inline-flex items-center gap-2 rounded-[18px] border border-amber-400/18 bg-amber-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/16"
                  >
                    <Crown className="h-4 w-4" />
                    Retour VIP
                  </button>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <EtherFXStyles />

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
              <section className="relative overflow-hidden rounded-[34px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

                <div className="relative z-10">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    formule VIP
                  </div>

                  <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
                    {plan.title}
                  </h1>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {profileDisplayName(profile)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits <span className="font-black text-white">{profile?.credits ?? 0}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      durée <span className="font-black text-white">{plan.duration_days} jours</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {vipActive ? (
                      <FXBadge
                        label="VIP actif"
                        variant="obsidian"
                        icon={<Crown className="h-3.5 w-3.5" />}
                      />
                    ) : (
                      <FXBadge
                        label="standard"
                        variant="ether"
                        icon={<Lock className="h-3.5 w-3.5" />}
                      />
                    )}

                    {isAdmin ? (
                      <FXBadge
                        label="admin"
                        variant="ember"
                        icon={<Shield className="h-3.5 w-3.5" />}
                      />
                    ) : null}

                    {profile?.active_name_fx_key ? (
                      <FXBadge
                        label={profile.active_name_fx_key}
                        variant={profile.active_name_fx_key}
                        icon={<Zap className="h-3.5 w-3.5" />}
                      />
                    ) : null}
                  </div>
                </div>
              </section>

              <FlashBanner flash={flash} />

              <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
                <Panel title="Plan sélectionné">
                  <FXVipCard
                    grade={planGradeFromSlug(plan)}
                    title={plan.title}
                    description={plan.description}
                    price={toMoney(plan.price)}
                    perks={
                      plan.perks ||
                      "Accès premium, mise en valeur visuelle, priorité sur l’expérience."
                    }
                    days={`${plan.duration_days} jours`}
                    busy={buying}
                    onClick={() => void handleActivate()}
                  />

                  <div className="mt-5 rounded-[22px] border border-red-500/12 bg-black/20 p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                      Détails
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[18px] border border-white/8 bg-[#111118] p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                          Prix
                        </div>
                        <div className="mt-2 text-2xl font-black text-white">
                          {toMoney(plan.price)}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/8 bg-[#111118] p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                          Durée
                        </div>
                        <div className="mt-2 text-2xl font-black text-white">
                          {plan.duration_days} jours
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[18px] border border-white/8 bg-[#111118] p-4 text-sm leading-6 text-white/58">
                      {plan.description}
                    </div>
                  </div>
                </Panel>

                <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
                  <Panel
                    title="Ton profil premium"
                    right={<FXBadge label={`${profile?.credits ?? 0} crédits`} variant="ruby" />}
                  >
                    <div className="rounded-[24px] border border-red-500/12 bg-black/20 p-5">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                        Identité
                      </div>

                      <div className="mt-3">
                        <FXName
                          text={profileDisplayName(profile)}
                          variant={profile?.active_name_fx_key || "ether"}
                          size="xl"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile?.active_badge_key ? (
                          <FXBadge
                            label={profile.active_badge_key}
                            variant={profile.active_badge_key}
                            icon={<Sparkles className="h-3.5 w-3.5" />}
                          />
                        ) : null}

                        {profile?.master_title ? (
                          <FXTitle
                            label={profile.master_title}
                            variant={profile?.active_title_key || "void"}
                          />
                        ) : null}

                        {vipActive ? (
                          <FXBadge
                            label="VIP"
                            variant="obsidian"
                            icon={<Crown className="h-3.5 w-3.5" />}
                          />
                        ) : null}

                        {isAdmin ? (
                          <FXBadge
                            label="Admin"
                            variant="ember"
                            icon={<Shield className="h-3.5 w-3.5" />}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <div className="rounded-[22px] border border-red-500/12 bg-black/20 p-5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                          VIP actuel
                        </div>
                        <div className="mt-2 text-xl font-black text-white">
                          {vipActive ? "Actif" : "Inactif"}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-red-500/12 bg-black/20 p-5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                          Expiration actuelle
                        </div>
                        <div className="mt-2 text-sm text-white/64">
                          {profile?.vip_expires_at
                            ? new Date(profile.vip_expires_at).toLocaleString()
                            : "Aucune expiration active"}
                        </div>
                      </div>
                    </div>
                  </Panel>

                  <Panel title="Actions">
                    <div className="grid gap-3">
                      <button
                        type="button"
                        disabled={buying}
                        onClick={() => void handleActivate()}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-amber-400/18 bg-amber-500/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/16 disabled:opacity-50"
                      >
                        {buying ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4" />
                        )}
                        Activer ce plan
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/vip")}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                      >
                        <Star className="h-4 w-4" />
                        Retour à la page VIP
                      </button>
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
