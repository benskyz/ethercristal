"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

export default function DesirPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = requireSupabaseBrowserClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (profile?.is_admin) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("Desir page error:", e);
      }
    }

    load();
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,0,76,0.16),transparent_18%),radial-gradient(circle_at_85%_22%,rgba(212,175,55,0.10),transparent_22%),linear-gradient(180deg,#020202_0%,#080406_50%,#020202_100%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="absolute -top-10 left-[8%] h-56 w-56 rounded-full bg-red-600/20 blur-[100px]" />
      <div className="absolute top-[8%] right-[10%] h-56 w-56 rounded-full bg-yellow-500/10 blur-[110px]" />
      <div className="absolute bottom-[6%] left-[38%] h-44 w-44 rounded-full bg-white/10 blur-[90px]" />

      <section className="relative z-10 px-4 py-5 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* top bar */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-zinc-950/75 px-4 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">💎</div>
                <div>
                  <h1 className="text-xl font-bold">Désir Intense</h1>
                  <p className="text-xs text-zinc-400">{email || "Espace privé"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <TopLink href="/dashboard" label="Accueil" />
                <TopLink href="/messages" label="Messages" />
                <TopLink href="/profile" label="Profil" />
                <TopLink href="/inventaire" label="Inventaire" />
                <TopLink href="/boutique" label="Boutique" />
                <TopLink href="/options" label="Options" />
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* webcam zone */}
          <div className="flex flex-col gap-8">
            {/* webcam principale */}
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.50)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Cam to Cam Désir Intense</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Espace principal de connexion vidéo.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  Webcam principale
                </span>
              </div>

              <div className="h-[520px] md:h-[650px] bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎥</div>
                  <p className="text-base font-semibold text-white">Zone vidéo principale</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Ta webcam ou le flux principal apparaîtra ici.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-white/10 px-5 py-4">
                <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition">
                  Démarrer
                </button>
                <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition">
                  Couper le son
                </button>
                <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition">
                  Caméra
                </button>
              </div>
            </div>

            {/* webcam secondaire */}
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.50)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Salon Webcam</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Zone secondaire pour salon ou partenaire.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  Webcam secondaire
                </span>
              </div>

              <div className="h-[420px] md:h-[540px] bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">💎</div>
                  <p className="text-base font-semibold text-white">Zone vidéo secondaire</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Le salon webcam ou le second flux apparaîtra ici.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-white/10 px-5 py-4">
                <Link
                  href="/salons"
                  className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 transition"
                >
                  Ouvrir les salons
                </Link>
                <Link
                  href="/boutique"
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition"
                >
                  Voir la boutique
                </Link>
                <Link
                  href="/inventaire"
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition"
                >
                  Voir l’inventaire
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TopLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
    >
      {label}
    </Link>
  );
}
