"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

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
  avatar_url?: string | null;
  theme_mode?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type InventoryFilter = "all" | "effect" | "theme" | "bundle" | "vip";

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

function getItemTitle(item: InventoryRow) {
  return String(item.metadata?.title || item.item_slug || "Item");
}

function getItemDescription(item: InventoryRow) {
  return String(item.metadata?.description || "Objet premium EtherCristal.");
}

function getItemBadge(item: InventoryRow) {
  return String(item.metadata?.badge || item.item_type || "premium");
}

function getItemType(item: InventoryRow): InventoryFilter {
  const type = String(item.item_type || "effect").toLowerCase();
  if (type === "theme") return "theme";
  if (type === "bundle") return "bundle";
  if (type === "vip") return "vip";
  return "effect";
}

function getVisualMood(item: InventoryRow) {
  const slug = String(item.item_slug || "").toLowerCase();
  const type = getItemType(item);

  if (type === "vip" || slug.includes("vip")) return "vip";
  if (slug.includes("gold") || slug.includes("ether")) return "gold";
  if (slug.includes("midnight") || slug.includes("dark")) return "dark";
  if (slug.includes("cristal") || slug.includes("diamond")) return "cristal";
  return "default";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA");
}

export default function InventairePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");

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

      const [{ data: profileData, error: profileError }, { data: invRows, error: invError }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
          supabase.from("user_inventory").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
        ]);

      if (profileError) {
        setErrorMsg(profileError.message || "Impossible de charger le profil.");
        setLoading(false);
        return;
      }

      if (invError) {
        setErrorMsg(invError.message || "Impossible de charger l’inventaire.");
        setLoading(false);
        return;
      }

      setProfile((profileData || null) as ProfileRow | null);
      setInventory((invRows || []) as InventoryRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement inventaire.");
    } finally {
      setLoading(false);
    }
  }

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const type = getItemType(item);
      const text = [
        item.item_slug,
        item.item_type,
        item.metadata?.title,
        item.metadata?.description,
        item.metadata?.badge,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const filterOk = filter === "all" ? true : type === filter;
      const searchOk = !q ? true : text.includes(q);

      return filterOk && searchOk;
    });
  }, [inventory, filter, search]);

  const activeByType = useMemo(() => {
    const map: Record<string, InventoryRow> = {};
    for (const item of inventory) {
      if (!item.is_active) continue;
      map[String(item.item_type || "effect").toLowerCase()] = item;
    }
    return map;
  }, [inventory]);

  const activeCount = useMemo(() => inventory.filter((item) => item.is_active).length, [inventory]);

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

  async function handleEquip(item: InventoryRow) {
    try {
      setBusyItemId(item.id);
      setNotice("");
      setErrorMsg("");

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("equip_inventory_item", {
        item_id_input: item.id,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible d’équiper cet item.");
        return;
      }

      if (!data?.ok) {
        setErrorMsg(data?.error || "Équipement refusé.");
        return;
      }

      setNotice(`${getItemTitle(item)} équipé.`);
      await refreshProfileAndInventory();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur équipement.");
    } finally {
      setBusyItemId("");
    }
  }

  async function handleUnequip(item: InventoryRow) {
    try {
      setBusyItemId(item.id);
      setNotice("");
      setErrorMsg("");

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("unequip_inventory_item", {
        item_id_input: item.id,
      });

      if (error) {
        setErrorMsg(error.message || "Impossible de retirer cet item.");
        return;
      }

      if (!data?.ok) {
        setErrorMsg(data?.error || "Retrait refusé.");
        return;
      }

      setNotice(`${getItemTitle(item)} retiré.`);
      await refreshProfileAndInventory();
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur retrait item.");
    } finally {
      setBusyItemId("");
    }
  }

  if (loading) {
    return (
      <main className="inv-page">
        <style>{css}</style>
        <div className="inv-loading">
          <div className="inv-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="inv-page">
      <style>{css}</style>

      <div className="inv-bg inv-bg-a" />
      <div className="inv-bg inv-bg-b" />
      <div className="inv-noise" />
      <div className="inv-orb inv-orb-a" />
      <div className="inv-orb inv-orb-b" />

      <div className="inv-shell">
        <header className="inv-topbar">
          <div>
            <div className="inv-kicker">Inventaire EtherCristal</div>
            <h1 className="inv-title">Tes objets et effets équipables</h1>
            <p className="inv-subtitle">
              Tout ce que tu possèdes se gère ici. Tu équipes, tu retires, et ton profil se met à jour.
            </p>
          </div>

          <div className="inv-topActions">
            <button className="inv-navBtn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="inv-navBtn" type="button" onClick={() => router.push("/shop")}>
              Boutique
            </button>
            <button className="inv-navBtn gold" type="button" onClick={() => router.push("/profile")}>
              Profil
            </button>
          </div>
        </header>

        <section className="inv-heroCard">
          <div>
            <div className="inv-statusLabel">Compte</div>
            <div className="inv-statusName" style={getProfileNameStyle(profile)}>
              {getProfileName(profile)}
            </div>
            <div className="inv-statusMeta">
              {profile?.vip_level || "Standard"}
              {profile?.is_verified ? " • Vérifié" : ""}
              {profile?.theme_mode ? ` • thème ${profile.theme_mode}` : ""}
            </div>
          </div>

          <div className="inv-statPack">
            <div className="inv-stat">
              <span>Items possédés</span>
              <strong>{inventory.length}</strong>
            </div>
            <div className="inv-stat">
              <span>Actifs</span>
              <strong>{activeCount}</strong>
            </div>
            <div className="inv-stat">
              <span>Ether</span>
              <strong>{Number(profile?.ether_balance || 0)} Ξ</strong>
            </div>
          </div>
        </section>

        {notice ? <div className="inv-notice">{notice}</div> : null}
        {errorMsg ? <div className="inv-error">{errorMsg}</div> : null}

        <section className="inv-filters">
          <input
            className="inv-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher dans l’inventaire..."
          />

          <div className="inv-pillRow">
            {(["all", "effect", "theme", "bundle", "vip"] as InventoryFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`inv-pill ${filter === value ? "active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="inv-grid">
          {filteredInventory.length > 0 ? (
            filteredInventory.map((item) => {
              const type = String(item.item_type || "effect").toLowerCase();
              const sameTypeActive = activeByType[type]?.id === item.id;
              const busy = busyItemId === item.id;
              const mood = getVisualMood(item);

              return (
                <article key={item.id} className={`inv-card ${mood}`}>
                  <div className="inv-cardGlow" />

                  <div className="inv-badgeRow">
                    <span className="inv-badge">{getItemBadge(item)}</span>
                    <span className={`inv-badge ${sameTypeActive ? "active" : "soft"}`}>
                      {sameTypeActive ? "Actif" : "Possédé"}
                    </span>
                  </div>

                  <h2 className="inv-cardTitle">{getItemTitle(item)}</h2>
                  <p className="inv-cardText">{getItemDescription(item)}</p>

                  <div className="inv-metaBox">
                    <div className="inv-metaRow">
                      <span>Type</span>
                      <strong>{item.item_type || "effect"}</strong>
                    </div>
                    <div className="inv-metaRow">
                      <span>Ajouté</span>
                      <strong>{formatDate(item.created_at)}</strong>
                    </div>
                    <div className="inv-metaRow">
                      <span>Slug</span>
                      <strong>{item.item_slug || "—"}</strong>
                    </div>
                  </div>

                  <div className="inv-actions">
                    {sameTypeActive ? (
                      <button
                        className="inv-btn ghost"
                        type="button"
                        disabled={busy}
                        onClick={() => void handleUnequip(item)}
                      >
                        {busy ? "Retrait..." : "Retirer"}
                      </button>
                    ) : (
                      <button
                        className="inv-btn gold"
                        type="button"
                        disabled={busy}
                        onClick={() => void handleEquip(item)}
                      >
                        {busy ? "Équipement..." : "Équiper"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="inv-empty">Aucun item trouvé dans ton inventaire.</div>
          )}
        </section>
      </div>
    </main>
  );
}

const css = `
.inv-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.inv-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.inv-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.inv-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.18;
}

.inv-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}

.inv-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.inv-orb-a{
  width:220px;
  height:220px;
  left:60px;
  top:100px;
  background:rgba(212,175,55,0.42);
}
.inv-orb-b{
  width:260px;
  height:260px;
  right:80px;
  top:160px;
  background:rgba(180,30,60,0.22);
}

.inv-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.inv-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.inv-kicker{
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

.inv-title{
  margin:16px 0 0;
  font-size:52px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.inv-subtitle{
  margin:14px 0 0;
  max-width:760px;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
  font-size:17px;
}

.inv-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.inv-navBtn{
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
.inv-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.inv-heroCard{
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

.inv-statusLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}

.inv-statusName{
  margin-top:8px;
  font-size:32px;
  font-weight:900;
  line-height:1;
}

.inv-statusMeta{
  margin-top:8px;
  color:rgba(255,245,220,0.68);
  font-size:14px;
}

.inv-statPack{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.inv-stat{
  min-width:150px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.inv-stat span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.inv-stat strong{
  display:block;
  margin-top:8px;
  font-size:24px;
  color:#fff2cb;
}

.inv-notice,
.inv-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.inv-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.inv-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.inv-filters{
  margin-top:24px;
  display:grid;
  gap:14px;
}

.inv-search{
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
.inv-search::placeholder{
  color:rgba(255,255,255,0.42);
}

.inv-pillRow{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.inv-pill{
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
.inv-pill.active{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.inv-grid{
  margin-top:24px;
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:20px;
}

.inv-card{
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

.inv-cardGlow{
  position:absolute;
  width:180px;
  height:180px;
  right:-40px;
  bottom:-40px;
  border-radius:999px;
  filter:blur(36px);
  opacity:.18;
}
.inv-card.gold .inv-cardGlow{ background:rgba(212,175,55,0.75); }
.inv-card.vip .inv-cardGlow{ background:rgba(174,92,255,0.65); }
.inv-card.dark .inv-cardGlow{ background:rgba(85,110,255,0.60); }
.inv-card.cristal .inv-cardGlow{ background:rgba(90,210,255,0.60); }
.inv-card.default .inv-cardGlow{ background:rgba(255,120,90,0.45); }

.inv-badgeRow{
  position:relative;
  z-index:2;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.inv-badge{
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
.inv-badge.active{
  background:rgba(47,143,88,0.16);
  color:#b9ffd4;
  border-color:rgba(47,143,88,0.24);
}
.inv-badge.soft{
  background:rgba(255,255,255,0.06);
}

.inv-cardTitle{
  position:relative;
  z-index:2;
  margin:18px 0 0;
  font-size:28px;
  line-height:1;
  font-weight:900;
}

.inv-cardText{
  position:relative;
  z-index:2;
  margin:14px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.75;
  min-height:74px;
}

.inv-metaBox{
  position:relative;
  z-index:2;
  margin-top:18px;
  display:grid;
  gap:10px;
}

.inv-metaRow{
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:12px 14px;
  border-radius:16px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.inv-metaRow span{
  color:rgba(255,245,220,0.64);
}
.inv-metaRow strong{
  color:#fff2cb;
  text-align:right;
}

.inv-actions{
  position:relative;
  z-index:2;
  margin-top:auto;
  padding-top:18px;
}

.inv-btn{
  min-height:48px;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
  width:100%;
}
.inv-btn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.inv-btn.ghost{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff;
}

.inv-empty{
  padding:20px;
  border-radius:20px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.72);
}

.inv-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.inv-loader{
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
  .inv-grid{
    grid-template-columns:1fr 1fr;
  }
}

@media (max-width: 760px){
  .inv-title{
    font-size:40px;
  }

  .inv-subtitle{
    font-size:16px;
  }

  .inv-grid{
    grid-template-columns:1fr;
  }

  .inv-statPack{
    width:100%;
  }

  .inv-stat{
    flex:1 1 100%;
  }
}
`;
