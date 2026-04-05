"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  getShopItemByKey,
  getCategoryLabel,
  getRarityClasses,
  getRarityLabel,
  type ShopItem,
} from "@/lib/shop";

const supabase = requireSupabaseBrowserClient();

type InventoryRow = {
  id: string;
  user_id: string;
  item_key: string;
  equipped: boolean | null;
};

type ProfileRow = {
  id: string;
  credits: number | null;
  is_vip?: boolean | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function InventairePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/enter");
      return;
    }

    const [invRes, profileRes] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("id, credits, is_vip")
        .eq("id", user.id)
        .single(),
    ]);

    if (invRes.error) {
      setError(invRes.error.message);
    } else {
      setItems(invRes.data || []);
    }

    if (profileRes.error) {
      setError(profileRes.error.message);
    } else {
      setProfile(profileRes.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const mappedItems = useMemo(() => {
    return items
      .map((inv) => {
        const item = getShopItemByKey(inv.item_key);
        if (!item) return null;
        return { ...inv, item };
      })
      .filter(Boolean) as Array<InventoryRow & { item: ShopItem }>;
  }, [items]);

  const equippedCount = mappedItems.filter((i) => i.equipped).length;

  async function toggleEquip(inv: InventoryRow & { item: ShopItem }) {
    setBusyKey(inv.id);
    setError("");
    setMessage("");

    try {
      const next = !inv.equipped;

      const { error } = await supabase
        .from("inventory_items")
        .update({ equipped: next })
        .eq("id", inv.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, equipped: next } : i))
      );

      setMessage(next ? `${inv.item.name} équipé` : `${inv.item.name} déséquipé`);
    } catch {
      setError("Erreur pendant la mise à jour de l'équipement.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Inventaire
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Tes effets et équipements
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
              Version propre, premium et alignée avec le reste du site. Tu vois ce que tu possèdes,
              ce qui est actif, et tu gères ton setup sans bordel.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TopStat label="Items" value={mappedItems.length} />
            <TopStat label="Équipés" value={equippedCount} />
            <TopStat label="Crédits" value={profile?.credits ?? 0} />
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[250px] animate-pulse rounded-[28px] border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : mappedItems.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <h2 className="text-2xl font-black text-white">Inventaire vide</h2>
          <p className="mt-2 text-white/60">
            Passe par la boutique pour débloquer tes premiers effets.
          </p>
          <button
            type="button"
            onClick={() => router.push("/boutique")}
            className="mt-5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3 text-sm font-black text-black hover:opacity-95"
          >
            Aller à la boutique
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mappedItems.map((inv) => (
            <article
              key={inv.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getRarityClasses(
                      inv.item.rarity
                    )}`}
                  >
                    {getRarityLabel(inv.item.rarity)}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">
                    {getCategoryLabel(inv.item.category)}
                  </span>
                </div>

                {inv.equipped ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    ÉQUIPÉ
                  </span>
                ) : null}
              </div>

              <h2 className="mt-6 text-2xl font-black text-white">{inv.item.name}</h2>

              <p className="mt-3 text-sm leading-6 text-white/60">
                {inv.item.longDescription ?? inv.item.description}
              </p>

              {inv.item.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {inv.item.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/50"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => toggleEquip(inv)}
                disabled={busyKey === inv.id}
                className={cx(
                  "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-black transition",
                  inv.equipped
                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    : "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
                )}
              >
                {busyKey === inv.id
                  ? "Traitement..."
                  : inv.equipped
                  ? "Déséquiper"
                  : "Équiper"}
              </button>
            </article>
          ))}
        </div>
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
