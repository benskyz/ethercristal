"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type ShopItemRow = {
  id: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  badge?: string | null;
  category?: string | null;
  price_ether?: number | null;
  price_usd?: number | null;
  metadata?: Record<string, any> | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type InventoryRow = {
  id: string;
  user_id: string;
  item_slug?: string | null;
  item_type?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  is_verified?: boolean | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type CategoryFilter = "all" | "effect" | "theme" | "bundle" | "vip";

function getProfileName(profile: ProfileRow | null) {
  return String(profile?.username || "Membre");
}

function getProfileNameStyle(profile: ProfileRow | null) {
  if (!profile) return {};

  if (profile.display_name_gradient) {
    return {
      background: profile.display_name_gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: profile.display_name_glow
        ? `0 0 16px ${profile.display_name_glow}`
        : "0 0 14px rgba(212,175,55,0.14)",
    };
  }

  return {
    color: profile.display_name_color || "#fff6d6",
    textShadow: profile.display_name_glow
      ? `0 0 16px ${profile.display_name_glow}`
      : "0 0 14px rgba(212,175,55,0.14)",
  };
}

function isVipLevel(value?: string | null) {
  const v = String(value || "").toLowerCase();
  return v !== "" && v !== "free" && v !== "standard";
}

function getItemCategory(item: ShopItemRow): CategoryFilter {
  const category = String(item.category || "effect").toLowerCase();
  if (category === "theme") return "theme";
  if (category === "bundle") return "bundle";
  if (category === "vip") return "vip";
  return "effect";
}

function getItemTitle(item: ShopItemRow) {
  return String(item.title || item.slug || "Item");
}

function getItemDescription(item: ShopItemRow) {
  return String(item.description || "Effet premium EtherCristal.");
}

function getItemBadge(item: ShopItemRow) {
  return String(item.badge || item.category || "Premium");
}

function isVipOnlyItem(item: ShopItemRow) {
  return Boolean(item.metadata?.vip_only) || getItemCategory(item) === "vip";
}

function isUniqueItem(item: ShopItemRow) {
  return Boolean(item.metadata?.unique);
}

function getVisualMood(item: ShopItemRow) {
  const slug = String(item.slug || "").toLowerCase();
  const category = getItemCategory(item);

  if (category === "vip" || slug.includes("vip")) return "vip";
  if (slug.includes("gold") || slug.includes("ether")) return "gold";
  if (slug.includes("midnight") || slug.includes("dark")) return "dark";
  if (slug.includes("cristal") || slug.includes("diamond")) return "cristal";
  return "default";
}

export default function ShopPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [buyingSlug, setBuyingSlug] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      const [{ data: profileData, error: profileError }, { data: itemRows, error: itemsError }, { data: invRows, error: invError }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
          supabase.from("shop_items").select("*").eq("is_active", true).order("created_at", { ascending: false }),
          supabase.from("user_inventory").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
        ]);

      if (profileError) {
        setErrorMsg(profileError.message || "Impossible de charger le profil.");
        setLoading(false);
        return;
      }

      if (itemsError) {
        setErrorMsg(itemsError.message || "Impossible de charger la boutique.");
        setLoading(false);
        return;
      }

      if (invError) {
        setErrorMsg(invError.message || "Impossible de charger l’inventaire.");
        setLoading(false);
        return;
      }

      setProfile((profileData || null) as ProfileRow | null);
      setItems((itemRows || []) as ShopItemRow[]);
      setInventory((invRows || []) as InventoryRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement boutique.");
    } finally {
      setLoading(false);
    }
  }

  const ownedMap = useMemo(() => {
    const map: Record<string, InventoryRow[]> = {};
    for (const item of inventory) {
      const slug = String(item.item_slug || "");
      if (!slug) continue;
      if (!map[slug]) map[slug] = [];
      map[slug].push(item);
    }
    return map;
  }, [inventory]);

  const activeInventory = useMemo(() => {
    return inventory.filter((item) => item.is_active);
  }, [inventory]);

  const activeTypeMap = useMemo(() => {
    const map: Record<string, InventoryRow> = {};
    for (const item of activeInventory) {
      const type = String(item.item_type || "effect").toLowerCase();
      map[type] = item;
    }
    return map;
  }, [activeInventory]);

  const isVip = useMemo(() => isVipLevel(profile?.vip_level), [profile?.vip_level]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const category = getItemCategory(item);
      const text = [
        item.slug,
        item.title,
        item.description,
        item.badge,
        item.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const categoryOk = categoryFilter === "all" ? true : category === categoryFilter;
      const searchOk = !q ? true : text.includes(q);

      return categoryOk && searchOk;
    });
  }, [items, categoryFilter, search]);

  async function refreshProfileAndInventory() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const [{ data: profileData }, { data: invRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
        supabase.from("user_inventory").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
      ]);

      setProfile((profileData || null) as ProfileRow | null);
      setInventory((invRows || []) as InventoryRow[]);
    } catch {}
  }

  async function handleBuyWithEther(item: ShopItemRow) {
    try {
      setBuyingSlug(item.slug);
      setNotice("");
      setErrorMsg("");

      if (isVipOnlyItem(item) && !isVip) {
        setErrorMsg("Cet item est réservé aux membres VIP.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("buy_shop_item_with_ether", {
        item_slug_input: item.slug,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible d’acheter cet item en Ether.");
        return;
      }

      if (!data?.ok) {
        setErrorMsg(data?.error || "Achat Ether refusé.");
        return;
      }

      setNotice(`${getItemTitle(item)} ajouté à ton inventaire.`);
      await refreshProfileAndInventory();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur achat Ether.");
    } finally {
      setBuyingSlug("");
    }
  }

  async function handleBuyWithStripe(item: ShopItemRow) {
    try {
      setBuyingSlug(item.slug);
      setNotice("");
      setErrorMsg("");

      if (isVipOnlyItem(item) && !isVip) {
        setErrorMsg("Cet item est réservé aux membres VIP.");
        return;
      }

      if (!item.price_usd || Number(item.price_usd) <= 0) {
        setErrorMsg("Cet item n’est pas disponible en paiement Stripe.");
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceName: getItemTitle(item),
          amountUsd: Number(item.price_usd),
          metadata: {
            product_slug: item.slug,
            category: item.category || "effect",
            auto_equip: String(Boolean(item.metadata?.auto_equip)),
          },
          mode: "payment",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.url) {
        setErrorMsg(json?.error || "Impossible de lancer le paiement Stripe.");
        return;
      }

      window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur paiement Stripe.");
    } finally {
      setBuyingSlug("");
    }
  }

  function renderAction(item: ShopItemRow) {
    const owned = ownedMap[item.slug] || [];
    const alreadyOwned = owned.length > 0;
    const unique = isUniqueItem(item);
    const vipOnly = isVipOnlyItem(item);
    const busy = buyingSlug === item.slug;

    if (vipOnly && !isVip) {
      return (
        <button className="shop-btn ghost" type="button" onClick={() => router.push("/vip")}>
          Débloquer VIP
        </button>
      );
    }

    if (unique && alreadyOwned) {
      return (
        <button className="shop-btn ghost" type="button" onClick={() => router.push("/inventaire")}>
          Déjà possédé
        </button>
      );
    }

    return (
      <div className="shop-cardActions">
        {Number(item.price_ether || 0) > 0 ? (
          <button
            className="shop-btn gold"
            type="button"
            disabled={busy}
            onClick={() => void handleBuyWithEther(item)}
          >
            {busy ? "Achat..." : `Acheter ${Number(item.price_ether || 0)} Ξ`}
          </button>
        ) : null}

        {Number(item.price_usd || 0) > 0 ? (
          <button
            className="shop-btn vip"
            type="button"
            disabled={busy}
            onClick={() => void handleBuyWithStripe(item)}
          >
            {busy ? "Ouverture..." : `$${Number(item.price_usd || 0).toFixed(2)}`}
          </button>
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="shop-page">
        <style>{css}</style>
        <div className="shop-loading">
          <div className="shop-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="shop-page">
      <style>{css}</style>

      <div className="shop-bg shop-bg-a" />
      <div className="shop-bg shop-bg-b" />
      <div className="shop-noise" />
      <div className="shop-orb shop-orb-a" />
      <div className="shop-orb shop-orb-b" />

      <div className="shop-shell">
        <header className="shop-topbar">
          <div>
            <div className="shop-kicker">Boutique EtherCristal</div>
            <h1 className="shop-title">Effets, thèmes et premium</h1>
            <p className="shop-subtitle">
              Achète proprement, récupère tes items dans l’inventaire et équipe-les pour les voir partout.
            </p>
          </div>

          <div className="shop-topActions">
            <button className="shop-navBtn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="shop-navBtn" type="button" onClick={() => router.push("/inventaire")}>
              Inventaire
            </button>
            <button className="shop-navBtn gold" type="button" onClick={() => router.push("/vip")}>
              VIP
            </button>
          </div>
        </header>

        <section className="shop-heroCard">
          <div>
            <div className="shop-statusLabel">Compte</div>
            <div className="shop-statusName" style={getProfileNameStyle(profile)}>
              {getProfileName(profile)}
            </div>
            <div className="shop-statusMeta">
              {isVip ? "VIP" : "Standard"}
              {profile?.is_verified ? " • Vérifié" : ""}
            </div>
          </div>

          <div className="shop-statPack">
            <div className="shop-stat">
              <span>Ether</span>
              <strong>{Number(profile?.ether_balance || 0)} Ξ</strong>
            </div>
            <div className="shop-stat">
              <span>Items possédés</span>
              <strong>{inventory.length}</strong>
            </div>
            <div className="shop-stat">
              <span>Actifs</span>
              <strong>{activeInventory.length}</strong>
            </div>
          </div>
        </section>

        {notice ? <div className="shop-notice">{notice}</div> : null}
        {errorMsg ? <div className="shop-error">{errorMsg}</div> : null}

        <section className="shop-filters">
          <input
            className="shop-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un item..."
          />

          <div className="shop-pillRow">
            {(["all", "effect", "theme", "bundle", "vip"] as CategoryFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`shop-pill ${categoryFilter === value ? "active" : ""}`}
                onClick={() => setCategoryFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="shop-grid">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const owned = ownedMap[item.slug] || [];
              const unique = isUniqueItem(item);
              const vipOnly = isVipOnlyItem(item);
              const mood = getVisualMood(item);
              const currentActive = activeTypeMap[String(item.category || "effect").toLowerCase()];
              const sameTypeEquipped = currentActive?.item_slug === item.slug;

              return (
                <article key={item.id} className={`shop-card ${mood}`}>
                  <div className="shop-cardGlow" />

                  <div className="shop-cardTop">
                    <div className="shop-badgeRow">
                      <span className="shop-badge">{getItemBadge(item)}</span>
                      {vipOnly ? <span className="shop-badge vip">VIP</span> : null}
                      {unique ? <span className="shop-badge soft">Unique</span> : null}
                      {sameTypeEquipped ? <span className="shop-badge active">Actif</span> : null}
                    </div>
                  </div>

                  <h2 className="shop-cardTitle">{getItemTitle(item)}</h2>
                  <p className="shop-cardText">{getItemDescription(item)}</p>

                  <div className="shop-prices">
                    <div className="shop-priceBox">
                      <span>Ether</span>
                      <strong>{Number(item.price_ether || 0)} Ξ</strong>
                    </div>
                    <div className="shop-priceBox">
                      <span>Stripe</span>
                      <strong>
                        {Number(item.price_usd || 0) > 0 ? `$${Number(item.price_usd || 0).toFixed(2)}` : "—"}
                      </strong>
                    </div>
                  </div>

                  <div className="shop-ownedInfo">
                    {owned.length > 0 ? (
                      <span className="shop-ownedTag">Déjà dans ton inventaire</span>
                    ) : (
                      <span className="shop-ownedTag muted">Pas encore possédé</span>
                    )}
                  </div>

                  {renderAction(item)}
                </article>
              );
            })
          ) : (
            <div className="shop-empty">Aucun item trouvé.</div>
          )}
        </section>
      </div>
    </main>
  );
}

const css = `
.shop-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.shop-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.shop-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.shop-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.18;
}

.shop-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}

.shop-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.shop-orb-a{
  width:220px;
  height:220px;
  left:60px;
  top:100px;
  background:rgba(212,175,55,0.42);
}
.shop-orb-b{
  width:260px;
  height:260px;
  right:80px;
  top:160px;
  background:rgba(180,30,60,0.22);
}

.shop-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.shop-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.shop-kicker{
  display:inline-flex;
  min-height:36px;
  padding:8px 14px;
  border-radius:999px;
  background:rgba(212,175,55,0.10);
  color:#f6dc86;
  border:1px solid rgba(212,175,55,0.18);
  font-size:12px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
}

.shop-title{
  margin:16px 0 0;
  font-size:52px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.shop-subtitle{
  margin:14px 0 0;
  max-width:760px;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
  font-size:17px;
}

.shop-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.shop-navBtn{
  min-height:46px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
  font-weight:800;
  cursor:pointer;
}
.shop-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.shop-heroCard{
  margin-top:24px;
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  flex-wrap:wrap;
  padding:22px;
  border-radius:26px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
}

.shop-statusLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}

.shop-statusName{
  margin-top:8px;
  font-size:32px;
  font-weight:900;
  line-height:1;
}

.shop-statusMeta{
  margin-top:8px;
  color:rgba(255,245,220,0.68);
  font-size:14px;
}

.shop-statPack{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.shop-stat{
  min-width:150px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.shop-stat span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.shop-stat strong{
  display:block;
  margin-top:8px;
  font-size:24px;
  color:#fff2cb;
}

.shop-notice,
.shop-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.shop-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.shop-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.shop-filters{
  margin-top:24px;
  display:grid;
  gap:14px;
}

.shop-search{
  width:100%;
  min-height:56px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.shop-search::placeholder{
  color:rgba(255,255,255,0.42);
}

.shop-pillRow{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.shop-pill{
  min-height:42px;
  padding:10px 14px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.10);
  background:rgba(255,255,255,0.04);
  color:#fff;
  font-weight:800;
  cursor:pointer;
  text-transform:uppercase;
}
.shop-pill.active{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.shop-grid{
  margin-top:24px;
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:20px;
}

.shop-card{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  padding:22px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  min-height:360px;
  display:flex;
  flex-direction:column;
}

.shop-cardGlow{
  position:absolute;
  width:180px;
  height:180px;
  right:-40px;
  bottom:-40px;
  border-radius:999px;
  filter:blur(36px);
  opacity:.18;
}
.shop-card.gold .shop-cardGlow{ background:rgba(212,175,55,0.75); }
.shop-card.vip .shop-cardGlow{ background:rgba(174,92,255,0.65); }
.shop-card.dark .shop-cardGlow{ background:rgba(85,110,255,0.60); }
.shop-card.cristal .shop-cardGlow{ background:rgba(90,210,255,0.60); }
.shop-card.default .shop-cardGlow{ background:rgba(255,120,90,0.45); }

.shop-cardTop{
  position:relative;
  z-index:2;
}

.shop-badgeRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.shop-badge{
  display:inline-flex;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff2d3;
  font-size:12px;
  font-weight:900;
}
.shop-badge.vip{
  background:rgba(139,92,246,0.16);
  color:#eadcff;
  border-color:rgba(139,92,246,0.26);
}
.shop-badge.soft{
  background:rgba(255,255,255,0.08);
}
.shop-badge.active{
  background:rgba(47,143,88,0.16);
  color:#b9ffd4;
  border-color:rgba(47,143,88,0.24);
}

.shop-cardTitle{
  position:relative;
  z-index:2;
  margin:18px 0 0;
  font-size:28px;
  line-height:1;
  font-weight:900;
}

.shop-cardText{
  position:relative;
  z-index:2;
  margin:14px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.75;
  min-height:74px;
}

.shop-prices{
  position:relative;
  z-index:2;
  margin-top:18px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}

.shop-priceBox{
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.shop-priceBox span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.shop-priceBox strong{
  display:block;
  margin-top:8px;
  font-size:22px;
  color:#fff2cb;
}

.shop-ownedInfo{
  position:relative;
  z-index:2;
  margin-top:16px;
}

.shop-ownedTag{
  display:inline-flex;
  min-height:34px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(212,175,55,0.12);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
  font-size:12px;
  font-weight:800;
}
.shop-ownedTag.muted{
  background:rgba(255,255,255,0.06);
  border-color:rgba(255,255,255,0.10);
  color:#ddd;
}

.shop-cardActions{
  position:relative;
  z-index:2;
  margin-top:auto;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  padding-top:18px;
}

.shop-btn{
  min-height:48px;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.shop-btn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.shop-btn.vip{
  background:linear-gradient(90deg,#6b42b8,#9c6cff);
  color:#fff;
}
.shop-btn.ghost{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff;
}

.shop-empty{
  padding:20px;
  border-radius:20px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.72);
}

.shop-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.shop-loader{
  width:64px;
  height:64px;
  border:6px solid rgba(212,175,55,0.2);
  border-top:6px solid #d4af37;
  border-radius:50%;
  animation:spin 1.3s linear infinite;
}
@keyframes spin{
  to{transform:rotate(360deg)}
}

@media (max-width: 1180px){
  .shop-grid{
    grid-template-columns:1fr 1fr;
  }
}

@media (max-width: 760px){
  .shop-title{
    font-size:40px;
  }

  .shop-subtitle{
    font-size:16px;
  }

  .shop-grid{
    grid-template-columns:1fr;
  }

  .shop-statPack{
    width:100%;
  }

  .shop-stat{
    flex:1 1 100%;
  }
}
`;
