"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
};

export default function VipPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/enter");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, pseudo, credits, is_vip, is_admin")
      .eq("id", user.id)
      .single();

    if (error) {
      setError(error.message);
    } else {
      setProfile(data as ProfileRow);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const pseudo = profile?.pseudo || "Membre";
  const credits = profile?.credits ?? 0;
  const isVip = Boolean(profile?.is_vip);
  const isAdmin = Boolean(profile?.is_admin);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(255,70,120,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-yellow-200">
              VIP
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Espace premium
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
              Un accès plus exclusif, plus direct, avec des avantages visuels et des salons réservés.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TopStat label="Pseudo" value={pseudo} />
            <TopStat label="Crédits" value={credits} />
            <TopStat label="Statut" value={isAdmin ? "Admin" : isVip ? "VIP" : "Membre"} />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-[24px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
            <div className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          </div>
        </>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Salons VIP"
              desc="Accès aux espaces réservés et plus filtrés."
            />
            <FeatureCard
              title="Effets exclusifs"
              desc="Objets, halos et visuels premium réservés."
            />
            <FeatureCard
              title="Priorité visuelle"
              desc="Présence plus marquée dans l'univers EtherCristal."
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">
                {isVip || isAdmin ? "Statut VIP actif" : "Passer VIP"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/58">
                {isVip || isAdmin
                  ? "Ton compte a déjà accès aux avantages premium. Tu peux profiter des salons VIP et des contenus réservés."
                  : "Ton compte est encore standard. Le mode VIP ouvre l’accès aux salons privés, aux effets réservés et à une présence plus premium sur la plateforme."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ActionCard
                  title="Voir les salons"
                  desc="Explorer les espaces disponibles"
                  onClick={() => router.push("/salons")}
                />
                <ActionCard
                  title="Boutique"
                  desc="Découvrir les items premium"
                  onClick={() => router.push("/boutique")}
                />
              </div>

              {!isVip && !isAdmin ? (
                <button
                  type="button"
                  onClick={() => router.push("/boutique")}
                  className="mt-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-300 to-rose-400 px-5 py-3 text-sm font-black text-black transition hover:opacity-95"
                >
                  Débloquer l’expérience premium
                </button>
              ) : null}
            </section>

            <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">Résumé VIP</h2>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Compte" value={pseudo} />
                <SummaryRow label="Statut" value={isAdmin ? "Admin" : isVip ? "VIP" : "Membre"} />
                <SummaryRow label="Crédits" value={String(credits)} />
                <SummaryRow
                  label="Accès salons VIP"
                  value={isVip || isAdmin ? "Oui" : "Non"}
                />
                <SummaryRow
                  label="Accès objets exclusifs"
                  value={isVip || isAdmin ? "Oui" : "Partiel"}
                />
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function TopStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/58">{desc}</p>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[24px] border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10"
    >
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/58">{desc}</p>
      <div className="mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-rose-400 transition-all duration-300 group-hover:w-24" />
    </button>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/38">{label}</p>
      <p className="mt-2 text-sm font-bold text-white/88">{value}</p>
    </div>
  );
}
