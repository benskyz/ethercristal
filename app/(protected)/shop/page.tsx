"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  AlertTriangle,
  Crown,
  Gem,
  Lock,
  Menu,
  RefreshCw,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

type profile_row = {
  id: string;
  email: string | null;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  credits: number;
  is_vip: boolean;
  is_admin: boolean;
  vip_expires_at: string | null;
  role: string;
  master_title: string;
  master_title_style: string | null;
  active_name_fx_key: string | null;
  active_badge_key: string | null;
  active_title_key: string | null;
  gender: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

type shop_item_row = {
  id: string;
  item_key: string;
  title: string;
  description: string;
  price: number;
  category: string;
  rarity: string;
  preview_style: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type inventory_item_row = {
  id: string;
  user_id: string;
  item_key: string;
  item_type: string;
  equipped: boolean;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type flash_state =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type owned_filter = "all" | "owned" | "not_owned" | "equipped";

type inventory_view_row = {
  inventory: inventory_item_row;
  item: shop_item_row | null;
  slot: string;
};

const profile_select = `
  id,
  email,
  pseudo,
  avatar_url,
  bio,
  credits,
  is_vip,
  is_admin,
  vip_expires_at,
  role,
  master_title,
  master_title_style,
  active_name_fx_key,
  active_badge_key,
  active_title_key,
  gender,
  is_verified,
  created_at,
  updated_at
`;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function as_record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }

  return {};
}

function sanitize_text(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function normalize_pseudo(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

function build_fallback_pseudo(email: string | null | undefined, user_id: string) {
  const base = email?.split("@")[0]?.trim() || `membre_${user_id.slice(0, 8)}`;
  return normalize_pseudo(base || "Membre Ether");
}

function vip_is_active(profile: profile_row | null) {
  if (!profile) return false;
  if (profile.is_admin) return true;
  if (profile.is_vip) return true;

  if (!profile.vip_expires_at) return false;

  const expires = new Date(profile.vip_expires_at).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

function item_cost_in_credits(item: shop_item_row) {
  return Math.max(0, Math.ceil(Number(item.price || 0)));
}

function item_requires_vip(item: shop_item_row) {
  const metadata = as_record(item.metadata);

  return Boolean(
    metadata.vip_required === true ||
      metadata.vip_only === true ||
      metadata.vipOnly === true
  );
}

function infer_slot_from_item(item: shop_item_row | null, inventory?: inventory_item_row | null) {
  const inventory_meta = as_record(inventory?.meta);
  const item_meta = as_record(item?.metadata);

  const direct_slot =
    sanitize_text(String(inventory_meta.slot ?? ""), "") ||
    sanitize_text(String(item_meta.slot ?? ""), "");

  if (direct_slot) return direct_slot.toLowerCase();

  const source =
    sanitize_text(item?.category, "") ||
    sanitize_text(inventory?.item_type, "") ||
    sanitize_text(item?.item_key, "") ||
    sanitize_text(inventory?.item_key, "");

  const lowered = source.toLowerCase();

  if (lowered.includes("badge")) return "badge";
  if (lowered.includes("title")) return "title";
  if (lowered.includes("name")) return "name";

  return lowered || "effect";
}

function slot_label(slot: string) {
  if (slot === "name") return "name fx";
  if (slot === "badge") return "badge";
  if (slot === "title") return "title";
  return slot || "effect";
}

function rarity_tone(rarity: string) {
  const clean = rarity.toLowerCase();

  if (clean === "legendary") return "red";
  if (clean === "epic") return "violet";
  if (clean === "rare") return "gold";
  return "default";
}

function price_label(item: shop_item_row) {
  return `${item_cost_in_credits(item)} crédits`;
}

async function get_connected_user() {
  const supabase = requireSupabaseBrowserClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

async function get_profile_record(user_id: string) {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(profile_select)
    .eq("id", user_id)
    .maybeSingle();

  if (error) throw error;

  return (data as profile_row | null) ?? null;
}

async function ensure_profile_record(user_id: string, email?: string | null) {
  const supabase = requireSupabaseBrowserClient();

  const existing = await get_profile_record(user_id);
  if (existing) return existing;

  const { error: upsert_error } = await supabase.from("profiles").upsert(
    {
      id: user_id,
      email: email ?? null,
      pseudo: build_fallback_pseudo(email, user_id),
      credits: 0,
      is_vip: false,
      is_admin: false,
      role: "member",
      master_title: "Aucun titre",
    },
    { onConflict: "id" }
  );

  if (upsert_error) throw upsert_error;

  const created = await get_profile_record(user_id);

  if (!created) {
    throw new Error("Impossible de créer le profil utilisateur.");
  }

  return created;
}

async function list_active_shop_items() {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("shop_items")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as any[]).map(
    (row): shop_item_row => ({
      id: String(row.id),
      item_key: sanitize_text(row.item_key),
      title: sanitize_text(row.title, "Item"),
      description: sanitize_text(row.description),
      price: Number(row.price ?? 0),
      category: sanitize_text(row.category, "effect"),
      rarity: sanitize_text(row.rarity, "common"),
      preview_style: row.preview_style ?? null,
      is_active: Boolean(row.is_active),
      metadata: as_record(row.metadata),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
    })
  );
}

async function list_inventory_items(user_id: string) {
  const supabase = requireSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map(
    (row): inventory_item_row => ({
      id: String(row.id),
      user_id: String(row.user_id),
      item_key: sanitize_text(row.item_key),
      item_type: sanitize_text(row.item_type, "effect"),
      equipped: Boolean(row.equipped),
      meta: as_record(row.meta),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
    })
  );
}

function Banner({ flash }: { flash: flash_state }) {
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

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const tone_class =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-white/75";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        tone_class
      )}
    >
      {children}
    </span>
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
    <section className="relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(190,20,20,0.08),rgba(255,0,90,0.05),rgba(255,255,255,0.01))]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
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

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const tone_class =
    tone === "red"
      ? "border-red-500/14 bg-red-950/10"
      : tone === "green"
      ? "border-emerald-500/14 bg-emerald-950/10"
      : tone === "gold"
      ? "border-amber-500/14 bg-amber-950/10"
      : tone === "violet"
      ? "border-fuchsia-500/14 bg-fuchsia-950/10"
      : "border-white/10 bg-black/20";

  return (
    <div
      className={cx(
        "rounded-[22px] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]",
        tone_class
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">
        {typeof value === "number" ? value.toLocaleString("fr-CA") : value}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();

  const [sidebar_open, set_sidebar_open] = useState(false);
  const [loading, set_loading] = useState(true);
  const [refreshing, set_refreshing] = useState(false);
  const [flash, set_flash] = useState<flash_state>(null);

  const [profile, set_profile] = useState<profile_row | null>(null);
  const [items, set_items] = useState<shop_item_row[]>([]);
  const [inventory, set_inventory] = useState<inventory_item_row[]>([]);

  const [search, set_search] = useState("");
  const [category_filter, set_category_filter] = useState("all");
  const [rarity_filter, set_rarity_filter] = useState("all");
  const [owned_filter, set_owned_filter] = useState<owned_filter>("all");

  const [buying_item_key, set_buying_item_key] = useState<string | null>(null);
  const [equipping_inventory_id, set_equipping_inventory_id] = useState<string | null>(null);
  const [unequipping_inventory_id, set_unequipping_inventory_id] = useState<string | null>(null);

  const vip_active = useMemo(() => vip_is_active(profile), [profile]);

  const item_by_key = useMemo(() => {
    return new Map(items.map((item) => [item.item_key, item]));
  }, [items]);

  const owned_item_keys = useMemo(() => {
    return new Set(inventory.map((entry) => entry.item_key));
  }, [inventory]);

  const inventory_view = useMemo<inventory_view_row[]>(() => {
    return inventory.map((entry) => {
      const item = item_by_key.get(entry.item_key) ?? null;
      return {
        inventory: entry,
        item,
        slot: infer_slot_from_item(item, entry),
      };
    });
  }, [inventory, item_by_key]);

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.category))).sort()];
  }, [items]);

  const rarities = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.rarity))).sort()];
  }, [items]);

  const filtered_items = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const owned = owned_item_keys.has(item.item_key);
      const equipped = inventory.some(
        (entry) => entry.item_key === item.item_key && entry.equipped
      );

      if (category_filter !== "all" && item.category !== category_filter) return false;
      if (rarity_filter !== "all" && item.rarity !== rarity_filter) return false;
      if (owned_filter === "owned" && !owned) return false;
      if (owned_filter === "not_owned" && owned) return false;
      if (owned_filter === "equipped" && !equipped) return false;

      if (!query) return true;

      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.rarity.toLowerCase().includes(query) ||
        item.item_key.toLowerCase().includes(query)
      );
    });
  }, [items, owned_item_keys, inventory, search, category_filter, rarity_filter, owned_filter]);

  const owned_count = inventory.length;
  const equipped_count = inventory.filter((entry) => entry.equipped).length;
  const vip_item_count = items.filter((item) => item_requires_vip(item)).length;

  const load_page = useCallback(
    async (first_load = false) => {
      try {
        if (first_load) set_loading(true);
        else set_refreshing(true);

        set_flash(null);

        const user = await get_connected_user();

        if (!user) {
          router.replace("/enter");
          return;
        }

        const next_profile = await ensure_profile_record(user.id, user.email ?? null);
        const [next_items, next_inventory] = await Promise.all([
          list_active_shop_items(),
          list_inventory_items(user.id),
        ]);

        set_profile(next_profile);
        set_items(next_items);
        set_inventory(next_inventory);
      } catch (error: any) {
        set_flash({
          tone: "error",
          text: error?.message || "Impossible de charger le store.",
        });
      } finally {
        set_loading(false);
        set_refreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void load_page(true);
  }, [load_page]);

  async function handle_buy(item: shop_item_row) {
    try {
      if (!profile) return;

      set_flash(null);

      if (owned_item_keys.has(item.item_key)) {
        throw new Error("Tu possèdes déjà cet item.");
      }

      if (item_requires_vip(item) && !profile.is_vip && !profile.is_admin) {
        throw new Error("Cet item est réservé aux membres VIP.");
      }

      if ((profile.credits ?? 0) < item_cost_in_credits(item)) {
        throw new Error("Crédits insuffisants.");
      }

      set_buying_item_key(item.item_key);

      const supabase = requireSupabaseBrowserClient();
      const { error } = await supabase.rpc("buy_shop_item", {
        p_item_key: item.item_key,
      });

      if (error) {
        if (String(error.code || "") === "42883") {
          throw new Error(
            'La fonction SQL "buy_shop_item" est manquante. Exécute le SQL placé sous ce fichier.'
          );
        }

        throw error;
      }

      await load_page(false);

      set_flash({
        tone: "success",
        text: `${item.title} acheté avec succès.`,
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible d’acheter cet item.",
      });
    } finally {
      set_buying_item_key(null);
    }
  }

  async function handle_equip(entry: inventory_item_row) {
    try {
      set_flash(null);
      set_equipping_inventory_id(entry.id);

      const supabase = requireSupabaseBrowserClient();
      const { error } = await supabase.rpc("equip_inventory_item", {
        p_inventory_item_id: entry.id,
      });

      if (error) {
        if (String(error.code || "") === "42883") {
          throw new Error(
            'La fonction SQL "equip_inventory_item" est manquante. Exécute le SQL placé sous ce fichier.'
          );
        }

        throw error;
      }

      await load_page(false);

      const item = item_by_key.get(entry.item_key);
      set_flash({
        tone: "success",
        text: `${item?.title || entry.item_key} équipé.`,
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible d’équiper cet item.",
      });
    } finally {
      set_equipping_inventory_id(null);
    }
  }

  async function handle_unequip(entry: inventory_item_row) {
    try {
      set_flash(null);
      set_unequipping_inventory_id(entry.id);

      const supabase = requireSupabaseBrowserClient();
      const { error } = await supabase.rpc("unequip_inventory_item", {
        p_inventory_item_id: entry.id,
      });

      if (error) {
        if (String(error.code || "") === "42883") {
          throw new Error(
            'La fonction SQL "unequip_inventory_item" est manquante. Exécute le SQL placé sous ce fichier.'
          );
        }

        throw error;
      }

      await load_page(false);

      const item = item_by_key.get(entry.item_key);
      set_flash({
        tone: "success",
        text: `${item?.title || entry.item_key} déséquipé.`,
      });
    } catch (error: any) {
      set_flash({
        tone: "error",
        text: error?.message || "Impossible de déséquiper cet item.",
      });
    } finally {
      set_unequipping_inventory_id(null);
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
            Shop...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <Sidebar open={sidebar_open} onClose={() => set_sidebar_open(false)} />

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
              onClick={() => set_sidebar_open(true)}
              className="inline-flex items-center gap-3 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            <button
              type="button"
              onClick={() => void load_page(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[20px] border border-red-500/16 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"
            >
              <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[30px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />
              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    store technique
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Shop
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{profile?.pseudo || "Membre Ether"}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits <span className="font-black text-white">{profile?.credits ?? 0}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      possédés <span className="font-black text-white">{owned_count}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile?.is_admin ? (
                      <Tag tone="red">
                        <Shield className="h-3.5 w-3.5" />
                        admin
                      </Tag>
                    ) : null}

                    {vip_active ? (
                      <Tag tone="gold">
                        <Crown className="h-3.5 w-3.5" />
                        vip
                      </Tag>
                    ) : (
                      <Tag>
                        <Lock className="h-3.5 w-3.5" />
                        standard
                      </Tag>
                    )}

                    <Tag tone="violet">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {items.length} items
                    </Tag>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/boutique")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Boutique
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/inventaire")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-500/16"
                  >
                    <Wand2 className="h-4 w-4" />
                    Inventaire
                  </button>

                  <button
                    type="button"
                    onClick={() => void load_page(false)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16 disabled:opacity-60"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>
                </div>
              </div>
            </section>

            <Banner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Crédits"
                value={profile?.credits ?? 0}
                icon={<Gem className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Objets possédés"
                value={owned_count}
                icon={<ShoppingBag className="h-4 w-4" />}
                tone="violet"
              />
              <StatCard
                label="Objets équipés"
                value={equipped_count}
                icon={<Sparkles className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="Objets VIP"
                value={vip_item_count}
                icon={<Crown className="h-4 w-4" />}
                tone="red"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Filtres" right={<Tag>{filtered_items.length} visibles</Tag>}>
                <div className="grid gap-4 xl:grid-cols-[1.2fr_repeat(3,0.6fr)]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(event) => set_search(event.target.value)}
                      placeholder="Recherche item, catégorie, rareté..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <select
                    value={category_filter}
                    onChange={(event) => set_category_filter(event.target.value)}
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                  >
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {value === "all" ? "Catégories" : value}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rarity_filter}
                    onChange={(event) => set_rarity_filter(event.target.value)}
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                  >
                    {rarities.map((value) => (
                      <option key={value} value={value}>
                        {value === "all" ? "Raretés" : value}
                      </option>
                    ))}
                  </select>

                  <select
                    value={owned_filter}
                    onChange={(event) => set_owned_filter(event.target.value as owned_filter)}
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                  >
                    <option value="all">Tous</option>
                    <option value="owned">Possédés</option>
                    <option value="not_owned">Non possédés</option>
                    <option value="equipped">Équipés</option>
                  </select>
                </div>
              </Panel>

              <Panel title="Effets actifs">
                <div className="grid gap-4">
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                      active_name_fx_key
                    </div>
                    <div className="mt-2 text-lg font-black text-white">
                      {profile?.active_name_fx_key || "Aucun"}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                      active_badge_key
                    </div>
                    <div className="mt-2 text-lg font-black text-white">
                      {profile?.active_badge_key || "Aucun"}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                      active_title_key
                    </div>
                    <div className="mt-2 text-lg font-black text-white">
                      {profile?.active_title_key || "Aucun"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile?.active_name_fx_key ? (
                      <Tag tone="violet">{profile.active_name_fx_key}</Tag>
                    ) : null}
                    {profile?.active_badge_key ? (
                      <Tag tone="gold">{profile.active_badge_key}</Tag>
                    ) : null}
                    {profile?.active_title_key ? (
                      <Tag tone="green">{profile.active_title_key}</Tag>
                    ) : null}
                    {!profile?.active_name_fx_key &&
                    !profile?.active_badge_key &&
                    !profile?.active_title_key ? (
                      <Tag>aucun effet actif</Tag>
                    ) : null}
                  </div>
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Grille shop" right={<Tag tone="gold">{items.length} total</Tag>}>
                {filtered_items.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun item trouvé avec ces filtres.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filtered_items.map((item) => {
                      const owned = owned_item_keys.has(item.item_key);
                      const equipped = inventory.some(
                        (entry) => entry.item_key === item.item_key && entry.equipped
                      );
                      const vip_locked = item_requires_vip(item) && !vip_active;
                      const missing_credits =
                        (profile?.credits ?? 0) < item_cost_in_credits(item);
                      const buying = buying_item_key === item.item_key;

                      return (
                        <article
                          key={item.id}
                          className="rounded-[24px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xl font-black tracking-[-0.02em] text-white">
                                {item.title}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Tag tone={rarity_tone(item.rarity) as any}>{item.rarity}</Tag>
                                <Tag>{item.category}</Tag>
                                {item.preview_style ? (
                                  <Tag tone="violet">{item.preview_style}</Tag>
                                ) : null}
                                {item_requires_vip(item) ? (
                                  <Tag tone="gold">
                                    <Crown className="h-3.5 w-3.5" />
                                    vip
                                  </Tag>
                                ) : null}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-[0.20em] text-white/34">
                                prix
                              </div>
                              <div className="mt-2 text-lg font-black text-white">
                                {price_label(item)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 text-sm leading-6 text-white/58">
                            {item.description || "Aucune description."}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {owned ? (
                              <Tag tone="green">possédé</Tag>
                            ) : vip_locked ? (
                              <Tag tone="red">
                                <Lock className="h-3.5 w-3.5" />
                                verrouillé vip
                              </Tag>
                            ) : missing_credits ? (
                              <Tag tone="red">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                crédits insuffisants
                              </Tag>
                            ) : (
                              <Tag tone="green">achetable</Tag>
                            )}

                            {equipped ? <Tag tone="violet">équipé</Tag> : null}
                          </div>

                          <div className="mt-5">
                            <button
                              type="button"
                              disabled={owned || vip_locked || missing_credits || buying}
                              onClick={() => void handle_buy(item)}
                              className={cx(
                                "inline-flex w-full items-center justify-center gap-2 rounded-[18px] border px-4 py-4 text-sm font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-55",
                                owned
                                  ? "border-white/10 bg-white/[0.04] text-white/60"
                                  : vip_locked || missing_credits
                                  ? "border-red-400/18 bg-red-500/10 text-red-100"
                                  : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16"
                              )}
                            >
                              {buying ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingBag className="h-4 w-4" />
                              )}

                              {owned
                                ? "Déjà possédé"
                                : vip_locked
                                ? "Réservé VIP"
                                : missing_credits
                                ? "Crédits insuffisants"
                                : "Acheter"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <div className="space-y-6">
                <Panel title="Panneau inventaire rapide" right={<Tag tone="violet">{owned_count} items</Tag>}>
                  {inventory_view.length === 0 ? (
                    <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                      Aucun item possédé pour le moment.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {inventory_view.map((entry) => {
                        const title = entry.item?.title || entry.inventory.item_key;
                        const slot = entry.slot;
                        const equipping = equipping_inventory_id === entry.inventory.id;
                        const unequipping = unequipping_inventory_id === entry.inventory.id;

                        return (
                          <div
                            key={entry.inventory.id}
                            className="rounded-[20px] border border-red-500/10 bg-black/20 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-base font-black text-white">{title}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/36">
                                  {slot_label(slot)}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {entry.item ? (
                                    <Tag tone={rarity_tone(entry.item.rarity) as any}>
                                      {entry.item.rarity}
                                    </Tag>
                                  ) : null}

                                  {entry.inventory.equipped ? (
                                    <Tag tone="green">
                                      <Zap className="h-3.5 w-3.5" />
                                      équipé
                                    </Tag>
                                  ) : (
                                    <Tag>non équipé</Tag>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                disabled={entry.inventory.equipped || equipping}
                                onClick={() => void handle_equip(entry.inventory)}
                                className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 disabled:opacity-55"
                              >
                                {equipping ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                Équiper
                              </button>

                              <button
                                type="button"
                                disabled={!entry.inventory.equipped || unequipping}
                                onClick={() => void handle_unequip(entry.inventory)}
                                className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 disabled:opacity-55"
                              >
                                {unequipping ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wand2 className="h-4 w-4" />
                                )}
                                Déséquiper
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
