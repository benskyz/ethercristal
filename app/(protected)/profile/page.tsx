"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  email?: string | null;
  credits?: number | null;
  is_vip?: boolean | null;
  is_admin?: boolean | null;
  is_banned?: boolean | null;
  role?: string | null;
  created_at?: string | null;
};

type InventoryRow = {
  id: string;
  user_id: string;
  item_key: string;
  equipped: boolean | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
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

    const [profileRes, inventoryRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, pseudo, email, credits, is_vip, is_admin, is_banned, role, created_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("inventory_items")
        .select("id, user_id, item_key, equipped")
        .eq("user_id", user.id),
    ]);

    if (profileRes.error) {
      setError(profileRes.error.message);
    } else {
      setProfile(profileRes.data as ProfileRow);
    }

    if (inventoryRes.error) {
      setError(inventoryRes.error.message);
    } else {
      setInventory((inventoryRes.data ?? []) as InventoryRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const equippedCount = useMemo(
    () => inventory.filter((item) => Boolean(item.equipped)).length,
    [inventory]
  );

  const pseudo = profile?.pseudo || "Membre";
  const email = profile?.email || "Email non disponible";
  const credits = profile?.credits ?? 0;
  const isVip = Boolean(profile?.is_vip);
  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");
  const isBanned = Boolean(profile?.is_banned);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[24px] border border-white/10 bg-white/5 text-3xl shadow-[0_0_30px_rgba(255,80,120,0.12)]">
              💎
            </div>

            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                Profil
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                {pseudo}
              </h1>

              <p className="mt-2 text-sm text-white/58">{email}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {isAdmin ? (
                  <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">
                    ADMIN
                  </span>
                ) : null}

                {isVip ? (
                  <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-bold text-yellow-300">
                    VIP
                  </span>
                ) : null}

                {!isAdmin && !isVip ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
                    MEMBRE
                  </span>
                ) : null}

                {isBanned ? (
                  <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">
                    BANNI
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <TopStat label="Crédits" value={credits} />
            <TopStat label="Items" value={inventory.length} />
            <TopStat label="Équipés" value={equippedCount} />
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
            <div className="h-36 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
            <div className="h-36 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
            <div className="h-36 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="h-[320px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
            <div className="h-[320px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          </div>
        </>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <InfoCard
              label="Date d'arrivée"
              value={formatDate(profile?.created_at)}
            />
            <InfoCard
              label="Rôle"
              value={isAdmin ? "Administrateur" : isVip ? "VIP" : "Membre"}
            />
            <InfoCard
              label="Compte"
              value={isBanned ? "Restreint" : "Actif"}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">Aperçu du compte</h2>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Ici tu retrouves les informations principales de ton profil et les accès rapides
                vers les zones utiles du site.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ActionCard
                  title="Inventaire"
                  desc="Voir et gérer tes effets"
                  onClick={() => router.push("/inventaire")}
                />
                <ActionCard
                  title="Boutique"
                  desc="Acheter de nouveaux effets"
                  onClick={() => router.push("/boutique")}
                />
                <ActionCard
                  title="Salons"
                  desc="Rejoindre une salle"
                  onClick={() => router.push("/salons")}
                />
                <ActionCard
                  title="Dashboard"
                  desc="Retour au centre de contrôle"
                  onClick={() => router.push("/dashboard")}
                />
              </div>
            </section>

            <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">Résumé</h2>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Pseudo" value={pseudo} />
                <SummaryRow label="Email" value={email} />
                <SummaryRow label="Crédits" value={String(credits)} />
                <SummaryRow label="Items possédés" value={String(inventory.length)} />
                <SummaryRow label="Items équipés" value={String(equippedCount)} />
                <SummaryRow
                  label="Statut"
                  value={isAdmin ? "Admin" : isVip ? "VIP" : "Membre"}
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

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
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
      <div className="mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-300 transition-all duration-300 group-hover:w-24" />
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
