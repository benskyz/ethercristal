"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Crown,
  Menu,
  RefreshCw,
  Shield,
  ShoppingBag,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  ensureProfileRecord,
  isVipActive,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";
import {
  EtherFXStyles,
  FXBadge,
  FXName,
  FXTitle,
  fxVariantFromKey,
} from "@/components/effects/EtherFX";

type InventoryItemRow = {
  id: string;
  user_id: string;
  item_key: string;
  item_type: string;
  equipped: boolean;
  meta: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

type ShopItemLite = {
  id: string;
  item_key: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  preview_style: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
};

type OwnedItem = {
  inventory: InventoryItemRow;
  shop: ShopItemLite | null;
  displayTitle: string;
  displayDescription: string;
  slot: "name" | "badge" | "title" | "other";
  variant: string;
  rarity: string;
  category: string;
  equipped: boolean;
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safeText(value: unknown, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function normalizeInventoryItem(row: Record<string, unknown>): InventoryItemRow {
  return {
    id: safeText(row.id),
    user_id: safeText(row.user_id),
    item_key: safeText(row.item_key),
    item_type: safeText(row.item_type, "effect"),
    equipped: Boolean(row.equipped),
    meta:
      row.meta && typeof row.meta === "object"
        ? (row.meta as Record<string, unknown>)
        : {},
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function normalizeShopItem(row: Record<string, unknown>): ShopItemLite {
  return {
    id: safeText(row.id),
    item_key: safeText(row.item_key),
    title: safeText(row.title, "Effet"),
    description: safeText(row.description, "Aucune description."),
    category: safeText(row.category, "effect"),
    rarity: safeText(row.rarity, "common"),
    preview_style: row.preview_style ? String(row.preview_style) : null,
    is_active: Boolean(row.is_active),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

function resolveSlot(category: string, itemType: string) {
  const raw = `${category} ${itemType}`.toLowerCase();

  if (raw.includes("name")) return "name" as const;
  if (raw.includes("badge")) return "badge" as const;
  if (raw.includes("title")) return "title" as const;
  return "other" as const;
}

function slotLabel(slot: OwnedItem["slot"]) {
  if (slot === "name") return "Nom";
  if (slot === "badge") return "Badge";
  if (slot === "title") return "Titre";
  return "Effet";
}

function rarityVariant(rarity: string) {
  const raw = rarity.toLowerCase();
  if (raw.includes("legend")) return "ember";
  if (raw.includes("epic")) return "void";
  if (raw.includes("rare")) return "crystal";
  if (raw.includes("obsidian")) return "obsidian";
  return "ether";
}

function FlashBanner({ flash }: { flash: FlashState }) {
  if (!flash) return null;

  return (
    <div
      className={cx(
        "rounded-[20px] border px-4 py-4 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
        flash.tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/20 bg-red-500/10 text-red-100"
      )}
    >
      {flash.text}
    </div>
  );
}

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="bg-gradient-to-r from-red-300/80 via-white/90 to-fuchsia-300/80 bg-clip-text text-[11px] font-black uppercase tracking-[0.35em] text-transparent">
            {title}
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
  );
}

function InventoryCard({
  item,
  busy,
  onEquip,
  onUnequip,
}: {
  item: OwnedItem;
  busy: boolean;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0b0b10] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-1 hover:border-red-400/18">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,0,90,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_26%)]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <FXName
              text={item.displayTitle}
              variant={item.variant}
              size="lg"
              className="truncate"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <FXBadge label={slotLabel(item.slot)} variant="crystal" />
              <FXBadge label={item.rarity} variant={rarityVariant(item.rarity)} />
              {item.equipped ? (
                <FXBadge
                  label="Équipé"
                  variant="ember"
                  icon={<Check className="h-3.5 w-3.5" />}
                />
              ) : null}
            </div>
          </div>

          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white/70">
            <Wand2 className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/58">
          {item.displayDescription}
        </p>

        <div className="mt-5 flex gap-3">
          {item.equipped ? (
            <button
              type="button"
              disabled={busy}
              onClick={onUnequip}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Déséquiper
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onEquip}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16 disabled:opacity-50"
            >
              {busy ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Équiper
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventairePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventoryRows, setInventoryRows] = useState<InventoryItemRow[]>([]);
  const [shopItems, setShopItems] = useState<ShopItemLite[]>([]);
  const [flash, setFlash] = useState<FlashState>(null);

  const vipActive = useMemo(() => isVipActive(profile), [profile]);
  const isAdmin = Boolean(profile?.is_admin);

  const ownedItems = useMemo<OwnedItem[]>(() => {
    const shopMap = new Map(shopItems.map((item) => [item.item_key, item]));

    return inventoryRows
      .map((inventory) => {
        const shop = shopMap.get(inventory.item_key) ?? null;
        const category = shop?.category || inventory.item_type || "effect";
        const slot = resolveSlot(category, inventory.item_type);
        const variant = fxVariantFromKey(
          shop?.preview_style || shop?.item_key || inventory.item_key || "ether"
        );

        const effectivelyEquipped =
          slot === "name"
            ? profile?.active_name_fx_key === inventory.item_key
            : slot === "badge"
            ? profile?.active_badge_key === inventory.item_key
            : slot === "title"
            ? profile?.active_title_key === inventory.item_key
            : inventory.equipped;

        return {
          inventory,
          shop,
          displayTitle: shop?.title || inventory.item_key,
          displayDescription:
            shop?.description || "Effet acheté dans ta boutique.",
          slot,
          variant,
          rarity: shop?.rarity || "common",
          category,
          equipped: effectivelyEquipped,
        };
      })
      .sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        return a.displayTitle.localeCompare(b.displayTitle);
      });
  }, [inventoryRows, shopItems, profile]);

  const equippedCount = useMemo(
    () => ownedItems.filter((item) => item.equipped).length,
    [ownedItems]
  );

  const groupedOwned = useMemo(() => {
    const groups = new Map<string, OwnedItem[]>();

    for (const item of ownedItems) {
      const key = item.slot;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    return [...groups.entries()].map(([slot, items]) => ({
      slot,
      label: slotLabel(slot as OwnedItem["slot"]),
      items,
    }));
  }, [ownedItems]);

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setFlash(null);

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/enter");
          return;
        }

        const nextProfile = await ensureProfileRecord(user);

        const [inventoryRes, shopRes] = await Promise.all([
          supabase
            .from("inventory_items")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase.from("shop_items").select("*"),
        ]);

        if (inventoryRes.error) throw inventoryRes.error;
        if (shopRes.error) throw shopRes.error;

        setProfile(nextProfile);
        setInventoryRows(
          ((inventoryRes.data ?? []) as Record<string, unknown>[]).map(
            normalizeInventoryItem
          )
        );
        setShopItems(
          ((shopRes.data ?? []) as Record<string, unknown>[]).map(normalizeShopItem)
        );
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger l’inventaire.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  async function syncEquipmentToProfile(next: {
    active_name_fx_key?: string | null;
    active_badge_key?: string | null;
    active_title_key?: string | null;
  }) {
    if (!profile) return;

    const supabase = requireSupabaseBrowserClient();

    const { error } = await supabase
      .from("profiles")
      .update(next)
      .eq("id", profile.id);

    if (error) throw error;

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            active_name_fx_key:
              next.active_name_fx_key !== undefined
                ? next.active_name_fx_key
                : prev.active_name_fx_key,
            active_badge_key:
              next.active_badge_key !== undefined
                ? next.active_badge_key
                : prev.active_badge_key,
            active_title_key:
              next.active_title_key !== undefined
                ? next.active_title_key
                : prev.active_title_key,
          }
        : prev
    );
  }

  async function handleEquip(item: OwnedItem) {
    if (!profile) return;

    try {
      setBusyKey(item.inventory.id);
      const supabase = requireSupabaseBrowserClient();

      if (item.slot === "name") {
        const sameSlotIds = ownedItems
          .filter((row) => row.slot === "name")
          .map((row) => row.inventory.id);

        if (sameSlotIds.length > 0) {
          await supabase
            .from("inventory_items")
            .update({ equipped: false })
            .in("id", sameSlotIds);
        }

        await supabase
          .from("inventory_items")
          .update({ equipped: true })
          .eq("id", item.inventory.id);

        await syncEquipmentToProfile({
          active_name_fx_key: item.inventory.item_key,
        });
      } else if (item.slot === "badge") {
        const sameSlotIds = ownedItems
          .filter((row) => row.slot === "badge")
          .map((row) => row.inventory.id);

        if (sameSlotIds.length > 0) {
          await supabase
            .from("inventory_items")
            .update({ equipped: false })
            .in("id", sameSlotIds);
        }

        await supabase
          .from("inventory_items")
          .update({ equipped: true })
          .eq("id", item.inventory.id);

        await syncEquipmentToProfile({
          active_badge_key: item.inventory.item_key,
        });
      } else if (item.slot === "title") {
        const sameSlotIds = ownedItems
          .filter((row) => row.slot === "title")
          .map((row) => row.inventory.id);

        if (sameSlotIds.length > 0) {
          await supabase
            .from("inventory_items")
            .update({ equipped: false })
            .in("id", sameSlotIds);
        }

        await supabase
          .from("inventory_items")
          .update({ equipped: true })
          .eq("id", item.inventory.id);

        await syncEquipmentToProfile({
          active_title_key: item.inventory.item_key,
        });
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .update({ equipped: true })
          .eq("id", item.inventory.id);

        if (error) throw error;
      }

      setFlash({
        tone: "success",
        text: `${item.displayTitle} équipé.`,
      });

      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’équiper cet item.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUnequip(item: OwnedItem) {
    if (!profile) return;

    try {
      setBusyKey(item.inventory.id);
      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("inventory_items")
        .update({ equipped: false })
        .eq("id", item.inventory.id);

      if (error) throw error;

      if (item.slot === "name" && profile.active_name_fx_key === item.inventory.item_key) {
        await syncEquipmentToProfile({ active_name_fx_key: null });
      }

      if (item.slot === "badge" && profile.active_badge_key === item.inventory.item_key) {
        await syncEquipmentToProfile({ active_badge_key: null });
      }

      if (item.slot === "title" && profile.active_title_key === item.inventory.item_key) {
        await syncEquipmentToProfile({ active_title_key: null });
      }

      setFlash({
        tone: "success",
        text: `${item.displayTitle} déséquipé.`,
      });

      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de déséquiper cet item.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement inventaire...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <EtherFXStyles />

      <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="relative min-h-screen lg:pl-[290px]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,20,20,0.20),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(170,50,170,0.12),transparent_35%),radial-gradient(circle_at_50%_5%,rgba(59,130,246,0.10),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)]" />
            <div className="absolute -left-24 top-16 h-[450px] w-[450px] rounded-full bg-gradient-to-r from-red-700/20 via-fuchsia-700/16 to-blue-700/12 blur-[160px]" />
            <div className="absolute right-8 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-red-600/16 via-pink-600/16 to-orange-600/14 blur-[150px]" />
          </div>

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
            <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-3 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>

              <button
                type="button"
                onClick={() => void loadPage(false)}
                className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
              >
                <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </button>
            </div>

            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-[34px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

                <div className="relative z-10">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    inventaire visuel
                  </div>

                  <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
                    Inventaire
                    <span className="block bg-gradient-to-r from-red-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                      équipe tes effets
                    </span>
                  </h1>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {profileDisplayName(profile)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      items <span className="font-black text-white">{ownedItems.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      équipés <span className="font-black text-white">{equippedCount}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {vipActive ? (
                      <FXBadge
                        label="VIP actif"
                        variant="obsidian"
                        icon={<Crown className="h-3.5 w-3.5" />}
                      />
                    ) : (
                      <FXBadge label="Standard" variant="ether" />
                    )}

                    {isAdmin ? (
                      <FXBadge
                        label="Admin"
                        variant="ember"
                        icon={<Shield className="h-3.5 w-3.5" />}
                      />
                    ) : null}
                  </div>
                </div>
              </section>

              <FlashBanner flash={flash} />

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  {groupedOwned.length === 0 ? (
                    <Panel title="Aucun item">
                      <div className="rounded-[24px] border border-red-500/12 bg-black/20 p-8 text-center">
                        <div className="text-2xl font-black text-white">
                          Ton inventaire est vide.
                        </div>
                        <div className="mt-3 text-sm text-white/52">
                          Passe par la boutique pour acheter tes effets.
                        </div>

                        <button
                          type="button"
                          onClick={() => router.push("/boutique")}
                          className="mt-6 inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Ouvrir boutique
                        </button>
                      </div>
                    </Panel>
                  ) : (
                    groupedOwned.map((group) => (
                      <Panel
                        key={group.slot}
                        title={group.label}
                        right={
                          <FXBadge
                            label={`${group.items.length} item(s)`}
                            variant="ruby"
                          />
                        }
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          {group.items.map((item) => (
                            <InventoryCard
                              key={item.inventory.id}
                              item={item}
                              busy={busyKey === item.inventory.id}
                              onEquip={() => void handleEquip(item)}
                              onUnequip={() => void handleUnequip(item)}
                            />
                          ))}
                        </div>
                      </Panel>
                    ))
                  )}
                </div>

                <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
                  <Panel
                    title="Prévisualisation active"
                    right={
                      <FXBadge
                        label={`${equippedCount} actif(s)`}
                        variant="crystal"
                      />
                    }
                  >
                    <div className="rounded-[26px] border border-red-500/12 bg-black/20 p-6">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                        rendu profil
                      </div>

                      <div className="mt-4">
                        <FXName
                          text={profileDisplayName(profile)}
                          variant={profile?.active_name_fx_key || "ether"}
                          size="xl"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile?.active_badge_key ? (
                          <FXBadge
                            label={profile.active_badge_key}
                            variant={profile.active_badge_key}
                            icon={<Sparkles className="h-3.5 w-3.5" />}
                          />
                        ) : null}

                        {profile?.master_title ? (
                          <FXTitle
                            label={profile.master_title}
                            variant={profile?.active_title_key || "void"}
                          />
                        ) : null}

                        {isAdmin ? (
                          <FXBadge
                            label="Admin"
                            variant="ember"
                            icon={<Shield className="h-3.5 w-3.5" />}
                          />
                        ) : null}
                      </div>
                    </div>
                  </Panel>

                  <Panel title="Résumé">
                    <div className="grid gap-4">
                      <div className="rounded-[22px] border border-red-500/12 bg-black/20 p-5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                          Nom équipé
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {profile?.active_name_fx_key || "Aucun"}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-red-500/12 bg-black/20 p-5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                          Badge équipé
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {profile?.active_badge_key || "Aucun"}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-red-500/12 bg-black/20 p-5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                          Titre équipé
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {profile?.active_title_key || "Aucun"}
                        </div>
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
