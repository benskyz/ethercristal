"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Users,
  ShoppingBag,
  MessageCircle,
  User,
  Crown,
  Shield,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";

const supabase = requireSupabaseBrowserClient();

type Profile = DisplayProfile & {
  id: string;
  email?: string | null;
  credits?: number | null;
  vip_expires_at?: string | null;
  created_at?: string | null;
};

type PresenceRow = {
  id: string;
  room_id: string;
  user_id: string;
  pseudo?: string | null;
  updated_at?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

function isVipActive(vip_expires_at?: string | null) {
  if (!vip_expires_at) return false;
  const d = new Date(vip_expires_at);
  if (Number.isNaN(d.getTime())) return false;
  return d > new Date();
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [roomsCount, setRoomsCount] = useState<number>(0);
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [error, setError] = useState("");

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");
  const vipOk = isVipActive(profile?.vip_expires_at) || isAdmin;
  const credits = profile?.credits ?? 0;

  const onlineCount = useMemo(() => {
    const now = Date.now();
    return presence.filter((p) => {
      const t = p.updated_at ? new Date(p.updated_at).getTime() : 0;
      return now - t < 60000;
    }).length;
  }, [presence]);

  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    setError("");

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      router.replace("/enter");
      return;
    }

    const [pRes, roomsRes, presenceRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, pseudo, email, credits, vip_expires_at, is_admin, role, created_at, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("rooms").select("id"),
      // no realtime, just pull once when dashboard loads / refresh
      supabase.from("room_presence").select("id, room_id, user_id, pseudo, updated_at"),
    ]);

    if (pRes.error) setError(pRes.error.message);
    else setProfile((pRes.data as any) ?? null);

    if (roomsRes.error) setError((prev) => prev || roomsRes.error!.message);
    else setRoomsCount((roomsRes.data ?? []).length);

    if (presenceRes.error) setError((prev) => prev || presenceRes.error!.message);
    else setPresence((presenceRes.data ?? []) as PresenceRow[]);

    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadAll(true);
    setRefreshing(false);
  }

  const cards = [
    {
      title: "Salons",
      value: roomsCount,
      hint: "Espaces disponibles",
      icon: Users,
      tone: "from-cyan-500/18 to-cyan-500/[0.03]",
      onClick: () => router.push("/salons"),
      cta: "Voir les salons",
    },
    {
      title: "Présence",
      value: onlineCount,
      hint: "En ligne (live)",
      icon: Sparkles,
      tone: "from-emerald-500/18 to-emerald-500/[0.03]",
      onClick: () => router.push("/salons"),
      cta: "Rejoindre",
    },
    {
      title: "Crédits",
      value: credits,
      hint: vipOk ? "VIP actif" : "Standard",
      icon: ShoppingBag,
      tone: "from-amber-500/18 to-amber-500/[0.03]",
      onClick: () => router.push("/boutique"),
      cta: "Boutique",
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Hero same vibe as /enter */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Ton espace privé
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Tout est propre, centré, premium. Aucun aperçu webcam ici — les cams restent dans les salles.
            </p>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/30 p-5">
              {profile ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/40">Identité</div>
                    <div className="mt-2">
                      <ProfileName profile={profile} size="lg" showTitle showBadge />
                    </div>
                    <div className="mt-3 text-sm text-white/55">
                      Compte créé le {formatDate(profile.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                      {credits} crédits
                    </span>
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1 text-xs font-black",
                        vipOk
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border-white/10 bg-white/10 text-white/55"
                      )}
                    >
                      {vipOk ? "VIP actif" : "Standard"}
                    </span>
                    {isAdmin ? (
                      <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-200">
                        Admin
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/60">Chargement…</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10 disabled:opacity-70"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-200 hover:bg-violet-500/15"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Stats cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.title}
                onClick={c.onClick}
                className={cx(
                  "group text-left rounded-[28px] border border-white/10 bg-gradient-to-br p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]",
                  c.tone
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                      {c.title}
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{c.value}</div>
                    <div className="mt-1 text-sm text-white/60">{c.hint}</div>
                  </div>

                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
                    <Icon className="h-5 w-5 text-white/80" />
                  </div>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-white/85">
                  {c.cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick actions (clean) */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickAction
          title="Salons"
          desc="Entrer dans les salles et rejoindre un emplacement."
          icon={<Users className="h-5 w-5" />}
          onClick={() => router.push("/salons")}
        />
        <QuickAction
          title="Boutique"
          desc="Acheter et activer tes effets de nom."
          icon={<ShoppingBag className="h-5 w-5" />}
          onClick={() => router.push("/boutique")}
        />
        <QuickAction
          title="Messages"
          desc="Ouvrir tes conversations privées."
          icon={<MessageCircle className="h-5 w-5" />}
          onClick={() => router.push("/messages")}
        />
        <QuickAction
          title="Profil"
          desc="Voir ton compte et ton statut."
          icon={<User className="h-5 w-5" />}
          onClick={() => router.push("/profile")}
        />
        <QuickAction
          title="VIP"
          desc="Activer ton accès premium."
          icon={<Crown className="h-5 w-5" />}
          onClick={() => router.push("/vip")}
        />
        <QuickAction
          title="Désir Intense"
          desc="Accéder à l’espace dédié (premium)."
          icon={<Sparkles className="h-5 w-5" />}
          onClick={() => router.push("/desir")}
        />
      </section>
    </div>
  );
}

function QuickAction({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{desc}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/85">
          {icon}
        </div>
      </div>
      <div className="mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 transition-all duration-300 group-hover:w-28" />
    </button>
  );
}
