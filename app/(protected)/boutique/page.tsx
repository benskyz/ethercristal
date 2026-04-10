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
  ensureProfileRecord,
  isVipActive,
  profileDisplayName,
  type ProfileRow,
} from "@/lib/profileCompat";
import {
  Check,
  Crown,
  Gem,
  Loader2,
  Lock,
  Menu,
  RefreshCw,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Wand2,
  Wallet,
  Zap,
} from "lucide-react";

type ShopItemRow = {
  id: number | string;
  item_key: string;
  title: string;
  description: string | null;
  price: number | null;
  category: string | null;
  rarity: string | null;
  preview_style: string | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type InventoryRow = {
  id: string;
  user_id: string;
  item_key: string;
  item_type: string | null;
  equipped: boolean | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type ShopPurchaseRow = {
  id: number | string;
  user_id: string;
  payment_id: string | null;
  item_id: number | null;
  item_key: string | null;
  title: string;
  status: "pending" | "paid" | "refunded" | "cancelled";
  amount: number;
  currency: string;
  created_at: string | null;
  updated_at: string | null;
};

type PaymentRow = {
  id: string;
  user_id: string | null;
  purchase_type: string;
  item_key: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  provider: string;
  created_at: string;
  updated_at?: string | null;
};

type SessionResult = {
  ok?: boolean;
  paymentId?: string;
  status?: string;
  checkoutUrl?: string;
  message?: string;
  error?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(amount: number, currency = "CAD") {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-CA");
}

function rarityTone(rarity?: string | null) {
  const key = String(rarity || "").toLowerCase();

  if (key === "legendary") return "gold";
  if (key === "epic") return "violet";
  if (key === "rare") return "green";
  return "default";
}

function humanCategory(category?: string | null) {
  return String(category || "effect").replace(/_/g, " ");
}

function itemVipRequired(item: ShopItemRow) {
  return Boolean((item.metadata || {}).vipRequired);
}

function itemSlot(item: ShopItemRow) {
  return String((item.metadata || {}).slot || item.category || "effect");
}

function previewTone(style?: string | null) {
  const key = String(style || "").toLowerCase();

  if (key.includes("crystal")) {
    return "from-cyan-300/25 via-white/10 to-cyan-300/10";
  }
  if (key.includes("void")) {
    return "from-fuchsia-400/25 via-purple-500/10 to-fuchsia-400/10";
  }
  if (key.includes("obsidian")) {
    return "from-red-500/25 via-white/5 to-fuchsia-500/10";
  }
  if (key.includes("ember")) {
    return "from-orange-400/25 via-red-500/10 to-pink-500/10";
  }

  return "from-white/10 via-white/5 to-white/10";
}

function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "gold" | "violet" | "green" | "red";
}) {
  const styles =
    tone === "gold"
      ? "border-amber-400/18 bg-amber-500/10 text-amber-100"
      : tone === "violet"
      ? "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "green"
      ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
      : tone === "red"
      ? "border-red-400/18 bg-red-500/10 text-red-100"
      : "border-white/10 bg-white/[0.04] text-white/72";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]",
        styles
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
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

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/34">
          {label}
        </div>
        <div className="text-white/60">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
        {label}
      </div>
      <div className="text-right text-sm font-black text-white">{value}</div>
    </div>
  );
}

function ShopItemCard({
  item,
  owned,
  equipped,
  locked,
  buying,
  isAdmin,
  onBuy,
}: {
  item: ShopItemRow;
  owned: boolean;
  equipped: boolean;
  locked: boolean;
  buying: boolean;
  isAdmin: boolean;
  onBuy: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-red-500/12 bg-[#0d0d12] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
      <div
        className={cx(
          "absolute inset-0 bg-gradient-to-br opacity-90",
          previewTone(item.preview_style)
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_35%)]" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-3xl transition duration-500 group-hover:scale-125" />

      <div className="relative z-10">
        <div className="rounded-[22px] border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/36">
                {item.item_key}
              </div>
              <div className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
                {item.title}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Tag tone={rarityTone(item.rarity)}>
                {item.rarity || "standard"}
              </Tag>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Tag tone="violet">{humanCategory(item.category)}</Tag>
            <Tag>{itemSlot(item)}</Tag>
            {itemVipRequired(item) ? <Tag tone="gold">VIP requis</Tag> : null}
            {owned ? <Tag tone="green">possédé</Tag> : null}
            {equipped ? <Tag tone="green">équipé</Tag> : null}
            {isAdmin ? <Tag tone="red">admin</Tag> : null}
          </div>

          <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/64">
            {item.description || "Effet premium EtherCristal."}
          </p>

          <div className="mt-4 flex items-end gap-2">
            <div className="text-3xl font-black tracking-[-0.05em] text-white">
              {formatMoney(Number(item.price || 0))}
            </div>
            <div className="pb-1 text-sm text-white/44">achat</div>
          </div>

          <button
            type="button"
            disabled={buying || owned || locked}
            onClick={onBuy}
            className={cx(
              "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border px-4 py-4 text-sm font-black uppercase tracking-[0.14em] transition",
              buying || owned || locked
                ? "border-white/10 bg-white/[0.05] text-white/42"
                : "border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/16"
            )}
          >
            {buying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création...
              </>
            ) : owned ? (
              <>
                <Check className="h-4 w-4" />
                Déjà possédé
              </>
            ) : locked ? (
              <>
                <Lock className="h-4 w-4" />
                VIP requis
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Acheter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BoutiquePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [shopPurchases, setShopPurchases] = useState<ShopPurchaseRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const isAdmin = Boolean(profile?.is_admin);
  const vipActive = isVipActive(profile);

  const ownedKeys = useMemo(
    () => new Set(inventory.map((row) => row.item_key)),
    [inventory]
  );

  const equippedKeys = useMemo(
    () =>
      new Set(
        inventory.filter((row) => row.equipped).map((row) => row.item_key)
      ),
    [inventory]
  );

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        items
          .map((item) => item.category)
          .filter((value): value is string => Boolean(value && value.trim()))
      )
    );
    return ["all", ...values];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;

      if (!q) return true;

      return (
        item.item_key.toLowerCase().includes(q) ||
        String(item.title || "").toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        String(item.rarity || "").toLowerCase().includes(q)
      );
    });
  }, [items, search, category]);

  const latestPayment = payments[0] || null;

  const loadPage = useCallback(
    async (firstLoad = false) => {
      try {
        if (firstLoad) setLoading(true);
        else setRefreshing(true);

        setError("");

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

        const [itemsRes, inventoryRes, purchasesRes, paymentsRes] =
          await Promise.all([
            supabase
              .from("shop_items")
              .select(
                "id, item_key, title, description, price, category, rarity, preview_style, is_active, metadata"
              )
              .eq("is_active", true)
              .order("price", { ascending: true }),
            supabase
              .from("inventory_items")
              .select(
                "id, user_id, item_key, item_type, equipped, meta, created_at, updated_at"
              )
              .eq("user_id", user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("shop_purchases")
              .select(
                "id, user_id, payment_id, item_id, item_key, title, status, amount, currency, created_at, updated_at"
              )
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("payments")
              .select(
                "id, user_id, purchase_type, item_key, amount, currency, status, provider, created_at, updated_at"
              )
              .eq("user_id", user.id)
              .eq("purchase_type", "shop_item")
              .order("created_at", { ascending: false })
              .limit(10),
          ]);

        if (itemsRes.error) throw itemsRes.error;
        if (inventoryRes.error) throw inventoryRes.error;
        if (purchasesRes.error) throw purchasesRes.error;
        if (paymentsRes.error) throw paymentsRes.error;

        const cleanItems = ((itemsRes.data || []) as Partial<ShopItemRow>[])
          .filter(
            (row) =>
              row &&
              typeof row.item_key === "string" &&
              row.item_key.trim().length > 0
          )
          .map((row) => ({
            id: row.id ?? row.item_key!.trim(),
            item_key: row.item_key!.trim(),
            title: row.title?.trim() || row.item_key!.trim(),
            description: row.description ?? "",
            price: Number(row.price ?? 0),
            category: row.category ?? "effect",
            rarity: row.rarity ?? "standard",
            preview_style: row.preview_style ?? null,
            is_active: row.is_active ?? true,
            metadata: row.metadata ?? {},
          })) as ShopItemRow[];

        setProfile(nextProfile);
        setItems(cleanItems);
        setInventory((inventoryRes.data || []) as InventoryRow[]);
        setShopPurchases((purchasesRes.data || []) as ShopPurchaseRow[]);
        setPayments((paymentsRes.data || []) as PaymentRow[]);
      } catch (err: any) {
        setError(err?.message || "Impossible de charger la boutique.");
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

  const handleCreateShopPayment = useCallback(
    async (item: ShopItemRow) => {
      try {
        setBuyingKey(item.item_key);
        setError("");
        setSuccess("");

        if (ownedKeys.has(item.item_key)) {
          throw new Error("Cet item est déjà dans ton inventaire.");
        }

        if (itemVipRequired(item) && !vipActive && !isAdmin) {
          throw new Error("Cet item est réservé aux membres VIP.");
        }

        const supabase = requireSupabaseBrowserClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Session utilisateur introuvable.");
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
          throw new Error("Variables publiques Supabase manquantes.");
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/create-payment-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: anonKey,
            },
            body: JSON.stringify({
              purchaseType: "shop_item",
              amount: Number(item.price || 0),
              currency: "CAD",
              itemKey: item.item_key,
              metadata: {
                title: item.title,
                category: item.category,
                rarity: item.rarity,
                slot: itemSlot(item),
                vipRequired: itemVipRequired(item),
                source: "boutique-page",
              },
            }),
          }
        );

        const result = (await response.json()) as SessionResult;

        if (!response.ok) {
          throw new Error(
            result?.error || "Impossible de créer la session d'achat."
          );
        }

        setSuccess(
          result?.checkoutUrl
            ? `Session créée. Payment ID: ${result.paymentId}. URL de sortie: ${result.checkoutUrl}`
            : `Session créée. Payment ID: ${result.paymentId}.`
        );

        await loadPage(false);
      } catch (err: any) {
        setError(err?.message || "Impossible de créer le paiement shop.");
      } finally {
        setBuyingKey(null);
      }
    },
    [ownedKeys, vipActive, isAdmin, loadPage]
  );

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <Loader2 className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal Boutique
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
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
              <RefreshCw
                className={cx("h-4 w-4", refreshing && "animate-spin")}
              />
              Refresh
            </button>
          </div>

          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[32px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

              <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                    catalogue premium
                  </div>

                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                    Boutique
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/64">
                    <span className="font-black text-white">
                      {profileDisplayName(profile)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      crédits{" "}
                      <span className="font-black text-white">
                        {profile?.credits ?? 0}
                      </span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      inventaire{" "}
                      <span className="font-black text-white">
                        {inventory.length}
                      </span>
                    </span>
                    <span className="text-white/20">•</span>
                    <span>
                      VIP{" "}
                      <span className="font-black text-white">
                        {isAdmin ? "ADMIN" : vipActive ? "ACTIF" : "NON"}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isAdmin ? <Tag tone="red">admin</Tag> : null}
                    {vipActive ? (
                      <Tag tone="gold">vip actif</Tag>
                    ) : (
                      <Tag>membre standard</Tag>
                    )}
                    {profile?.master_title ? (
                      <Tag tone="violet">{profile.master_title}</Tag>
                    ) : null}
                    {profile?.active_name_fx_key ? (
                      <Tag tone="green">{profile.active_name_fx_key}</Tag>
                    ) : null}
                  </div>

                  <p className="mt-5 max-w-3xl text-sm leading-7 text-white/58">
                    Catalogue réel, inventaire réel, achats réels. Cette page
                    ne montre plus de faux items.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void loadPage(false)}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-500/12 bg-red-950/12 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-red-900/16"
                  >
                    <RefreshCw
                      className={cx("h-4 w-4", refreshing && "animate-spin")}
                    />
                    Actualiser
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/inventaire")}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
                  >
                    <Wand2 className="h-4 w-4" />
                    Inventaire
                  </button>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="catalogue"
                value={items.length}
                icon={<ShoppingBag className="h-4 w-4" />}
              />
              <Stat
                label="possédés"
                value={inventory.length}
                icon={<Gem className="h-4 w-4" />}
              />
              <Stat
                label="équipés"
                value={inventory.filter((item) => item.equipped).length}
                icon={<Sparkles className="h-4 w-4" />}
              />
              <Stat
                label="paiements"
                value={payments.length}
                icon={<Wallet className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card
                title="Catalogue"
                right={<Tag tone="gold">{filteredItems.length} items</Tag>}
              >
                <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Chercher un item..."
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categories.map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setCategory(value)}
                        className={cx(
                          "rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                          category === value
                            ? "border-red-400/18 bg-red-500/10 text-red-100"
                            : "border-white/10 bg-white/[0.04] text-white/70"
                        )}
                      >
                        {value === "all" ? "tout" : humanCategory(value)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/48">
                    Aucun item trouvé.
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {filteredItems.map((item) => (
                      <ShopItemCard
                        key={String(item.id ?? item.item_key)}
                        item={item}
                        owned={ownedKeys.has(item.item_key)}
                        equipped={equippedKeys.has(item.item_key)}
                        locked={itemVipRequired(item) && !vipActive && !isAdmin}
                        buying={buyingKey === item.item_key}
                        isAdmin={isAdmin}
                        onBuy={() => void handleCreateShopPayment(item)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                <Card
                  title="Compte boutique"
                  right={<Tag tone="violet">résumé</Tag>}
                >
                  <div className="grid gap-3">
                    <Row label="membre" value={profileDisplayName(profile)} />
                    <Row label="rôle" value={profile?.role || "member"} />
                    <Row label="crédits" value={profile?.credits ?? 0} />
                    <Row label="VIP actif" value={vipActive ? "Oui" : "Non"} />
                    <Row label="items possédés" value={inventory.length} />
                    <Row
                      label="items équipés"
                      value={inventory.filter((item) => item.equipped).length}
                    />
                    <Row
                      label="badge actif"
                      value={profile?.active_badge_key || "Aucun"}
                    />
                    <Row
                      label="titre actif"
                      value={profile?.active_title_key || "Aucun"}
                    />
                  </div>
                </Card>

                <Card
                  title="Dernier paiement shop"
                  right={<Tag tone="violet">trace</Tag>}
                >
                  {latestPayment ? (
                    <div className="grid gap-3">
                      <Row
                        label="montant"
                        value={formatMoney(
                          Number(latestPayment.amount || 0),
                          latestPayment.currency
                        )}
                      />
                      <Row label="item" value={latestPayment.item_key || "—"} />
                      <Row label="statut" value={latestPayment.status} />
                      <Row label="provider" value={latestPayment.provider} />
                      <Row label="créé" value={formatDate(latestPayment.created_at)} />
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/52">
                      Aucun paiement shop enregistré.
                    </div>
                  )}
                </Card>

                <Card
                  title="Achats validés"
                  right={<Tag>{shopPurchases.length} lignes</Tag>}
                >
                  {shopPurchases.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/48">
                      Aucun achat validé.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {shopPurchases.map((purchase) => (
                        <div
                          key={String(purchase.id)}
                          className="rounded-[18px] border border-white/8 bg-black/20 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-lg font-black text-white">
                                {purchase.title}
                              </div>
                              <div className="mt-1 text-xs text-white/42">
                                {purchase.item_key || "item inconnu"}
                              </div>
                            </div>

                            <Tag
                              tone={
                                purchase.status === "paid"
                                  ? "green"
                                  : purchase.status === "pending"
                                  ? "gold"
                                  : purchase.status === "refunded"
                                  ? "violet"
                                  : "red"
                              }
                            >
                              {purchase.status}
                            </Tag>
                          </div>

                          <div className="mt-4 grid gap-3">
                            <Row
                              label="montant"
                              value={formatMoney(
                                Number(purchase.amount || 0),
                                purchase.currency
                              )}
                            />
                            <Row label="date" value={formatDate(purchase.created_at)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            <Card title="Inventaire rapide" right={<Tag>{inventory.length} items</Tag>}>
              {inventory.length === 0 ? (
                <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/48">
                  Ton inventaire est vide.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {inventory.map((item) => (
                    <div
                      key={String(item.id ?? item.item_key)}
                      className="rounded-[18px] border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Tag tone="violet">{item.item_key}</Tag>
                        {item.equipped ? (
                          <Tag tone="green">équipé</Tag>
                        ) : (
                          <Tag>stocké</Tag>
                        )}
                      </div>

                      <div className="mt-3 text-sm text-white/56">
                        Type: {item.item_type || "effect"}
                      </div>

                      <div className="mt-2 text-xs text-white/36">
                        Ajouté: {formatDate(item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
