"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  SHOP_CATEGORIES,
  type ShopCategory,
  type ShopItem,
  getAllShopItems,
  getCategoryLabel,
  getDiscountPercent,
  getRarityClasses,
  getRarityLabel,
  isEquipped,
  isOwned,
  sortShopItems,
} from "@/lib/shop";

type ProfileRow = {
  id: string;
  credits: number | null;
  is_vip?: boolean | null;
};

type InventoryRow = {
  id: string;
  user_id: string;
  item_key: string;
  equipped: boolean | null;
};

type SortMode = "featured" | "price-asc" | "price-desc" | "rarity" | "newest";

const supabase = requireSupabaseBrowserClient();

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getButtonLabel(item: ShopItem, ownedKeys: string[], equippedKeys: string[]) {
  if (isEquipped(item.key, equippedKeys)) return "Équipé";
  if (isOwned(item.key, ownedKeys)) return "Possédé";
  return `Acheter • ${item.price} crédits`;
}

export default function BoutiquePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [credits, setCredits] = useState(0);
  const [isVip, setIsVip] = useState(false);

  const [ownedKeys, setOwnedKeys] = useState<string[]>([]);
  const [equippedKeys, setEquippedKeys] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ShopCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortMode>("featured");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

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
        .select("id, credits, is_vip")
        .eq("id", user.id)
        .single(),
      supabase
        .from("inventory_items")
        .select("id, user_id, item_key, equipped")
        .eq("user_id", user.id),
    ]);

    if (profileRes.data) {
      const profile = profileRes.data as ProfileRow;
      setCredits(profile.credits ?? 0);
      setIsVip(Boolean(profile.is_vip));
    }

    if (profileRes.error) {
      setError(profileRes.error.message);
    }

    if (inventoryRes.error) {
      setError(inventoryRes.error.message);
    } else {
      const rows = (inventoryRes.data ?? []) as InventoryRow[];
      setOwnedKeys(rows.map((row) => row.item_key));
      setEquippedKeys(rows.filter((row) => row.equipped).map((row) => row.item_key));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const allItems = useMemo(() => getAllShopItems(), []);

  const filteredItems = useMemo(() => {
    let items = [...allItems];

    if (category !== "all") {
      items = items.filter((item) => item.category === category);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter((item) =>
        [
          item.name,
          item.shortName,
          item.description,
          item.longDescription ?? "",
          item.category,
          item.rarity,
          ...(item.tags ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (!isVip) {
      items = items.filter((item) => !item.vipOnly);
    }

    return sortShopItems(items, sortBy);
  }, [allItems, category, query, sortBy, isVip]);

  async function autoEquipIfNeeded(userId: string, item: ShopItem) {
    if (!item.equip?.autoEquipOnBuy) return;

    const exclusiveGroup = item.equip.exclusiveGroup;

    if (exclusiveGroup) {
      const sameGroupKeys = allItems
        .filter((shopItem) => shopItem.equip?.exclusiveGroup === exclusiveGroup)
        .map((shopItem) => shopItem.key)
        .filter((key) => key !== item.key);

      if (sameGroupKeys.length > 0) {
        await supabase
          .from("inventory_items")
          .update({ equipped: false })
          .eq("user_id", userId)
          .in("item_key", sameGroupKeys);
      }
    }

    await supabase
      .from("inventory_items")
      .update({ equipped: true })
      .eq("user_id", userId)
      .eq("item_key", item.key);
  }

  async function handleBuy(item: ShopItem) {
    setBusyKey(item.key);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/enter");
        return;
      }

      if (item.vipOnly && !isVip) {
        throw new Error("Cet item est réservé aux membres VIP.");
      }

      if (ownedKeys.includes(item.key)) {
        throw new Error("Tu possèdes déjà cet item.");
      }

      if (credits < item.price) {
        throw new Error("Crédits insuffisants.");
      }

      const nextCredits = credits - item.price;

      const updateProfile = await supabase
        .from("profiles")
        .update({ credits: nextCredits })
        .eq("id", user.id);

      if (updateProfile.error) {
        throw new Error(updateProfile.error.message);
      }

      const insertInventory = await supabase.from("inventory_items").insert({
        user_id: user.id,
        item_key: item.key,
        equipped: Boolean(item.equip?.autoEquipOnBuy),
      });

      if (insertInventory.error) {
        throw new Error(insertInventory.error.message);
      }

      await autoEquipIfNeeded(user.id, item);

      setCredits(nextCredits);
      setOwnedKeys((prev) => [...prev, item.key]);

      if (item.equip?.autoEquipOnBuy) {
        const exclusiveGroup = item.equip.exclusiveGroup;

        if (exclusiveGroup) {
          const sameGroupKeys = allItems
            .filter((shopItem) => shopItem.equip?.exclusiveGroup === exclusiveGroup)
            .map((shopItem) => shopItem.key);

          setEquippedKeys((prev) => {
            const kept = prev.filter((key) => !sameGroupKeys.includes(key));
            return [...kept, item.key];
          });
        } else {
          setEquippedKeys((prev) => [...prev, item.key]);
        }
      }

      setMessage(`Achat réussi : ${item.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l'achat.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,170,60,0.10),transparent_30%)]" />
        <div className="relative">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Boutique
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                Effets et améliorations
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
                Même thème que le dashboard. Même propreté. Une boutique nette, sans surcharge
                visuelle inutile.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <QuickInfo label="Crédits" value={credits} />
              <QuickInfo label="Statut" value={isVip ? "VIP" : "Standard"} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un item..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ShopCategory | "all")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="all">Toutes les catégories</option>
            {SHOP_CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="featured">Mis en avant</option>
            <option value="newest">Nouveautés</option>
            <option value="rarity">Rareté</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
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

      <section>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[240px] animate-pulse rounded-[28px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <h2 className="text-2xl font-black">Aucun item trouvé</h2>
            <p className="mt-2 text-white/60">Ajuste la recherche ou le filtre.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const owned = isOwned(item.key, ownedKeys);
              const equipped = isEquipped(item.key, equippedKeys);
              const disabled =
                busyKey === item.key ||
                equipped ||
                owned ||
                (item.vipOnly && !isVip) ||
                credits < item.price;

              return (
                <article
                  key={item.key}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getRarityClasses(
                          item.rarity
                        )}`}
                      >
                        {getRarityLabel(item.rarity)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">
                        {getCategoryLabel(item.category)}
                      </span>

                      {item.vipOnly ? (
                        <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-300">
                          VIP
                        </span>
                      ) : null}
                    </div>

                    {getDiscountPercent(item) > 0 ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                        -{getDiscountPercent(item)}%
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-6 text-2xl font-black text-white">{item.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {item.longDescription ?? item.description}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">Prix</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xl font-black text-white">{item.price}</span>
                        <span className="text-sm text-white/60">crédits</span>
                        {item.oldPrice ? (
                          <span className="text-sm text-white/25 line-through">
                            {item.oldPrice}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleBuy(item)}
                    className={cx(
                      "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-black transition",
                      equipped
                        ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                        : owned
                        ? "border border-white/10 bg-white/10 text-white/70"
                        : item.vipOnly && !isVip
                        ? "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300/75"
                        : credits < item.price
                        ? "border border-red-400/20 bg-red-500/10 text-red-300/75"
                        : "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
                    )}
                  >
                    {busyKey === item.key
                      ? "Traitement..."
                      : getButtonLabel(item, ownedKeys, equippedKeys)}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickInfo({
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
