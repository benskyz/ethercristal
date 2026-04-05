"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Gem,
  Shield,
  ShoppingBag,
  Sparkles,
  Wand2,
  Zap,
  Check,
  X,
  RefreshCw,
  Lock,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { SHOP, getItemsByCategory, getShopItemByKey, rarityBadgeClass, ShopItem } from "@/lib/shop";
import ProfileName from "@/components/ProfileName";

const supabase = requireSupabaseBrowserClient();

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  credits?: number | null;
  is_admin?: boolean | null;
  role?: string | null;

  active_name_fx_key?: string | null;
  active_badge_key?: string | null;
  active_title_key?: string | null;

  master_title?: string | null;
  master_title_style?: string | null;

  vip_expires_at?: string | null;
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

type Tab = "effects" | "vip" | "master";

export default function BoutiquePage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("effects");
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

  const ownedKeys = useMemo(() => new Set(inventory.map((x) => x.item_key)), [inventory]);

  const effects = useMemo(() => {
    return [
      ...getItemsByCategory("name_fx"),
      ...getItemsByCategory("badge"),
      ...getItemsByCategory("title"),
    ];
  }, []);

  const vipPlans = useMemo(() => getItemsByCategory("vip_plan"), []);
  const masterEther = useMemo(() => getItemsByCategory("master_ether"), []);

  async function loadAll() {
    setLoading(true);
    setError("");
    setInfo("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/enter");
      return;
    }

    const [pRes, invRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, pseudo, credits, is_admin, role, active_name_fx_key, active_badge_key, active_title_key, master_title, master_title_style, vip_expires_at"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("inventory_items")
        .select("id, user_id, item_key, equipped")
        .eq("user_id", user.id),
    ]);

    if (pRes.error) setError(pRes.error.message);
    else setProfile((pRes.data as ProfileRow) ?? null);

    if (invRes.error) setError((prev) => prev || invRes.error!.message);
    else setInventory((invRes.data ?? []) as InventoryRow[]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function addToInventoryIfMissing(item: ShopItem) {
    if (!profile?.id) return;
    if (ownedKeys.has(item.key)) return;

    const ins = await supabase.from("inventory_items").insert({
      user_id: profile.id,
      item_key: item.key,
      equipped: false,
    });

    if (ins.error) throw new Error(ins.error.message);

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

      setProfile((p) => (p ? { ...p, credits: nextCredits } : p));
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
      if (item.requiresMaster && !isAdmin) {
        setError("Réservé au Maître Ether.");
        return;
      }

      // si item public => doit être possédé
      const mustOwn = item.category !== "master_ether" && item.category !== "vip_plan";
      if (mustOwn && !ownedKeys.has(item.key)) {
        setError("Tu dois acheter avant d’activer.");
        return;
      }

      // Active dans profiles (1 seul par type)
      const patch: Partial<ProfileRow> = {};

      if (item.category === "name_fx") patch.active_name_fx_key = item.key;
      if (item.category === "badge") patch.active_badge_key = item.key;
      if (item.category === "title") patch.active_title_key = item.key;

      if (item.category === "master_ether") {
        // Titre perso maître
        patch.master_title = item.titleText ?? item.name;
        patch.master_title_style = item.previewClass ?? "text-white/70";
      }

      const upd = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (upd.error) throw new Error(upd.error.message);

      setProfile((p) => (p ? { ...p, ...patch } : p));
      setInfo(`Activé : ${item.name} ✨`);
    } catch (e: any) {
      setError(e?.message || "Erreur activation.");
    } finally {
      setBusyKey(null);
    }
  }

  async function buyVip(plan: ShopItem) {
    if (!profile?.id) return;

    setBusyKey(plan.key);
    setError("");
    setInfo("");

    try {
      if (plan.category !== "vip_plan") return;

      if ((profile.credits ?? 0) < plan.price) {
        setError("Crédits insuffisants.");
        return;
      }

      const days = Number(plan.meta?.days ?? 0);
      if (!days) {
        setError("Plan VIP invalide.");
        return;
      }

      // calc new expiry
      const now = new Date();
      const currentExpiry = profile.vip_expires_at ? new Date(profile.vip_expires_at) : null;
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      const nextCredits = (profile.credits ?? 0) - plan.price;

      const upd = await supabase
        .from("profiles")
        .update({ credits: nextCredits, vip_expires_at: next.toISOString() })
        .eq("id", profile.id);

      if (upd.error) throw new Error(upd.error.message);

      setProfile((p) => (p ? { ...p, credits: nextCredits, vip_expires_at: next.toISOString() } : p));
      setInfo(`VIP activé (${days} jours) 👑`);
    } catch (e: any) {
      setError(e?.message || "Erreur VIP.");
    } finally {
      setBusyKey(null);
    }
  }

  function previewIcon(item: ShopItem) {
    if (item.category === "vip_plan") return <Crown className="h-5 w-5 text-amber-200" />;
    if (item.category === "name_fx") return <Sparkles className="h-5 w-5 text-fuchsia-200" />;
    if (item.category === "badge") return <Gem className="h-5 w-5 text-cyan-200" />;
    if (item.category === "title") return <Zap className="h-5 w-5 text-rose-200" />;
    if (item.category === "master_ether") return <Wand2 className="h-5 w-5 text-violet-200" />;
    return <ShoppingBag className="h-5 w-5 text-white/70" />;
  }

  const vipStatus = useMemo(() => {
    if (!profile?.vip_expires_at) return "Non VIP";
    const exp = new Date(profile.vip_expires_at);
    if (Number.isNaN(exp.getTime())) return "Non VIP";
    return exp > new Date() ? `VIP jusqu’au ${exp.toLocaleDateString("fr-CA")}` : "VIP expiré";
  }, [profile?.vip_expires_at]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              <ShoppingBag className="h-3.5 w-3.5" />
              Shop
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Boutique & VIP
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Effets premium, badges, titres… et accès VIP. Activation = affichage partout.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                {credits} crédits
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                {vipStatus}
              </span>
              {isAdmin ? (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-200">
                  Maître Ether
                </span>
              ) : null}
            </div>

            {/* Preview name (uses ProfileName) */}
            {profile ? (
              <div className="mt-6 rounded-[28px] border border-white/10 bg-black/30 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">Aperçu</div>
                <div className="mt-2">
                  <ProfileName profile={profile} size="lg" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10"
            >
              <Shield className="h-4 w-4" />
              Dashboard
            </button>

            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/85 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          <TabButton active={tab === "effects"} onClick={() => setTab("effects")} label="Effets" />
          <TabButton active={tab === "vip"} onClick={() => setTab("vip")} label="VIP" />
          <TabButton
            active={tab === "master"}
            onClick={() => setTab("master")}
            label="Maître Ether"
            locked={!isAdmin}
          />
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

      {/* Modal achat */}
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

              <button
                onClick={closeModal}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                title="Fermer"
              >
                <X className="h-4 w-4 text-white/80" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/80 hover:bg-white/10"
              >
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

      {/* CONTENT */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : tab === "effects" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {effects.map((item) => (
            <ItemCard
              key={item.key}
              item={item}
              profile={profile}
              owned={ownedKeys.has(item.key)}
              busy={busyKey === item.key}
              onBuy={() => openBuy(item)}
              onActivate={() => activate(item)}
              icon={previewIcon(item)}
            />
          ))}
        </div>
      ) : tab === "vip" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vipPlans.map((plan) => (
            <VipCard
              key={plan.key}
              plan={plan}
              credits={credits}
              busy={busyKey === plan.key}
              onBuy={() => buyVip(plan)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!isAdmin ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-2 text-white/80 font-black">
                <Lock className="h-4 w-4" />
                Réservé
              </div>
              <p className="mt-2 text-sm text-white/60">
                Les titres Ether sont réservés au Maître Ether.
              </p>
            </div>
          ) : (
            masterEther.map((item) => (
              <ItemCard
                key={item.key}
                item={item}
                profile={profile}
                owned={true}
                busy={busyKey === item.key}
                onBuy={undefined}
                onActivate={() => activate(item)}
                icon={previewIcon(item)}
                forceMaster
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  locked,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      className={cx(
        "rounded-2xl border px-4 py-2 text-sm font-black transition",
        active
          ? "border-white/10 bg-white/15 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
        locked && "opacity-60 cursor-not-allowed"
      )}
    >
      {label}
      {locked ? " 🔒" : ""}
    </button>
  );
}

function ItemCard({
  item,
  profile,
  owned,
  busy,
  onBuy,
  onActivate,
  icon,
  forceMaster,
}: {
  item: ShopItem;
  profile: any;
  owned: boolean;
  busy: boolean;
  onBuy?: () => void;
  onActivate: () => void;
  icon: React.ReactNode;
  forceMaster?: boolean;
}) {
  const active =
    (item.category === "name_fx" && profile?.active_name_fx_key === item.key) ||
    (item.category === "badge" && profile?.active_badge_key === item.key) ||
    (item.category === "title" && profile?.active_title_key === item.key) ||
    (item.category === "master_ether" && profile?.master_title === item.titleText);

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
          </div>

          <h3 className="mt-4 text-2xl font-black text-white">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
          {icon}
        </div>
      </div>

      {/* preview */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">Preview</div>
        {item.category === "name_fx" ? (
          <div className={cx("mt-2 text-2xl font-black", item.previewClass || "text-white")}>
            {profile?.pseudo || "Membre"}
          </div>
        ) : item.category === "badge" ? (
          <div className="mt-2">
            <span className={item.badgeClass || "text-white/70"}>{item.name}</span>
          </div>
        ) : item.category === "title" ? (
          <div className="mt-2 text-xs font-black tracking-[0.22em] uppercase text-white/70">
            {item.titleText}
          </div>
        ) : (
          <div className={cx("mt-2 text-xs font-black tracking-[0.22em] uppercase", item.previewClass || "text-white/70")}>
            {item.titleText || item.name}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-white/80">
          {forceMaster ? "Réservé Maître" : `${item.price} crédits`}
        </div>

        <div className="flex gap-2">
          {!forceMaster && !owned ? (
            <button
              type="button"
              onClick={onBuy}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-2.5 text-sm font-black text-black hover:opacity-95 disabled:opacity-70"
            >
              <ShoppingBag className="h-4 w-4" />
              Acheter
            </button>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              disabled={busy || active}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition disabled:opacity-60",
                active
                  ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  : "border border-white/10 bg-white/10 text-white/85 hover:bg-white/15"
              )}
            >
              <Wand2 className="h-4 w-4" />
              {active ? "Actif" : "Activer"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function VipCard({
  plan,
  credits,
  busy,
  onBuy,
}: {
  plan: ShopItem;
  credits: number;
  busy: boolean;
  onBuy: () => void;
}) {
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

function previewIcon(item: ShopItem) {
  if (item.category === "vip_plan") return <Crown className="h-5 w-5 text-amber-200" />;
  if (item.category === "name_fx") return <Sparkles className="h-5 w-5 text-fuchsia-200" />;
  if (item.category === "badge") return <Gem className="h-5 w-5 text-cyan-200" />;
  if (item.category === "title") return <Zap className="h-5 w-5 text-rose-200" />;
  if (item.category === "master_ether") return <Wand2 className="h-5 w-5 text-violet-200" />;
  return <ShoppingBag className="h-5 w-5 text-white/70" />;
}
