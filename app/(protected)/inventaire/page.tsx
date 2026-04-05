"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PackageOpen,
  Search,
  RefreshCw,
  Wand2,
  X,
  Shield,
  Crown,
  Sparkles,
  Gem,
  Zap,
  Lock,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";
import { SHOP, ShopItem, ShopCategory, rarityBadgeClass, getShopItemByKey } from "@/lib/shop";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = DisplayProfile & {
  id: string;
  credits?: number | null;
  vip_expires_at?: string | null;

  active_name_fx_key?: string | null;
  active_badge_key?: string | null;
  active_title_key?: string | null;

  master_title?: string | null;
  master_title_style?: string | null;
};

type InventoryRow = {
  id: string;
  user_id: string;
  item_key: string;
  equipped: boolean | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type Tab = "name_fx" | "badge" | "title" | "vip_plan" | "master_ether";

function isVipActive(vip_expires_at?: string | null) {
  if (!vip_expires_at) return false;
  const d = new Date(vip_expires_at);
  if (Number.isNaN(d.getTime())) return false;
  return d > new Date();
}

export default function InventairePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const [tab, setTab] = useState<Tab>("name_fx");
  const [query, setQuery] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");
  const vipOk = isVipActive(profile?.vip_expires_at) || isAdmin;

  const ownedKeys = useMemo(() => new Set(inventory.map((i) => i.item_key)), [inventory]);

  const ownedItems = useMemo(() => {
    // items = inventory items join SHOP
    const list: ShopItem[] = [];
    for (const row of inventory) {
      const item = getShopItemByKey(row.item_key);
      if (item) list.push(item);
    }
    return list;
  }, [inventory]);

  // group categories
  const byCat = useMemo(() => {
    const map = new Map<ShopCategory, ShopItem[]>();
    for (const it of ownedItems) {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    }
    // sort: rarity then price
    const rank: Record<string, number> = { COMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5 };
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (rank[b.rarity] - rank[a.rarity]) || (b.price - a.price));
      map.set(k, arr);
    }
    return map;
  }, [ownedItems]);

  const visibleItems = useMemo(() => {
    const cat = tab as ShopCategory;
    const base = byCat.get(cat) ?? [];

    const q = query.trim().toLowerCase();
    if (!q) return base;

    return base.filter((it) => {
      const text = `${it.name} ${it.description} ${it.vibe} ${it.rarity}`.toLowerCase();
      return text.includes(q);
    });
  }, [byCat, tab, query]);

  const activeNameFx = profile?.active_name_fx_key ?? null;
  const activeBadge = profile?.active_badge_key ?? null;
  const activeTitle = profile?.active_title_key ?? null;

  async function getAuthedUserOrRedirect() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      router.push("/enter");
      return null;
    }
    return user;
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    setInfo("");

    const user = await getAuthedUserOrRedirect();
    if (!user) return;

    const [pRes, invRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, pseudo, credits, vip_expires_at, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("inventory_items")
        .select("id, user_id, item_key, equipped")
        .eq("user_id", user.id),
    ]);

    if (pRes.error) setError(pRes.error.message);
    else setProfile((pRes.data as any) ?? null);

    if (invRes.error) setError((prev) => prev || invRes.error!.message);
    else setInventory((invRes.data ?? []) as InventoryRow[]);

    setLoading(false);
  }

  async function refreshAll() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iconForTab(t: Tab) {
    if (t === "name_fx") return <Sparkles className="h-4 w-4" />;
    if (t === "badge") return <Gem className="h-4 w-4" />;
    if (t === "title") return <Zap className="h-4 w-4" />;
    if (t === "vip_plan") return <Crown className="h-4 w-4" />;
    return <Wand2 className="h-4 w-4" />;
  }

  function isActive(item: ShopItem) {
    if (!profile) return false;
    if (item.category === "name_fx") return profile.active_name_fx_key === item.key;
    if (item.category === "badge") return profile.active_badge_key === item.key;
    if (item.category === "title") return profile.active_title_key === item.key;
    if (item.category === "master_ether") return Boolean(isAdmin && profile.master_title === (item.titleText ?? item.name));
    if (item.category === "vip_plan") return vipOk;
    return false;
  }

  async function deactivateCategory(cat: ShopCategory) {
    if (!profile?.id) return;
    setError(""); setInfo("");

    try {
      const patch: any = {};
      if (cat === "name_fx") patch.active_name_fx_key = null;
      if (cat === "badge") patch.active_badge_key = null;
      if (cat === "title") patch.active_title_key = null;
      if (cat === "master_ether") {
        if (!isAdmin) return;
        patch.master_title = null;
        patch.master_title_style = null;
      }

      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) throw new Error(error.message);

      setProfile((p) => (p ? ({ ...p, ...patch } as any) : p));
      setInfo("Désactivé ✅");
    } catch (e: any) {
      setError(e?.message || "Erreur désactivation.");
    }
  }

  async function activate(item: ShopItem) {
    if (!profile?.id) return;
    setError(""); setInfo("");

    try {
      // security checks
      if (item.category === "master_ether" && !isAdmin) {
        setError("Réservé au Maître Ether.");
        return;
      }
      if (item.category !== "vip_plan" && item.category !== "master_ether") {
        if (!ownedKeys.has(item.key)) {
          setError("Tu ne possèdes pas cet item.");
          return;
        }
      }

      const patch: any = {};

      if (item.category === "name_fx") patch.active_name_fx_key = item.key;
      if (item.category === "badge") patch.active_badge_key = item.key;
      if (item.category === "title") patch.active_title_key = item.key;

      if (item.category === "master_ether") {
        patch.master_title = item.titleText ?? item.name;
        patch.master_title_style = item.previewClass ?? "text-white/70";
      }

      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) throw new Error(error.message);

      setProfile((p) => (p ? ({ ...p, ...patch } as any) : p));
      setInfo(`Activé : ${item.name} ✨`);
    } catch (e: any) {
      setError(e?.message || "Erreur activation.");
    }
  }

  // Tabs visibility
  const tabs: Array<{ key: Tab; label: string; show: boolean }> = [
    { key: "name_fx", label: "Effets nom", show: true },
    { key: "badge", label: "Badges", show: true },
    { key: "title", label: "Titres", show: true },
    { key: "vip_plan", label: "VIP", show: true },
    { key: "master_ether", label: "Maître Ether", show: isAdmin },
  ];

  // show an “owned count”
  const counts = useMemo(() => {
    const res: Record<string, number> = {};
    for (const t of ["name_fx", "badge", "title", "vip_plan", "master_ether"]) {
      res[t] = (byCat.get(t as any) ?? []).length;
    }
    return res;
  }, [byCat]);

  // preview item active
  const previewNameFx = useMemo(() => (activeNameFx ? getShopItemByKey(activeNameFx) : null), [activeNameFx]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              <PackageOpen className="h-3.5 w-3.5" />
              Inventaire
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Tes objets & effets
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Active tes effets ici : ton pseudo se met à jour partout.
            </p>

            {profile ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">Aperçu</div>
                  <div className="mt-3">
                    <ProfileName profile={profile} size="lg" showTitle />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/70">
                      {profile.credits ?? 0} crédits
                    </span>
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1",
                        vipOk
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border-white/10 bg-white/10 text-white/55"
                      )}
                    >
                      {vipOk ? "VIP actif" : "Non VIP"}
                    </span>
                    {isAdmin ? (
                      <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-violet-200">
                        Maître Ether
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">Actif</div>
                  <div className="mt-3 space-y-2 text-sm text-white/70">
                    <div>
                      <span className="text-white/45">Nom :</span>{" "}
                      <span className="font-black text-white/85">
                        {previewNameFx?.name ?? "Aucun"}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/45">Badge :</span>{" "}
                      <span className="font-black text-white/85">
                        {activeBadge ? (getShopItemByKey(activeBadge)?.name ?? activeBadge) : "Aucun"}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/45">Titre :</span>{" "}
                      <span className="font-black text-white/85">
                        {activeTitle ? (getShopItemByKey(activeTitle)?.name ?? activeTitle) : "Aucun"}
                      </span>
                    </div>
                    {isAdmin ? (
                      <div>
                        <span className="text-white/45">Ether :</span>{" "}
                        <span className="font-black text-white/85">
                          {profile.master_title ?? "Aucun"}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push("/boutique")}
                      className="rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2.5 text-sm font-black text-black hover:opacity-95"
                    >
                      Aller à la boutique
                    </button>

                    <button
                      onClick={refreshAll}
                      disabled={refreshing}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white/85 hover:bg-white/10 disabled:opacity-60"
                    >
                      <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Search */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher dans l'inventaire..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-rose-400/35"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition",
                tab === t.key
                  ? "border-white/10 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {iconForTab(t.key)}
              {t.label}
              <span className="ml-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                {counts[t.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {info}
        </div>
      ) : null}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : tab === "vip_plan" ? (
        <VipPanel vipOk={vipOk} />
      ) : tab === "master_ether" && !isAdmin ? (
        <LockedPanel />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-black text-white">Rien ici</h2>
              <p className="mt-2 text-white/60">Essaie une autre recherche ou catégorie.</p>
            </div>
          ) : (
            visibleItems.map((item) => {
              const active = isActive(item);
              const owned = ownedKeys.has(item.key);

              return (
                <ItemCard
                  key={item.key}
                  item={item}
                  active={active}
                  owned={owned}
                  isAdmin={isAdmin}
                  onActivate={() => activate(item)}
                  onDeactivate={() => deactivateCategory(item.category)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function VipPanel({ vipOk }: { vipOk: boolean }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-white font-black text-xl">
        <Crown className="h-5 w-5 text-amber-200" />
        VIP
      </div>
      <p className="mt-2 text-sm text-white/60">
        Ton statut VIP est géré depuis la boutique (achat/activation). Ici, on affiche l’état.
      </p>

      <div className={cx(
        "mt-5 rounded-2xl border p-4",
        vipOk ? "border-amber-400/20 bg-amber-500/10" : "border-white/10 bg-white/5"
      )}>
        <div className="text-sm font-black">
          {vipOk ? "VIP actif ✅" : "Non VIP"}
        </div>
        <div className="mt-1 text-xs text-white/60">
          Va dans Boutique → VIP pour acheter/étendre ton accès.
        </div>
      </div>
    </section>
  );
}

function LockedPanel() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-white font-black text-xl">
        <Lock className="h-5 w-5" />
        Réservé
      </div>
      <p className="mt-2 text-sm text-white/60">
        Cette section est réservée au Maître Ether.
      </p>
    </section>
  );
}

function ItemCard({
  item,
  active,
  owned,
  isAdmin,
  onActivate,
  onDeactivate,
}: {
  item: ShopItem;
  active: boolean;
  owned: boolean;
  isAdmin: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const isMaster = item.category === "master_ether";
  const canUse = !isMaster || isAdmin;

  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={cx("rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.16em]", rarityBadgeClass(item.rarity))}>
              {item.rarity}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-white/65">
              {item.vibe}
            </span>
            {active ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-200">
                ACTIF
              </span>
            ) : null}
            {owned && !active && !isMaster ? (
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/60">
                POSSÉDÉ
              </span>
            ) : null}
            {isMaster ? (
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black text-violet-200">
                ETHER
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 truncate text-2xl font-black text-white">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
          {item.category === "name_fx" ? (
            <Sparkles className="h-5 w-5 text-fuchsia-200" />
          ) : item.category === "badge" ? (
            <Gem className="h-5 w-5 text-cyan-200" />
          ) : item.category === "title" ? (
            <Zap className="h-5 w-5 text-rose-200" />
          ) : item.category === "master_ether" ? (
            <Wand2 className="h-5 w-5 text-violet-200" />
          ) : (
            <Crown className="h-5 w-5 text-amber-200" />
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">Preview</div>

        {item.category === "name_fx" ? (
          <div className={cx("mt-2 text-2xl font-black", item.previewClass || "text-white")}>
            Pseudo
          </div>
        ) : item.category === "badge" ? (
          <div className="mt-2">
            <span className={item.badgeClass || "text-white/70"}>{item.name}</span>
          </div>
        ) : (
          <div className={cx("mt-2 text-xs font-black tracking-[0.22em] uppercase", item.previewClass || "text-white/70")}>
            {item.titleText || item.name}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-white/70">
          {isMaster ? "Réservé Maître" : `${item.price} crédits`}
        </div>

        <div className="flex gap-2">
          {active ? (
            <button
              onClick={onDeactivate}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white/85 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
              Désactiver
            </button>
          ) : (
            <button
              onClick={onActivate}
              disabled={!canUse || (!isMaster && !owned)}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition",
                !canUse
                  ? "border border-white/10 bg-white/5 text-white/45 cursor-not-allowed"
                  : (!isMaster && !owned)
                  ? "border border-white/10 bg-white/5 text-white/45 cursor-not-allowed"
                  : "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
              )}
            >
              <Wand2 className="h-4 w-4" />
              Activer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function iconForTab(t: Tab) {
  if (t === "name_fx") return <Sparkles className="h-4 w-4" />;
  if (t === "badge") return <Gem className="h-4 w-4" />;
  if (t === "title") return <Zap className="h-4 w-4" />;
  if (t === "vip_plan") return <Crown className="h-4 w-4" />;
  return <Wand2 className="h-4 w-4" />;
}
