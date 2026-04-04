"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

type Profile = {
  id: string;
  username?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  is_admin?: boolean | null;
};

function getErrorMessage(error: any) {
  if (!error) return "Erreur inconnue.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  if (error.details) return error.details;
  return JSON.stringify(error);
}

async function ensureProfile(user: any): Promise<Profile> {
  const supabase = requireSupabaseBrowserClient();

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("DASHBOARD profile read error:", existingError);
    throw existingError;
  }

  if (existing) return existing as Profile;

  const base = String(user.user_metadata?.username || user.email || "membre")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 20);

  const username = `${base || "membre"}_${user.id.slice(0, 6)}`;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      vip_level: "Standard",
      ether_balance: 100,
      is_verified: false,
      is_admin: false,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("DASHBOARD profile upsert error:", upsertError);
    throw upsertError;
  }

  const { data: created, error: createdError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (createdError) {
    console.error("DASHBOARD profile reread error:", createdError);
    throw createdError;
  }

  if (!created) {
    throw new Error("Profil introuvable après création.");
  }

  return created as Profile;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const supabase = requireSupabaseBrowserClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("DASHBOARD auth getUser error:", userError);
          throw userError;
        }

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const ensuredProfile = await ensureProfile(user);

        if (!active) return;
        setProfile(ensuredProfile);
      } catch (e: any) {
        console.error("DASHBOARD RAW ERROR:", e);
        if (!active) return;
        setError(getErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      const supabase = requireSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <div className="text-4xl">💎</div>
          <h1 className="mt-3 text-5xl font-black bg-gradient-to-r from-red-400 via-pink-500 to-yellow-300 bg-clip-text text-transparent">
            EtherCristal
          </h1>
          <p className="mt-3 text-zinc-400">Dashboard minimal de diagnostic</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-6">
          {loading ? (
            <p className="text-zinc-300">Chargement du dashboard...</p>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="font-bold text-red-300">Erreur réelle :</p>
              <p className="mt-2 break-words text-sm text-red-200">{error}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Bienvenue</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-zinc-500">Pseudo</div>
                  <div className="mt-2 text-lg text-zinc-100">{profile?.username || "—"}</div>
                </div>

                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-zinc-500">VIP</div>
                  <div className="mt-2 text-lg text-zinc-100">{profile?.vip_level || "Standard"}</div>
                </div>

                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-zinc-500">Ether</div>
                  <div className="mt-2 text-lg text-zinc-100">{profile?.ether_balance ?? 0}</div>
                </div>

                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-zinc-500">Admin</div>
                  <div className="mt-2 text-lg text-zinc-100">{profile?.is_admin ? "Oui" : "Non"}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/profile"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-100"
                >
                  Profil
                </Link>
                <Link
                  href="/salons"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-100"
                >
                  Salons
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-gradient-to-r from-red-700 via-pink-600 to-yellow-400 px-4 py-3 text-sm font-extrabold text-[#160d02]"
                >
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
