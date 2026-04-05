"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,70,120,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%),linear-gradient(to_bottom,#050507,#08070b_45%,#050507)]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:30px_30px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl shadow-[0_0_30px_rgba(255,80,120,0.15)]">
              💎
            </div>
            <div>
              <p className="text-lg font-black leading-none text-white">EtherCristal</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/35">
                accès privé
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/enter")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Connexion
            </button>

            <button
              type="button"
              onClick={() => router.push("/enter")}
              className="rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2.5 text-sm font-black text-black transition hover:opacity-95"
            >
              Entrer
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="grid w-full gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <section>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                Univers privé • 18+ • premium
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl">
                Une entrée plus adulte,
                <span className="bg-gradient-to-r from-rose-500 via-amber-300 to-white bg-clip-text text-transparent">
                  {" "}plus propre,{" "}
                </span>
                plus immersive.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 sm:text-lg">
                EtherCristal rassemble salons privés, effets visuels, profils premium, inventaire,
                boutique et accès réservés dans une seule identité forte. Rien de cheap, rien de
                brouillon. Juste une ambiance sombre, nette et exclusive.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/enter")}
                  className="rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3.5 text-sm font-black text-black transition hover:opacity-95"
                >
                  Accéder à l’espace privé
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/salons")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Voir l’univers
                </button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <LandingCard
                  title="Salons privés"
                  desc="Des espaces directs, plus propres et plus immersifs."
                />
                <LandingCard
                  title="Effets premium"
                  desc="Boutique, inventaire, équipements et ambiance visuelle."
                />
                <LandingCard
                  title="Accès VIP"
                  desc="Des zones réservées et une identité plus exclusive."
                />
              </div>
            </section>

            <section>
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_28%)]" />

                <div className="relative">
                  <div className="rounded-[24px] border border-white/10 bg-black/25 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/38">
                      Expérience
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-white">
                      Un portail central, pas un patchwork de pages.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/58">
                      Tu entres, tu te connectes, puis tu arrives dans un univers cohérent :
                      dashboard, salons, messages, boutique, inventaire et accès premium.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <PanelInfo label="Accès" value="Connexion / inscription unifiée" />
                    <PanelInfo label="Style" value="Nocturne, premium, plus mature" />
                    <PanelInfo label="Navigation" value="Dashboard, salons, profil, VIP" />
                    <PanelInfo label="Sortie" value="Redirection propre après auth" />
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/enter")}
                    className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3.5 text-sm font-black text-black transition hover:opacity-95"
                  >
                    Commencer maintenant
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function LandingCard({
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

function PanelInfo({
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
