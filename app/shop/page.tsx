"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  username?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  is_verified?: boolean | null;
  avatar_url?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

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
  user_id?: string | null;
  item_slug?: string | null;
  item_type?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
};

type ShopFilter = "all" | "effect" | "theme" | "bundle";

type PremiumCard = {
  id: string;
  title: string;
  subtitle: string;
  accent: "gold" | "diamond";
  text: string;
  features: string[];
  cta: string;
  href: string;
};

const FILTERS: ShopFilter[] = ["all", "effect", "theme", "bundle"];

const FILTER_LABELS: Record<ShopFilter, string> = {
  all: "Tous",
  effect: "Effets",
  theme: "Thèmes",
  bundle: "Bundles",
};

const PREMIUM_CARDS: PremiumCard[] = [
  {
    id: "vip",
    title: "VIP Gold",
    subtitle: "Accès premium chaud et luxueux",
    accent: "gold",
    text: "Débloque les espaces premium, améliore ta présence et entre dans un univers plus exclusif.",
    features: [
      "Accès aux espaces VIP",
      "Profil mieux mis en avant",
      "Badge premium visible",
      "Expérience plus haut de gamme",
    ],
    cta: "Voir les offres VIP",
    href: "/vip",
  },
  {
    id: "vip-plus",
    title: "VIP+ Diamond",
    subtitle: "Bleu diamant, plus rare, plus précieux",
    accent: "diamond",
    text: "Le palier supérieur pour une image plus rare, plus nette et plus prestigieuse.",
    features: [
      "Tous les avantages VIP",
      "Signature bleu diamant",
      "Présence plus exclusive",
      "Statut premium supérieur",
    ],
    cta: "Voir VIP+",
    href: "/vip/vip-plus?duration=1m",
  },
];

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

function normalizeLevel(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isVipLevel(value?: string | null) {
  const v = normalizeLevel(value);
  return v !== "" && v !== "free" && v !== "standard";
}

function normalizeCategory(raw?: string | null): Exclude<ShopFilter, "all"> {
  const v = String(raw || "").trim().toLowerCase();

  if (["theme", "themes"].includes(v)) return "theme";

  if (["bundle", "bundles", "pack", "packs"].includes(v)) return "bundle";

  if (
    [
      "effect",
      "effects",
      "effet",
      "effets",
      "fx",
      "vip",
      "vip_effect",
      "vip-effects",
    ].includes(v)
  ) {
    return "effect";
  }

  return "effect";
}

function itemCategory(item: ShopItemRow): Exclude<ShopFilter, "all"> {
  return normalizeCategory(item.category);
}

function itemTitle(item: ShopItemRow) {
  return String(item.title || item.slug || "Item");
}

function itemDescription(item: ShopItemRow) {
  return String(item.description || "Effet premium EtherCristal.");
}

function itemBadge(item: ShopItemRow) {
  return String(item.badge || item.category || "Premium");
}

function isVipOnly(item: ShopItemRow) {
  return Boolean(item.metadata?.vip_only);
}

function isUnique(item: ShopItemRow) {
  return Boolean(item.metadata?.unique);
}

function visualTone(item: ShopItemRow) {
  const slug = String(item.slug || "").toLowerCase();
  const category = itemCategory(item);

  if (slug.includes("gold") || slug.includes("ether")) return "gold";
  if (slug.includes("midnight") || slug.includes("dark")) return "dark";
  if (slug.includes("cristal") || slug.includes("diamond")) return "diamond";
  if (slug.includes("desir") || slug.includes("rose")) return "rose";
  if (category === "bundle") return "vip";
  return "default";
}

export default function ShopPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [buyingSlug, setBuyingSlug] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function ensureProfile(userId: string, fallbackUsername: string) {
    const supabase = requireSupabaseBrowserClient();

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || "Impossible de charger le profil.");
    }

    if (profileData) return profileData as ProfileRow;

    const payload = {
      id: userId,
      username: fallbackUsername || "Membre",
      vip_level: "Standard",
      ether_balance: 0,
      is_verified: false,
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      throw new Error(upsertError.message || "Impossible de créer le profil.");
    }

    const { data: createdProfile, error: createdError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (createdError) {
      throw new Error(createdError.message || "Impossible de relire le profil.");
    }

    if (!createdProfile) {
      throw new Error("Profil introuvable après création.");
    }

    return createdProfile as ProfileRow;
  }

  async function loadPage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = requireSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const authUser = authData.user;
      const fallbackUsername = String(
        authUser.user_metadata?.username || authUser.email || "Membre"
      )
        .split("@")[0]
        .slice(0, 24);

      const ensuredProfile = await ensureProfile(authUser.id, fallbackUsername);

      const [{ data: itemRows, error: itemError }, { data: invRows, error: invError }] =
        await Promise.all([
          supabase
            .from("shop_items")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_inventory")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false }),
        ]);

      if (itemError) {
        throw new Error(itemError.message || "Impossible de charger les items.");
      }

      if (invError) {
        throw new Error(invError.message || "Impossible de charger l’inventaire.");
      }

      setProfile(ensuredProfile);
      setItems((itemRows || []) as ShopItemRow[]);
      setInventory((invRows || []) as InventoryRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement boutique.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfileAndInventory() {
    try {
      const supabase = requireSupabaseBrowserClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const [{ data: profileData }, { data: invRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle(),
        supabase
          .from("user_inventory")
          .select("*")
          .eq("user_id", authData.user.id)
          .order("created_at", { ascending: false }),
      ]);

      setProfile((profileData || null) as ProfileRow | null);
      setInventory((invRows || []) as InventoryRow[]);
    } catch {}
  }

  const ownedMap = useMemo(() => {
    const map: Record<string, InventoryRow[]> = {};
    for (const row of inventory) {
      const slug = String(row.item_slug || "");
      if (!slug) continue;
      if (!map[slug]) map[slug] = [];
      map[slug].push(row);
    }
    return map;
  }, [inventory]);

  const activeItems = useMemo(() => inventory.filter((row) => row.is_active), [inventory]);

  const isVip = useMemo(() => isVipLevel(profile?.vip_level), [profile?.vip_level]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const normalized = itemCategory(item);
      const categoryOk = filter === "all" ? true : normalized === filter;

      const text = [
        item.slug,
        item.title,
        item.description,
        item.badge,
        item.category,
        JSON.stringify(item.metadata || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchOk = !q ? true : text.includes(q);
      const knownType = ["effect", "theme", "bundle"].includes(normalized);

      return knownType && categoryOk && searchOk;
    });
  }, [items, search, filter]);

  async function buyWithEther(item: ShopItemRow) {
    try {
      setBuyingSlug(item.slug);
      setNotice("");
      setErrorMsg("");

      if (isVipOnly(item) && !isVip) {
        setErrorMsg("Cet item est réservé aux membres VIP.");
        return;
      }

      const supabase = requireSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("buy_shop_item_with_ether", {
        item_slug_input: item.slug,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible d’acheter cet item.");
        return;
      }

      if (!data?.ok) {
        setErrorMsg(data?.error || "Achat refusé.");
        return;
      }

      setNotice(`${itemTitle(item)} a été ajouté à ton inventaire.`);
      await refreshProfileAndInventory();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur achat Ether.");
    } finally {
      setBuyingSlug("");
    }
  }

  async function buyWithStripe(item: ShopItemRow) {
    try {
      setBuyingSlug(item.slug);
      setNotice("");
      setErrorMsg("");

      if (isVipOnly(item) && !isVip) {
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
          priceName: itemTitle(item),
          amountUsd: Number(item.price_usd),
          mode: "payment",
          metadata: {
            product_slug: item.slug,
            category: item.category || "effect",
            auto_equip: String(Boolean(item.metadata?.auto_equip)),
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.url) {
        setErrorMsg(json?.error || "Impossible de lancer le paiement.");
        return;
      }

      window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur paiement Stripe.");
    } finally {
      setBuyingSlug("");
    }
  }

  function actionButton(item: ShopItemRow) {
    const owned = ownedMap[item.slug] || [];
    const alreadyOwned = owned.length > 0;
    const unique = isUnique(item);
    const vipOnly = isVipOnly(item);
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
      <div className="shop-actionRow">
        {Number(item.price_ether || 0) > 0 ? (
          <button
            className="shop-btn gold"
            type="button"
            disabled={busy}
            onClick={() => void buyWithEther(item)}
          >
            {busy ? "Achat..." : `${Number(item.price_ether || 0)} Ξ`}
          </button>
        ) : null}

        {Number(item.price_usd || 0) > 0 ? (
          <button
            className="shop-btn blue"
            type="button"
            disabled={busy}
            onClick={() => void buyWithStripe(item)}
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
            <h1 className="shop-title">Effets, thèmes, bundles et premium</h1>
            <p className="shop-subtitle">
              Une boutique premium, cohérente et visuelle, pensée pour habiller ton profil et renforcer ton univers.
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
          <div className="shop-accountBlock">
            <div className="shop-heroLabel">Compte</div>
            <div className="shop-heroName" style={getProfileNameStyle(profile)}>
              {getProfileName(profile)}
            </div>
            <div className="shop-heroMeta">
              {profile?.vip_level || "Standard"}
              {profile?.is_verified ? " • Vérifié" : ""}
            </div>

            <p className="shop-heroText">
              Achète des effets visuels, des thèmes et des bundles, puis équipe-les dans l’inventaire pour transformer ton identité sur tout le site.
            </p>
          </div>

          <div className="shop-statPack">
            <div className="shop-statCard">
              <span>Ether</span>
              <strong>{Number(profile?.ether_balance || 0)} Ξ</strong>
            </div>
            <div className="shop-statCard">
              <span>Items possédés</span>
              <strong>{inventory.length}</strong>
            </div>
            <div className="shop-statCard">
              <span>Actifs</span>
              <strong>{activeItems.length}</strong>
            </div>
          </div>
        </section>

        {notice ? <div className="shop-notice">{notice}</div> : null}
        {errorMsg ? <div className="shop-error">{errorMsg}</div> : null}

        <section className="shop-section">
          <div className="shop-sectionHeader">
            <div>
              <div className="shop-sectionKicker">Premium</div>
              <h2 className="shop-sectionTitle vip">Accès VIP & VIP+</h2>
            </div>
          </div>

          <div className="shop-premiumGrid">
            {PREMIUM_CARDS.map((card) => (
              <article key={card.id} className={`shop-premiumCard ${card.accent}`}>
                <div className="shop-premiumGlow" />

                <div className="shop-chipRow">
                  <span className={`shop-chip ${card.accent === "diamond" ? "diamond" : "vip"}`}>
                    {card.accent === "diamond" ? "VIP+" : "VIP"}
                  </span>
                </div>

                <h3 className="shop-cardTitle">{card.title}</h3>
                <div className="shop-premiumSubtitle">{card.subtitle}</div>
                <p className="shop-cardText">{card.text}</p>

                <div className="shop-premiumList">
                  {card.features.map((feature) => (
                    <div key={feature} className="shop-premiumItem">
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="shop-cardActions">
                  <button
                    className={`shop-btn ${card.accent === "diamond" ? "blue" : "gold"}`}
                    type="button"
                    onClick={() => router.push(card.href)}
                  >
                    {card.cta}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shop-filterBar">
          <input
            className="shop-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un effet, un thème ou un bundle..."
          />

          <div className="shop-pillRow">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={`shop-pill ${filter === value ? "active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {FILTER_LABELS[value]}
              </button>
            ))}
          </div>
        </section>

        <section className="shop-section">
          <div className="shop-sectionHeader">
            <div>
              <div className="shop-sectionKicker">Catalogue</div>
              <h2 className="shop-sectionTitle">Effets & thèmes</h2>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <div className="shop-grid">
              {filteredItems.map((item) => {
                const tone = visualTone(item);
                const owned = (ownedMap[item.slug] || []).length > 0;

                return (
                  <article key={item.id} className={`shop-card ${tone}`}>
                    <div className="shop-cardGlow" />

                    <div className="shop-chipRow">
                      <span className="shop-chip">{itemBadge(item)}</span>
                      {owned ? <span className="shop-chip active">Possédé</span> : null}
                      {isUnique(item) ? <span className="shop-chip soft">Unique</span> : null}
                      {isVipOnly(item) ? <span className="shop-chip vip">VIP requis</span> : null}
                    </div>

                    <h3 className="shop-cardTitle">{itemTitle(item)}</h3>
                    <p className="shop-cardText">{itemDescription(item)}</p>

                    <div className="shop-priceGrid">
                      <div className="shop-priceBox">
                        <span>Ether</span>
                        <strong>{Number(item.price_ether || 0)} Ξ</strong>
                      </div>
                      <div className="shop-priceBox">
                        <span>Stripe</span>
                        <strong>
                          {Number(item.price_usd || 0) > 0
                            ? `$${Number(item.price_usd || 0).toFixed(2)}`
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    <div className="shop-cardActions">{actionButton(item)}</div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="shop-emptyBox">
              Aucun effet trouvé. Ajoute d’abord les items dans <code>shop_items</code>.
            </div>
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
    linear-gradient(180deg,#110007 0%, #070205 52%, #020103 100%);
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
  border-radius:28px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.18);
  backdrop-filter:blur(16px);
}
.shop-accountBlock{
  max-width:760px;
}
.shop-heroLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}
.shop-heroName{
  margin-top:8px;
  font-size:36px;
  font-weight:900;
  line-height:1;
}
.shop-heroMeta{
  margin-top:8px;
  color:rgba(255,245,220,0.68);
  font-size:14px;
}
.shop-heroText{
  margin-top:16px;
  color:rgba(255,245,220,0.76);
  line-height:1.8;
}
.shop-statPack{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}
.shop-statCard{
  min-width:150px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.shop-statCard span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.shop-statCard strong{
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
.shop-section{
  margin-top:30px;
}
.shop-sectionHeader{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:end;
  flex-wrap:wrap;
}
.shop-sectionKicker{
  display:inline-flex;
  min-height:30px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff1c4;
  font-size:12px;
  font-weight:800;
}
.shop-sectionTitle{
  margin:14px 0 0;
  font-size:38px;
  line-height:1;
  font-weight:900;
}
.shop-sectionTitle.vip{
  background:linear-gradient(90deg,#fff0c2,#d4af37,#8ddcff);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
.shop-premiumGrid{
  margin-top:20px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
}
.shop-premiumCard{
  position:relative;
  overflow:hidden;
  border-radius:30px;
  padding:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.18);
  backdrop-filter:blur(16px);
  min-height:360px;
  display:flex;
  flex-direction:column;
}
.shop-premiumCard.gold{
  border-color:rgba(212,175,55,0.26);
}
.shop-premiumCard.diamond{
  border-color:rgba(88,176,255,0.24);
}
.shop-premiumGlow{
  position:absolute;
  width:220px;
  height:220px;
  right:-50px;
  bottom:-50px;
  border-radius:999px;
  filter:blur(42px);
  opacity:.18;
}
.shop-premiumCard.gold .shop-premiumGlow{
  background:rgba(212,175,55,0.78);
}
.shop-premiumCard.diamond .shop-premiumGlow{
  background:rgba(88,176,255,0.72);
}
.shop-premiumSubtitle{
  margin-top:10px;
  font-size:16px;
  color:rgba(255,245,220,0.68);
}
.shop-premiumList{
  margin-top:18px;
  display:grid;
  gap:10px;
}
.shop-premiumItem{
  padding:12px 14px;
  border-radius:16px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,245,220,0.78);
}
.shop-filterBar{
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
  margin-top:20px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:18px;
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
  min-height:340px;
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
.shop-card.default .shop-cardGlow{ background:rgba(255,120,90,0.45); }
.shop-card.gold .shop-cardGlow{ background:rgba(212,175,55,0.75); }
.shop-card.vip .shop-cardGlow{ background:rgba(174,92,255,0.65); }
.shop-card.dark .shop-cardGlow{ background:rgba(85,110,255,0.60); }
.shop-card.diamond .shop-cardGlow{ background:rgba(90,210,255,0.60); }
.shop-card.rose .shop-cardGlow{ background:rgba(216,92,114,0.60); }
.shop-chipRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.shop-chip{
  display:inline-flex;
  min-height:30px;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff2d3;
  font-size:11px;
  font-weight:900;
}
.shop-chip.vip{
  background:rgba(139,92,246,0.16);
  border-color:rgba(139,92,246,0.26);
  color:#eadcff;
}
.shop-chip.diamond{
  background:rgba(88,176,255,0.16);
  border-color:rgba(88,176,255,0.24);
  color:#dff5ff;
}
.shop-chip.active{
  background:rgba(47,143,88,0.16);
  border-color:rgba(47,143,88,0.24);
  color:#b9ffd4;
}
.shop-chip.soft{
  background:rgba(255,255,255,0.06);
}
.shop-cardTitle{
  margin:18px 0 0;
  font-size:28px;
  line-height:1;
  font-weight:900;
}
.shop-cardText{
  margin:14px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.75;
  min-height:74px;
}
.shop-priceGrid{
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
.shop-cardActions{
  margin-top:auto;
  padding-top:18px;
}
.shop-actionRow{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
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
.shop-btn.blue{
  background:linear-gradient(90deg,#3b82f6,#8ddcff);
  color:#07131a;
}
.shop-btn.ghost{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff;
}
.shop-emptyBox{
  margin-top:20px;
  padding:18px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
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
  .shop-premiumGrid,
  .shop-grid{
    grid-template-columns:1fr 1fr;
  }
}
@media (max-width: 820px){
  .shop-title{
    font-size:40px;
  }
  .shop-premiumGrid,
  .shop-grid{
    grid-template-columns:1fr;
  }
}
@media (max-width: 560px){
  .shop-title{
    font-size:34px;
  }
  .shop-statPack{
    width:100%;
  }
  .shop-statCard{
    flex:1 1 100%;
  }
  .shop-heroName{
    font-size:28px;
  }
}
`;
