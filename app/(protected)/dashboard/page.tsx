"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName from "@/components/ProfileName";
import {
  ArrowRight,
  Crown,
  Gem,
  Lock,
  MessageSquare,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Video,
  Wand2,
} from "lucide-react";

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
  role?: string | null;
  active_name_fx_key?: string | null;
  active_badge_key?: string | null;
  active_title_key?: string | null;
  master_title?: string | null;
};

type UserState = {
  id: string;
  email?: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const QUICK_LINKS = [
  {
    href: "/salons",
    label: "Salons",
    description: "Explorer les salles en direct et entrer dans l’espace webcam.",
    icon: Video,
    accent:
      "from-violet-500/20 via-fuchsia-500/10 to-transparent border-violet-500/20",
  },
  {
    href: "/messages",
    label: "Messages",
    description: "Retrouver tes conversations privées et réponses en temps réel.",
    icon: MessageSquare,
    accent:
      "from-cyan-500/20 via-sky-500/10 to-transparent border-cyan-500/20",
  },
  {
    href: "/boutique",
    label: "Boutique",
    description: "Acheter des effets premium, badges et titres de prestige.",
    icon: ShoppingBag,
    accent:
      "from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/20",
  },
  {
    href: "/inventaire",
    label: "Inventaire",
    description: "Gérer ce que tu possèdes et équiper ton identité visuelle.",
    icon: Wand2,
    accent:
      "from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/20",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserState | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const supabase = requireSupabaseBrowserClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          router.replace("/enter");
          return;
        }

        if (cancelled) return;

        setUser({
          id: session.user.id,
          email: session.user.email,
        });

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, pseudo, credits, is_vip, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title"
          )
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!cancelled) {
          setProfile(profileRow ?? { id: session.user.id });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger le dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const displayName = useMemo(() => {
    return profile?.pseudo?.trim() || "Membre Ether";
  }, [profile]);

  const credits = profile?.credits ?? 0;
  const isVip = !!profile?.is_vip;
  const isAdmin = !!profile?.is_admin;
  const role = (profile?.role || (isAdmin ? "admin" : isVip ? "vip" : "member"))
    .toString()
    .toUpperCase();

  if (loading) {
    return (
      <main className="min-h-[70vh]">
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a12] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-6 h-4 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="mb-4 h-12 w-80 max-w-full animate-pulse rounded-2xl bg-white/10" />
            <div className="mb-8 h-5 w-96 max-w-full animate-pulse rounded-full bg-white/5" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-24 animate-pulse rounded-3xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-3xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-3xl bg-white/5" />
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#0a0a12] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-5 h-4 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="mb-4 h-28 animate-pulse rounded-[28px] bg-white/5" />
            <div className="space-y-3">
              <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[70vh]">
        <section className="rounded-[32px] border border-rose-500/20 bg-rose-500/10 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <div className="text-sm uppercase tracking-[0.2em] text-rose-200/80">
            Dashboard
          </div>
          <h1 className="mt-2 text-2xl font-black text-white">
            Impossible de charger la page
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-rose-100/80">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-500/25"
          >
            Recharger
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh]">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0a0a12] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:p-7">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.10),transparent_28%)]" />
            <div className="absolute -right-16 top-10 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute -left-12 bottom-4 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/85">
              <Sparkles className="h-3.5 w-3.5" />
              EtherCristal Dashboard
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Espace privé
                </div>

                <div className="mt-3 text-3xl font-black leading-none text-white sm:text-4xl">
                  <ProfileName
                    name={displayName}
                    effectClass={profile?.active_name_fx_key ?? null}
                    size="xl"
                    className="max-w-full"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    rôle {role}
                  </span>

                  {isVip && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      <Crown className="h-3.5 w-3.5" />
                      VIP
                    </span>
                  )}

                  {isAdmin && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200">
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </span>
                  )}
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/55">
                  Ton centre de contrôle EtherCristal. Accède à tes salons,
                  messages, effets, boutique et identité premium sans le bordel
                  inutile.
                </p>
              </div>

              <div className="w-full max-w-[240px] rounded-[28px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                  Compte
                </div>
                <div className="mt-3 truncate text-sm font-semibold text-white/85">
                  {user?.email || "email indisponible"}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-white/75">
                  <Gem className="h-4 w-4 text-violet-300" />
                  <span className="font-black text-white">
                    {credits.toLocaleString("fr-CA")}
                  </span>
                  <span className="text-white/35">crédits</span>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                  Statut
                </div>
                <div className="mt-3 flex items-center gap-2 text-lg font-black text-white">
                  {isVip ? (
                    <>
                      <Crown className="h-5 w-5 text-amber-300" />
                      VIP actif
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5 text-white/60" />
                      Membre Ether
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                  Effet actif
                </div>
                <div className="mt-3 text-lg font-black text-white">
                  {profile?.active_name_fx_key
                    ? profile.active_name_fx_key
                    : "Aucun effet équipé"}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                  Accès rapide
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-lg font-black text-white">
                  <Lock className="h-5 w-5 text-cyan-300" />
                  Zone privée active
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-[#0a0a12] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:p-7">
          <div className="text-xs uppercase tracking-[0.22em] text-white/35">
            Navigation principale
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            Ce que tu veux faire maintenant
          </h2>

          <div className="mt-5 space-y-3">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "group block rounded-[26px] border bg-gradient-to-br p-4 transition-all duration-200 hover:-translate-y-[2px] hover:border-white/20",
                    item.accent
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/25 text-white/85">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-white">
                          {item.label}
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-white/70" />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] border border-white/10 bg-[#0a0a12] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-7">
          <div className="text-xs uppercase tracking-[0.22em] text-white/35">
            Identité
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            Présence EtherCristal
          </h2>
          <div className="mt-5 rounded-[28px] border border-white/10 bg-black/25 p-5">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
              Aperçu membre
            </div>
            <div className="mt-4 text-2xl font-black text-white sm:text-3xl">
              <ProfileName
                name={displayName}
                effectClass={profile?.active_name_fx_key ?? null}
                size="xl"
              />
            </div>

            {profile?.master_title ? (
              <div className="mt-3 text-sm font-semibold text-violet-200/85">
                {profile.master_title}
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/40">
                Aucun titre premium équipé.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-[#0a0a12] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-7">
          <div className="text-xs uppercase tracking-[0.22em] text-white/35">
            État du compte
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            Résumé rapide
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                Messages
              </div>
              <div className="mt-2 text-lg font-black text-white">
                Centre privé
              </div>
              <div className="mt-1 text-xs text-white/45">
                Réponses en direct et échanges privés.
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                Boutique
              </div>
              <div className="mt-2 text-lg font-black text-white">
                Effets premium
              </div>
              <div className="mt-1 text-xs text-white/45">
                Achète et équipe ton style visuel.
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                Salons
              </div>
              <div className="mt-2 text-lg font-black text-white">
                Accès direct
              </div>
              <div className="mt-1 text-xs text-white/45">
                Rejoins les salles webcam sans détour.
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                Sécurité
              </div>
              <div className="mt-2 text-lg font-black text-white">
                Session active
              </div>
              <div className="mt-1 text-xs text-white/45">
                Accès membre protégé et espace réservé.
              </div>
            </div>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-500/20"
            >
              <Shield className="h-4 w-4" />
              Ouvrir l’admin
            </Link>
          )}

          {!isAdmin && (
            <Link
              href="/vip"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-200 transition hover:bg-amber-500/20"
            >
              <Crown className="h-4 w-4" />
              Voir le VIP
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
