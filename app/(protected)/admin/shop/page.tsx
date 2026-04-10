"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import {
  Check,
  Crown,
  Gem,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

type AdminProfile = {
  id: string;
  pseudo: string;
  credits: number;
  isVip: boolean;
  isAdmin: boolean;
  vipExpiresAt: string | null;
  role: string;
  masterTitle: string;
};

type ShopItemRow = {
  id: string;
  itemKey: string;
  title: string;
  description: string;
  price: number;
  category: string;
  rarity: string;
  isActive: boolean;
  vipOnly: boolean;
  schema: "snake" | "camel";
  table: "shop_items" | "boutique_items";
};

type FlashState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FilterValue = "all" | "active" | "inactive" | "vip";
type ItemForm = {
  id: string | null;
  itemKey: string;
  title: string;
  description: string;
  price: string;
  category: string;
  rarity: string;
  isActive: boolean;
  vipOnly: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeText(value: string | null | undefined, fallback = "") {
  const clean = (value || "").trim();
  return clean || fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function isSchemaMismatch(error: any) {
  const code = error?.code;
  return code === "42703" || code === "42P01";
}

async function loadAdminProfileCompat(userId: string): Promise<AdminProfile | null> {
  const supabase = requireSupabaseBrowserClient();

  const snake = await supabase
    .from("profiles")
    .select(
      "id, pseudo, credits, is_vip, is_admin, vip_expires_at, role, master_title"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!snake.error && snake.data) {
    return {
      id: snake.data.id,
      pseudo: sanitizeText(snake.data.pseudo, "Membre Ether"),
      credits: Number(snake.data.credits ?? 0),
      isVip: Boolean(snake.data.is_vip),
      isAdmin: Boolean(snake.data.is_admin),
      vipExpiresAt: snake.data.vip_expires_at ?? null,
      role: sanitizeText(snake.data.role, "member"),
      masterTitle: sanitizeText(snake.data.master_title, "Aucun titre"),
    };
  }

  if (snake.error && !isSchemaMismatch(snake.error)) {
    throw snake.error;
  }

  const camel = await supabase
    .from("profiles")
    .select(
      'id, username, "etherBalance", "isPremium", "isAdmin", "premiumExpiresAt", role, "masterTitle"'
    )
    .eq("id", userId)
    .maybeSingle();

  if (!camel.error && camel.data) {
    return {
      id: camel.data.id,
      pseudo: sanitizeText(camel.data.username, "Membre Ether"),
      credits: Number(camel.data.etherBalance ?? 0),
      isVip: Boolean(camel.data.isPremium),
      isAdmin: Boolean(camel.data.isAdmin),
      vipExpiresAt: camel.data.premiumExpiresAt ?? null,
      role: sanitizeText(camel.data.role, "member"),
      masterTitle: sanitizeText(camel.data.masterTitle, "Aucun titre"),
    };
  }

  if (camel.error && !isSchemaMismatch(camel.error)) {
    throw camel.error;
  }

  return null;
}

async function loadShopItemsCompat(): Promise<ShopItemRow[]> {
  const supabase = requireSupabaseBrowserClient();

  const attempts = [
    {
      table: "shop_items" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("shop_items")
          .select(
            "id, item_key, title, description, price, category, rarity, is_active, vip_only"
          )
          .order("title", { ascending: true }),
      map: (row: any): ShopItemRow => ({
        id: String(row.id),
        itemKey: sanitizeText(row.item_key, ""),
        title: sanitizeText(row.title, "Item"),
        description: sanitizeText(row.description, ""),
        price: Number(row.price ?? 0),
        category: sanitizeText(row.category, "general"),
        rarity: sanitizeText(row.rarity, "standard"),
        isActive: Boolean(row.is_active),
        vipOnly: Boolean(row.vip_only),
        schema: "snake",
        table: "shop_items",
      }),
    },
    {
      table: "shop_items" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("shop_items")
          .select(
            'id, "itemKey", title, description, price, category, rarity, "isActive", "vipOnly"'
          )
          .order("title", { ascending: true }),
      map: (row: any): ShopItemRow => ({
        id: String(row.id),
        itemKey: sanitizeText(row.itemKey, ""),
        title: sanitizeText(row.title, "Item"),
        description: sanitizeText(row.description, ""),
        price: Number(row.price ?? 0),
        category: sanitizeText(row.category, "general"),
        rarity: sanitizeText(row.rarity, "standard"),
        isActive: Boolean(row.isActive),
        vipOnly: Boolean(row.vipOnly),
        schema: "camel",
        table: "shop_items",
      }),
    },
    {
      table: "boutique_items" as const,
      schema: "snake" as const,
      query: () =>
        supabase
          .from("boutique_items")
          .select(
            "id, item_key, title, description, price, category, rarity, is_active, vip_only"
          )
          .order("title", { ascending: true }),
      map: (row: any): ShopItemRow => ({
        id: String(row.id),
        itemKey: sanitizeText(row.item_key, ""),
        title: sanitizeText(row.title, "Item"),
        description: sanitizeText(row.description, ""),
        price: Number(row.price ?? 0),
        category: sanitizeText(row.category, "general"),
        rarity: sanitizeText(row.rarity, "standard"),
        isActive: Boolean(row.is_active),
        vipOnly: Boolean(row.vip_only),
        schema: "snake",
        table: "boutique_items",
      }),
    },
    {
      table: "boutique_items" as const,
      schema: "camel" as const,
      query: () =>
        supabase
          .from("boutique_items")
          .select(
            'id, "itemKey", title, description, price, category, rarity, "isActive", "vipOnly"'
          )
          .order("title", { ascending: true }),
      map: (row: any): ShopItemRow => ({
        id: String(row.id),
        itemKey: sanitizeText(row.itemKey, ""),
        title: sanitizeText(row.title, "Item"),
        description: sanitizeText(row.description, ""),
        price: Number(row.price ?? 0),
        category: sanitizeText(row.category, "general"),
        rarity: sanitizeText(row.rarity, "standard"),
        isActive: Boolean(row.isActive),
        vipOnly: Boolean(row.vipOnly),
        schema: "camel",
        table: "boutique_items",
      }),
    },
  ];

  for (const attempt of attempts) {
    const res = await attempt.query();
    if (!res.error) {
      return ((res.data ?? []) as any[]).map(attempt.map);
    }
    if (!isSchemaMismatch(res.error)) {
      throw res.error;
    }
  }

  return [];
}

async function createShopItem(
  payload: ItemForm,
  target: { table: "shop_items" | "boutique_items"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();
  const price = Number(payload.price || 0);

  if (target.schema === "snake") {
    const res = await supabase.from(target.table).insert({
      item_key: payload.itemKey,
      title: payload.title,
      description: payload.description,
      price,
      category: payload.category,
      rarity: payload.rarity,
      is_active: payload.isActive,
      vip_only: payload.vipOnly,
    });

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase.from(target.table).insert({
    itemKey: payload.itemKey,
    title: payload.title,
    description: payload.description,
    price,
    category: payload.category,
    rarity: payload.rarity,
    isActive: payload.isActive,
    vipOnly: payload.vipOnly,
  });

  if (res.error) throw res.error;
}

async function updateShopItem(
  payload: ItemForm,
  target: { table: "shop_items" | "boutique_items"; schema: "snake" | "camel" }
) {
  const supabase = requireSupabaseBrowserClient();
  const price = Number(payload.price || 0);

  if (!payload.id) throw new Error("ID item manquant.");

  if (target.schema === "snake") {
    const res = await supabase
      .from(target.table)
      .update({
        item_key: payload.itemKey,
        title: payload.title,
        description: payload.description,
        price,
        category: payload.category,
        rarity: payload.rarity,
        is_active: payload.isActive,
        vip_only: payload.vipOnly,
      })
      .eq("id", payload.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(target.table)
    .update({
      itemKey: payload.itemKey,
      title: payload.title,
      description: payload.description,
      price,
      category: payload.category,
      rarity: payload.rarity,
      isActive: payload.isActive,
      vipOnly: payload.vipOnly,
    })
    .eq("id", payload.id);

  if (res.error) throw res.error;
}

async function toggleItemActive(item: ShopItemRow, nextValue: boolean) {
  const supabase = requireSupabaseBrowserClient();

  if (item.schema === "snake") {
    const res = await supabase
      .from(item.table)
      .update({ is_active: nextValue })
      .eq("id", item.id);

    if (res.error) throw res.error;
    return;
  }

  const res = await supabase
    .from(item.table)
    .update({ isActive: nextValue })
    .eq("id", item.id);

  if (res.error) throw res.error;
}

async function deleteItem(item: ShopItemRow) {
  const supabase = requireSupabaseBrowserClient();
  const res = await supabase.from(item.table).delete().eq("id", item.id);
  if (res.error) throw res.error;
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "gold" | "violet";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-white/70";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
        toneClass
      )}
    >
      {children}
    </span>
  );
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
  const toneClass =
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
        toneClass
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

export default function AdminShopPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [flash, setFlash] = useState<FlashState>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [targetTable, setTargetTable] = useState<"shop_items" | "boutique_items">(
    "shop_items"
  );
  const [targetSchema, setTargetSchema] = useState<"snake" | "camel">("snake");
  const [form, setForm] = useState<ItemForm>({
    id: null,
    itemKey: "",
    title: "",
    description: "",
    price: "0",
    category: "effects",
    rarity: "standard",
    isActive: true,
    vipOnly: false,
  });

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filter === "active" && !item.isActive) return false;
      if (filter === "inactive" && item.isActive) return false;
      if (filter === "vip" && !item.vipOnly) return false;

      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        item.itemKey.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.rarity.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const totalActive = useMemo(
    () => items.filter((item) => item.isActive).length,
    [items]
  );
  const totalVip = useMemo(
    () => items.filter((item) => item.vipOnly).length,
    [items]
  );
  const averagePrice = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    return total / items.length;
  }, [items]);

  const resetForm = useCallback(() => {
    setForm({
      id: null,
      itemKey: "",
      title: "",
      description: "",
      price: "0",
      category: "effects",
      rarity: "standard",
      isActive: true,
      vipOnly: false,
    });
  }, []);

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

        const nextAdmin = await loadAdminProfileCompat(user.id);

        if (!nextAdmin || !nextAdmin.isAdmin) {
          router.replace("/dashboard");
          return;
        }

        const rows = await loadShopItemsCompat();

        setAdminProfile(nextAdmin);
        setItems(rows);

        if (rows.length > 0) {
          setTargetTable(rows[0].table);
          setTargetSchema(rows[0].schema);
        }
      } catch (e: any) {
        setFlash({
          tone: "error",
          text: e?.message || "Impossible de charger la boutique admin.",
        });
        console.error("Admin shop error:", e);
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

  function startEdit(item: ShopItemRow) {
    setTargetTable(item.table);
    setTargetSchema(item.schema);
    setForm({
      id: item.id,
      itemKey: item.itemKey,
      title: item.title,
      description: item.description,
      price: String(item.price),
      category: item.category,
      rarity: item.rarity,
      isActive: item.isActive,
      vipOnly: item.vipOnly,
    });
  }

  async function handleSave() {
    try {
      setSaving(true);

      const cleanTitle = form.title.trim();
      const cleanKey = slugify(form.itemKey || form.title);
      const cleanDescription = form.description.trim();
      const cleanCategory = slugify(form.category || "effects");
      const cleanRarity = slugify(form.rarity || "standard");
      const numericPrice = Number(form.price || 0);

      if (!cleanTitle) {
        throw new Error("Le titre de l’item est obligatoire.");
      }

      if (!cleanKey) {
        throw new Error("La clé de l’item est obligatoire.");
      }

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        throw new Error("Le prix est invalide.");
      }

      const payload: ItemForm = {
        ...form,
        itemKey: cleanKey,
        title: cleanTitle,
        description: cleanDescription,
        price: String(numericPrice),
        category: cleanCategory,
        rarity: cleanRarity,
      };

      if (payload.id) {
        await updateShopItem(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Item boutique mis à jour.",
        });
      } else {
        await createShopItem(payload, {
          table: targetTable,
          schema: targetSchema,
        });

        setFlash({
          tone: "success",
          text: "Item boutique créé.",
        });
      }

      resetForm();
      await loadPage(false);
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible d’enregistrer cet item.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: ShopItemRow) {
    try {
      setBusyId(item.id);
      await toggleItemActive(item, !item.isActive);

      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, isActive: !row.isActive } : row
        )
      );

      setFlash({
        tone: "success",
        text: `Item ${!item.isActive ? "activé" : "désactivé"}.`,
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de modifier cet item.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: ShopItemRow) {
    try {
      setBusyId(item.id);
      await deleteItem(item);

      setItems((prev) => prev.filter((row) => row.id !== item.id));

      if (form.id === item.id) {
        resetForm();
      }

      setFlash({
        tone: "success",
        text: "Item supprimé.",
      });
    } catch (e: any) {
      setFlash({
        tone: "error",
        text: e?.message || "Impossible de supprimer cet item.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setFlash({
        tone: "success",
        text: "ID item copié.",
      });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setFlash({
        tone: "error",
        text: "Impossible de copier l’ID.",
      });
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,40,200,0.08),transparent_24%),linear-gradient(180deg,#040405_0%,#07070a_100%)]" />
        <div className="relative w-full max-w-md rounded-[32px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>

          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            Admin Shop
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="w-full max-w-md rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-8 text-center">
          <div className="text-lg font-black text-white">Accès admin refusé</div>
          <div className="mt-2 text-sm text-white/56">
            Recharge la page ou reconnecte-toi.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative min-h-screen lg:pl-[290px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,20,20,0.20),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(170,50,170,0.12),transparent_35%),radial-gradient(circle_at_50%_5%,rgba(59,130,246,0.10),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)]" />
          <div className="absolute -left-24 top-16 h-[450px] w-[450px] rounded-full bg-gradient-to-r from-red-700/20 via-fuchsia-700/16 to-blue-700/12 blur-[160px]" />
          <div className="absolute right-8 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-red-600/16 via-pink-600/16 to-orange-600/14 blur-[150px]" />
        </div>

        <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
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
            <section className="relative overflow-hidden rounded-[30px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    Catalogue & effets
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Boutique
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">{adminProfile.pseudo}</span>
                    <span className="text-white/20">•</span>
                    <span>
                      Items <span className="font-black text-white">{items.length}</span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      Actifs <span className="font-black text-white">{totalActive}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag tone="gold">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      boutique
                    </Tag>
                    <Tag tone="violet">
                      <Wand2 className="h-3.5 w-3.5" />
                      effets
                    </Tag>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setFlash(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-500/16"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvel item
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadPage(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
                    Actualiser
                  </button>
                </div>
              </div>
            </section>

            <FlashBanner flash={flash} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total items"
                value={items.length}
                icon={<Gem className="h-4 w-4" />}
              />
              <StatCard
                label="Actifs"
                value={totalActive}
                icon={<Check className="h-4 w-4" />}
                tone="green"
              />
              <StatCard
                label="VIP only"
                value={totalVip}
                icon={<Crown className="h-4 w-4" />}
                tone="gold"
              />
              <StatCard
                label="Prix moyen"
                value={averagePrice.toFixed(0)}
                icon={<TagIcon className="h-4 w-4" />}
                tone="violet"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={form.id ? "Éditer item" : "Créer item"} right={<Tag>{form.id ? "édition" : "création"}</Tag>}>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Titre
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                          itemKey: prev.id ? prev.itemKey : slugify(e.target.value),
                        }))
                      }
                      placeholder="Ex: Halo Crystal"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Clé item
                    </label>
                    <input
                      value={form.itemKey}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          itemKey: slugify(e.target.value),
                        }))
                      }
                      placeholder="halo_crystal"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Décris l’effet, son style, son rendu visuel..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                        Prix
                      </label>
                      <input
                        value={form.price}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                        placeholder="100"
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                        Catégorie
                      </label>
                      <input
                        value={form.category}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="effects"
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                        Rareté
                      </label>
                      <input
                        value={form.rarity}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rarity: e.target.value,
                          }))
                        }
                        placeholder="legendary"
                        className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          isActive: !prev.isActive,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.isActive
                          ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.isActive ? "Item actif" : "Item inactif"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          vipOnly: !prev.vipOnly,
                        }))
                      }
                      className={cx(
                        "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                        form.vipOnly
                          ? "border-amber-400/18 bg-amber-500/10 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-white/70"
                      )}
                    >
                      {form.vipOnly ? "Réservé VIP" : "Ouvert à tous"}
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSave()}
                      className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition disabled:opacity-60"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {form.id ? "Mettre à jour" : "Créer"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.07]"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </Panel>

              <Panel title="Catalogue items" right={<Tag>{filteredItems.length} affichés</Tag>}>
                <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Titre, clé, catégorie, rareté..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "Tous" },
                      { key: "active", label: "Actifs" },
                      { key: "inactive", label: "Inactifs" },
                      { key: "vip", label: "VIP" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key as FilterValue)}
                        className={cx(
                          "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                          filter === item.key
                            ? "border-red-400/18 bg-red-500/10 text-red-100"
                            : "border-white/10 bg-white/[0.04] text-white/70"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="rounded-[20px] border border-red-500/10 bg-black/20 p-6 text-sm text-white/48">
                    Aucun item trouvé avec ce filtre.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredItems.map((item) => {
                      const busy = busyId === item.id;
                      const copied = copiedId === item.id;

                      return (
                        <div
                          key={`${item.table}-${item.id}`}
                          className="rounded-[22px] border border-red-500/12 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-xl font-black tracking-[-0.02em] text-white">
                                {item.title}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.isActive ? (
                                  <Tag tone="green">
                                    <Check className="h-3.5 w-3.5" />
                                    actif
                                  </Tag>
                                ) : (
                                  <Tag>inactif</Tag>
                                )}

                                {item.vipOnly ? (
                                  <Tag tone="gold">
                                    <Crown className="h-3.5 w-3.5" />
                                    vip only
                                  </Tag>
                                ) : null}

                                <Tag tone="violet">{item.category}</Tag>
                                <Tag>{item.rarity}</Tag>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/58">
                                <span>
                                  Prix <span className="font-black text-white">{item.price}</span>
                                </span>
                                <span className="text-white/20">•</span>
                                <span>
                                  Clé <span className="font-black text-white">{item.itemKey}</span>
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleCopyId(item.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                            >
                              {copied ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                            </button>
                          </div>

                          <div className="mt-4 rounded-[18px] border border-red-500/10 bg-[#0f0f14] p-4 text-sm leading-6 text-white/62">
                            {item.description || "Aucune description pour cet item."}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-fuchsia-100 transition"
                            >
                              <Sparkles className="h-4 w-4" />
                              Éditer
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleToggleActive(item)}
                              className={cx(
                                "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60",
                                item.isActive
                                  ? "border-red-400/18 bg-red-500/10 text-red-100"
                                  : "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                              )}
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : item.isActive ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {item.isActive ? "Désactiver" : "Activer"}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition disabled:opacity-60"
                            >
                              {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Supprimer
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
  );
}
