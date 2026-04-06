"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Crown,
  Sparkles,
  Gem,
  Zap,
  Wand2,
  RefreshCw,
  Shield,
  X,
  Check,
  Lock,
  Search,
  ArrowUpDown,
  Power,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import ProfileName, { DisplayProfile } from "@/components/ProfileName";
import {
  getItemsByCategory,
  rarityBadgeClass,
  ShopItem,
} from "@/lib/shop";

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

function isVipActive(vip_expires_at?: string | null) {
  if (!vip_expires_at) return false;
  const d = new Date(vip_expires_at);
  if (Number.isNaN(d.getTime())) return false;
  return d > new Date();
}

type MainTab = "effects" | "vip" | "master";
type EffectsTab = "name_fx" | "badge" | "title";
type SortKey = "rarity" | "price";

const rarityRank: Record<string, number> = { COMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5 };

export default function BoutiquePage() {
  const router = useRouter();

  const [mainTab, setMainTab] = useState<MainTab>("effects");
  const [effectsTab, setEffectsTab] = useState<EffectsTab>("name_fx");
  const [sortKey, setSortKey] = useState<SortKey>("rarity");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<ShopItem | null>(null);

  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");
  const credits = profile?.credits ?? 0;
  const vipOk = isVipActive(profile?.vip_expires_at) || isAdmin;

  const ownedKeys = useMemo(() => new Set(inventory.map((x) => x.item_key)), [inventory]);

  const nameFx = useMemo(() => getItemsByCategory("name_fx"), []);
  const badges = useMemo(() => getItemsByCategory("badge"), []);
  const titles = useMemo(() => getItemsByCategory("title"), []);
  const vipPlans = useMemo(() => getItemsByCategory("vip_plan"), []);
  const masterEther = useMemo(() => getItemsByCategory("master_ether"), []);

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
        .select("id, pseudo, credits, vip_expires_at, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style")
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

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  function openBuy(item: ShopItem) {
    setModalItem(item);
    setModalOpen(true);
    setError("");
    setInfo("");
  }
  function closeModal() {
    setModalOpen(false);
    setModalItem(null);
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

  async function addToInventoryIfMissing(item: ShopItem) {
    if (!profile?.id) return;
    if (ownedKeys.has(item.key)) return;

    const { error } = await supabase.from("inventory_items").insert({
      user_id: profile.id,
      item_key: item.key,
      equipped: false,
    });

    if (error) throw new Error(error.message);

    setInventory((prev) => [
      ...prev,
      { id: crypto.randomUUID(), user_id: profile.id, item_key: item.key, equipped: false } as any,
    ]);
  }

  async function buy(item: ShopItem) {
    if (!profile?.id) return;

    setBusyKey(item.key);
    setError("");
    setInfo("");

    try {
      if (item.requiresMaster && !isAdmin) {
        setError("Réservé au Maître Ether.");
        return;
      }
      if (ownedKeys.has(item.key)) {
        setInfo("Déjà possédé.");
        return;
      }
      if ((profile.credits ?? 0) < item.price) {
        setError("Crédits insuffisants.");
        return;
      }

      const nextCredits = (profile.credits ?? 0) - item.price;

      const upd = await supabase.from("profiles").update({ credits: nextCredits }).eq("id", profile.id);
      if (upd.error) throw new Error(upd.error.message);

      await addToInventoryIfMissing(item);

      setProfile((p) => (p ? ({ ...p, credits: nextCredits } as any) : p));
      setInfo(`Achat réussi : ${item.name} ✅`);
    } catch (e: any) {
      setError(e?.message || "Erreur achat.");
    } finally {
      setBusyKey(null);
      closeModal();
    }
  }

  async function activate(item: ShopItem) {
    if (!profile?.id) return;

    setBusyKey(item.key);
    setError("");
    setInfo("");

    try {
      if (item.category === "master_ether" && !isAdmin) {
        setError("Réservé au Maître Ether.");
        return;
      }

      if (item.category !== "vip_plan" && item.category !== "master_ether") {
        if (!ownedKeys.has(item.key)) {
          setError("Tu dois acheter avant d’activer.");
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

      const upd = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (upd.error) throw new Error(upd.error.message);

      setProfile((p) => (p ? ({ ...p, ...patch } as any) : p));
      setInfo(`Activé : ${item.name} ✨`);
    } catch (e: any) {
      setError(e?.message || "Erreur activation.");
    } finally {
      setBusyKey(null);
    }
  }

  async function deactivateCategory(cat: "name_fx" | "badge" | "title" | "master_ether") {
    if (!profile?.id) return;

    setBusyKey(`off_${cat}`);
    setError("");
    setInfo("");

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

      const upd = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (upd.error) throw new Error(upd.error.message);

      setProfile((p) => (p ? ({ ...p, ...patch } as any) : p));
      setInfo("Désactivé ✅");
    } catch (e: any) {
      setError(e?.message || "Erreur désactivation.");
    } finally {
      setBusyKey(null);
    }
  }

  // VIP 7/30/90 (extends if already VIP)
  async function buyVip(plan: ShopItem) {
    if (!profile?.id) return;

    setBusyKey(plan.key);
    setError("");
    setInfo("");

    try {
      if ((profile.credits ?? 0) < plan.price) {
        setError("Crédits insuffisants.");
        return;
      }

      const days = Number(plan.meta?.days ?? 0);
      if (!days) {
        setError("Plan VIP invalide.");
        return;
      }

      const now = new Date();
      const currentExpiry = profile.vip_expires_at ? new Date(profile.vip_expires_at) : null;
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      const nextCredits = (profile.credits ?? 0) - plan.price;

      // VIP style auto (applied only if user has none active)
      const vipBadgeKey = "badge_vip_gold";
      const vipTitleKey = "title_private_host";

      const patch: any = {
        credits: nextCredits,
        vip_expires_at: next.toISOString(),
        active_badge_key: profile.active_badge_key || vipBadgeKey,
        active_title_key: profile.active_title_key || vipTitleKey,
      };

      const upd = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (upd.error) throw new Error(upd.error.message);

      setProfile((p) => (p ? ({ ...p, ...patch } as any) : p));
      setInfo(`VIP activé (${days} jours) 👑`);
    } catch (e: any) {
      setError(e?.message || "Erreur VIP.");
    } finally {
      setBusyKey(null);
    }
  }

  const effectsList = useMemo(() => {
    const base = effectsTab === "name_fx" ? nameFx : effectsTab === "badge" ? badges : titles;

    const q = query.trim().toLowerCase();
    const filtered = !q
      ? base
      : base.filter((it) =>
          `${it.name} ${it.description} ${it.vibe} ${it.rarity}`.toLowerCase().includes(q)
        );

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "price") return a.price - b.price;
      const ra = rarityRank[a.rarity] ?? 0;
      const rb = rarityRank[b.rarity] ?? 0;
      if (ra !== rb) return rb - ra;
      return a.price - b.price;
    });

    return sorted;
  }, [effectsTab, nameFx, badges, titles, query, sortKey]);

  return (
    <div className="space-y-6">
      {/* Buy Modal */}
      {modalOpen && modalItem ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Confirmer l’achat</div>
                <h2 className="mt-2 text-2xl font-black text-white">{modalItem.name}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">{modalItem.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={cx("rounded-full border px-3 py-1 text-xs font-black", rarityBadgeClass(modalItem.rarity))}>
                    {modalItem.rarity}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/70">
                    {modalItem.vibe}
                  </span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                    {modalItem.price} crédits
                  </span>
                </div>
              </div>

              <button onClick={closeModal} className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10" title="Fermer">
                <X className="h-4 w-4 text-white/80" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/80 hover:bg-white/10">
                Annuler
              </button>
              <button
                onClick={() => buy(modalItem)}
                disabled={busyKey === modalItem.key}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-3 text-sm font-black text-black hover:opacity-95 disabled:opacity-70"
              >
                <Check className="h-4 w-4" />
                {busyKey === modalItem.key ? "..." : "Acheter"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              <ShoppingBag className="h-3.5 w-3.5" />
              Boutique
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Effets & VIP</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Acheter → inventaire. Activer → pseudo stylé partout.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                {credits} crédits
              </span>
              <span className={cx("rounded-full border px-3 py-1 text-xs font-black",
                vipOk ? "border-amber-400/20 bg-amber-500/10 text-amber-200" : "border-white/10 bg-white/10 text-white/55"
              )}>
                {vipOk ? "VIP actif" : "Non VIP"}
              </span>
              {isAdmin ? (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-200">
                  Maître Ether
                </span>
              ) : null}
            </div>

            {profile ? (
              <div className="mt-6 rounded-[28px] border border-white/10 bg-black/30 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">Aperçu</div>
                <div className="mt-2">
                  <ProfileName profile={profile} size="lg" showTitle />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => deactivateCategory("name_fx")}
                    disabled={!activeNameFx}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
                      activeNameFx ? "border-white/10 bg-white/10 text-white/80 hover:bg-white/15" : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                    )}
                  >
                    <Power className="h-4 w-4" /> Off Nom
                  </button>

                  <button
                    onClick={() => deactivateCategory("badge")}
                    disabled={!activeBadge}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
                      activeBadge ? "border-white/10 bg-white/10 text-white/80 hover:bg-white/15" : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                    )}
                  >
                    <Power className="h-4 w-4" /> Off Badge
                  </button>

                  <button
                    onClick={() => deactivateCategory("title")}
                    disabled={!activeTitle}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
                      activeTitle ? "border-white/10 bg-white/10 text-white/80 hover:bg-white/15" : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                    )}
                  >
                    <Power className="h-4 w-4" /> Off Titre
                  </button>

                  {isAdmin ? (
                    <button
                      onClick={() => deactivateCategory("master_ether")}
                      disabled={!profile.master_title}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
                        profile.master_title ? "border-violet-400/20 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15" : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                      )}
                    >
                      <Power className="h-4 w-4" /> Off Ether
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/inventaire")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10"
            >
              <Gem className="h-4 w-4" /> Inventaire
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10"
            >
              <Shield className="h-4 w-4" /> Dashboard
            </button>

            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          <MainTabButton active={mainTab === "effects"} onClick={() => setMainTab("effects")} label="Effets" icon={<Sparkles className="h-4 w-4" />} />
          <MainTabButton active={mainTab === "vip"} onClick={() => setMainTab("vip")} label="VIP" icon={<Crown className="h-4 w-4" />} />
          <MainTabButton active={mainTab === "master"} onClick={() => setMainTab("master")} label="Maître Ether" icon={<Wand2 className="h-4 w-4" />} locked={!isAdmin} />
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{info}</div> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : mainTab === "effects" ? (
        <>
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <MiniTab active={effectsTab === "name_fx"} onClick={() => setEffectsTab("name_fx")} label="Nom" icon={<Sparkles className="h-4 w-4" />} />
                <MiniTab active={effectsTab === "badge"} onClick={() => setEffectsTab("badge")} label="Badge" icon={<Gem className="h-4 w-4" />} />
                <MiniTab active={effectsTab === "title"} onClick={() => setEffectsTab("title")} label="Titre" icon={<Zap className="h-4 w-4" />} />
              </div>

              <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:justify-end">
                <div className="relative w-full lg:max-w-sm">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Chercher..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-rose-400/35"
                  />
                </div>

                <button
                  onClick={() => setSortKey((s) => (s === "rarity" ? "price" : "rarity"))}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Tri: {sortKey === "rarity" ? "Rareté" : "Prix"}
                </button>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {effectsList.map((item) => {
              const owned = ownedKeys.has(item.key);
              const active = isActive(item);
              return (
                <ShopCard
                  key={item.key}
                  item={item}
                  owned={owned}
                  active={active}
                  busy={busyKey === item.key}
                  onBuy={() => openBuy(item)}
                  onActivate={() => activate(item)}
                  onDeactivate={() => deactivateCategory(item.category as any)}
                />
              );
            })}
          </div>
        </>
      ) : mainTab === "vip" ? (
        <>
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-white font-black text-xl">
              <Crown className="h-5 w-5 text-amber-200" /> VIP / Abonnements
            </div>
            <p className="mt-2 text-sm text-white/60">
              VIP = accès salons VIP + statut. L’achat prolonge la durée.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/65">
              <li>• Accès aux salons VIP</li>
              <li>• Bonus style VIP auto (badge + titre) si rien d’actif</li>
              <li>• Expiration cumulative</li>
            </ul>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vipPlans.slice().sort((a, b) => a.price - b.price).map((plan) => (
              <VipCard
                key={plan.key}
                plan={plan}
                credits={credits}
                busy={busyKey === plan.key}
                onBuy={() => buyVip(plan)}
              />
            ))}
          </div>
        </>
      ) : !isAdmin ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-2 font-black text-white/85">
            <Lock className="h-4 w-4" /> Réservé
          </div>
          <p className="mt-2 text-sm text-white/60">Les effets Ether sont réservés au Maître Ether.</p>
        </div>
      ) : (
        <>
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-white font-black text-xl">
              <Wand2 className="h-5 w-5 text-violet-200" /> Maître Ether
            </div>
            <p className="mt-2 text-sm text-white/60">
              Titres Ether appliqués directement sur ton profil.
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {masterEther.map((item) => (
              <ShopCard
                key={item.key}
                item={item}
                owned={true}
                active={isActive(item)}
                busy={busyKey === item.key}
                onBuy={undefined}
                onActivate={() => activate(item)}
                onDeactivate={() => deactivateCategory("master_ether")}
                forceMaster
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MainTabButton({
  active,
  onClick,
  label,
  icon,
  locked,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition",
        active ? "border-white/10 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
        locked && "opacity-60 cursor-not-allowed"
      )}
    >
      {icon} {label} {locked ? " 🔒" : ""}
    </button>
  );
}

function MiniTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition",
        active ? "border-white/10 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
      )}
    >
      {icon} {label}
    </button>
  );
}

function ShopCard({
  item,
  owned,
  active,
  busy,
  onBuy,
  onActivate,
  onDeactivate,
  forceMaster,
}: {
  item: ShopItem;
  owned: boolean;
  active: boolean;
  busy: boolean;
  onBuy?: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  forceMaster?: boolean;
}) {
  const canActivate = forceMaster ? true : owned;

  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
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
            {owned && !active && !forceMaster ? (
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/60">
                POSSÉDÉ
              </span>
            ) : null}
            {forceMaster ? (
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black text-violet-200">
                ETHER
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black text-white">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
          {item.category === "name_fx" ? (
            <Sparkles className="h-5 w-5 text-fuchsia-200" />
          ) : item.category === "badge" ? (
            <Gem className="h-5 w-5 text-cyan-200" />
          ) : item.category === "title" ? (
            <Zap className="h-5 w-5 text-rose-200" />
          ) : (
            <Wand2 className="h-5 w-5 text-violet-200" />
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">Preview</div>
        {item.category === "name_fx" ? (
          <div className={cx("mt-2 text-2xl font-black", item.previewClass || "text-white")}>Pseudo</div>
        ) : item.category === "badge" ? (
          <div className="mt-2"><span className={item.badgeClass || "text-white/70"}>{item.name}</span></div>
        ) : (
          <div className={cx("mt-2 text-xs font-black tracking-[0.22em] uppercase", item.previewClass || "text-white/70")}>
            {item.titleText || item.name}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-white/80">{forceMaster ? "Réservé Maître" : `${item.price} crédits`}</div>

        <div className="flex gap-2">
          {!forceMaster && !owned ? (
            <button
              type="button"
              onClick={onBuy}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2.5 text-sm font-black text-black hover:opacity-95 disabled:opacity-70"
            >
              <ShoppingBag className="h-4 w-4" /> Acheter
            </button>
          ) : active ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white/85 hover:bg-white/15 disabled:opacity-60"
            >
              <X className="h-4 w-4" /> Off
            </button>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              disabled={busy || !canActivate}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition disabled:opacity-60",
                canActivate
                  ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
                  : "border border-white/10 bg-white/5 text-white/45 cursor-not-allowed"
              )}
            >
              <Wand2 className="h-4 w-4" /> Activer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function VipCard({ plan, credits, busy, onBuy }: { plan: ShopItem; credits: number; busy: boolean; onBuy: () => void }) {
  const days = Number(plan.meta?.days ?? 0);
  const affordable = credits >= plan.price;

  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={cx("rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.16em]", rarityBadgeClass(plan.rarity))}>
            {plan.rarity}
          </span>
          <h3 className="mt-4 text-2xl font-black text-white">{plan.name}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{plan.description}</p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
          <Crown className="h-5 w-5 text-amber-200" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">Durée</div>
        <div className="mt-2 text-xl font-black text-white">{days} jours</div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-white/80">{plan.price} crédits</div>

        <button
          type="button"
          onClick={onBuy}
          disabled={busy || !affordable}
          className={cx(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition",
            affordable
              ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black hover:opacity-95"
              : "border border-white/10 bg-white/5 text-white/45 cursor-not-allowed",
            busy && "opacity-70"
          )}
        >
          <Crown className="h-4 w-4" />
          {busy ? "..." : affordable ? "Activer VIP" : "Crédits insuffisants"}
        </button>
      </div>
    </article>
  );
}
