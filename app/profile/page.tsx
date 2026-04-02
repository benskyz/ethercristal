"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  ether_balance?: number | null;
  vip_level?: string | null;
  is_verified?: boolean | null;
  is_admin?: boolean | null;
  theme_mode?: string | null;
  match_preference?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
  show_online?: boolean | null;
  allow_messages?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InventoryRow = {
  id: string;
  item_slug?: string | null;
  item_type?: string | null;
  is_active?: boolean | null;
  metadata?: any;
  acquired_at?: string | null;
};

type PurchaseRow = {
  id: string;
  item_slug?: string | null;
  payment_type?: string | null;
  amount_ether?: number | null;
  amount_usd?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type MessageRow = {
  id: string;
  is_read?: boolean | null;
  created_at?: string | null;
};

type RoomMemberRow = {
  id: string;
  room_id?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  joined_at?: string | null;
};

function getDisplayName(profile: ProfileRow | null, email: string) {
  const username = String(profile?.username || "").trim();
  if (username) return username;
  if (email) return email.split("@")[0];
  return "Membre";
}

function getDisplayNameStyle(profile: ProfileRow | null): CSSProperties {
  if (!profile) {
    return {
      color: "#fff6d6",
      textShadow: "0 0 16px rgba(212,175,55,0.14)",
    };
  }

  if (profile.display_name_gradient) {
    return {
      background: profile.display_name_gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: profile.display_name_glow
        ? `0 0 18px ${profile.display_name_glow}`
        : "0 0 16px rgba(212,175,55,0.14)",
    };
  }

  return {
    color: profile.display_name_color || "#fff6d6",
    textShadow: profile.display_name_glow
      ? `0 0 18px ${profile.display_name_glow}`
      : "0 0 16px rgba(212,175,55,0.14)",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-CA");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA");
}

function getThemeLabel(theme?: string | null) {
  const normalized = String(theme || "gold").toLowerCase();
  if (normalized === "dark") return "Dark";
  if (normalized === "velvet") return "Velvet";
  return "Gold";
}

function getVipLabel(vip?: string | null) {
  return String(vip || "Standard");
}

function getInventoryLabel(item: InventoryRow) {
  return item.item_slug || item.item_type || "Item";
}

function getInventoryMeta(item: InventoryRow) {
  const type = String(item.item_type || "effect");
  const active = item.is_active ? "équipé" : "stocké";
  return `${type} • ${active}`;
}

function getPurchaseAmount(purchase: PurchaseRow) {
  if (purchase.amount_ether) return `${purchase.amount_ether} Ξ`;
  if (purchase.amount_usd) return `${purchase.amount_usd} $`;
  return "—";
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [recentRooms, setRecentRooms] = useState<RoomMemberRow[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [city, setCity] = useState("");
  const [matchPreference, setMatchPreference] = useState("soft");

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadProfilePage();
  }, []);

  async function loadProfilePage() {
    setLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const supabase = getSupabaseBrowserClient();

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const userId = authData.user.id;
      const email = String(authData.user.email || "");
      setUserEmail(email);

      const [
        profileRes,
        inventoryRes,
        purchasesRes,
        unreadRes,
        roomsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("user_inventory")
          .select("*")
          .eq("user_id", userId)
          .order("acquired_at", { ascending: false })
          .limit(12),
        supabase
          .from("shop_purchases")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("private_messages")
          .select("id,is_read,created_at")
          .eq("to_user", userId)
          .eq("is_read", false),
        supabase
          .from("salon_room_members")
          .select("*")
          .eq("user_id", userId)
          .order("joined_at", { ascending: false })
          .limit(6),
      ]);

      if (profileRes.error) {
        setErrorMsg(profileRes.error.message || "Impossible de charger le profil.");
        setLoading(false);
        return;
      }

      const nextProfile = (profileRes.data || null) as ProfileRow | null;
      setProfile(nextProfile);

      setUsername(String(nextProfile?.username || ""));
      setBio(String(nextProfile?.bio || ""));
      setAvatarUrl(String(nextProfile?.avatar_url || ""));
      setCity(String(nextProfile?.city || ""));
      setMatchPreference(String(nextProfile?.match_preference || "soft"));

      if (!inventoryRes.error) {
        setInventory((inventoryRes.data || []) as InventoryRow[]);
      }

      if (!purchasesRes.error) {
        setPurchases((purchasesRes.data || []) as PurchaseRow[]);
      }

      if (!unreadRes.error) {
        setUnreadMessages((unreadRes.data || []).length);
      }

      if (!roomsRes.error) {
        setRecentRooms((roomsRes.data || []) as RoomMemberRow[]);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement profil.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      setSaving(true);
      setNotice("");
      setErrorMsg("");

      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const patch = {
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        city: city.trim() || null,
        match_preference: matchPreference || "soft",
      };

      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", authData.user.id);

      if (error) {
        setErrorMsg(error.message || "Impossible d’enregistrer le profil.");
        return;
      }

      setProfile((prev) => ({
        ...(prev || { id: authData.user.id }),
        ...patch,
      }));

      setNotice("Profil enregistré.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur sauvegarde profil.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = useMemo(
    () => getDisplayName(profile, userEmail),
    [profile, userEmail]
  );

  const displayNameStyle = useMemo(
    () => getDisplayNameStyle(profile),
    [profile]
  );

  const etherBalance = useMemo(
    () => Number(profile?.ether_balance || 0),
    [profile?.ether_balance]
  );

  const activeInventory = useMemo(
    () => inventory.filter((item) => Boolean(item.is_active)),
    [inventory]
  );

  if (loading) {
    return (
      <main className="profile-page">
        <style>{css}</style>
        <div className="ec-loading-screen">
          <div className="ec-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <style>{css}</style>

      <div className="profile-bg profile-bg-a" />
      <div className="profile-bg profile-bg-b" />
      <div className="ec-grid-noise" />
      <div className="ec-gold-orb profile-orb-a" />
      <div className="ec-gold-orb profile-orb-b" />

      <div className="ec-page-shell">
        <header className="ec-header">
          <div>
            <div className="ec-kicker">Profil</div>
            <h1 className="ec-title">Mon profil complet</h1>
            <p className="ec-subtitle">
              Ton identité, tes effets, ton activité et la gestion complète de ton compte.
            </p>
          </div>

          <div className="ec-sidecards">
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Éther</span>
              <strong>{etherBalance} Ξ</strong>
            </div>
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Grade</span>
              <strong>{getVipLabel(profile?.vip_level)}</strong>
            </div>
            <div className="ec-sidecard">
              <span className="ec-sidecard-label">Messages non lus</span>
              <strong>{unreadMessages}</strong>
            </div>
          </div>
        </header>

        {notice ? <div className="ec-notice">{notice}</div> : null}
        {errorMsg ? <div className="ec-error">{errorMsg}</div> : null}

        <section className="profile-topGrid ec-section">
          <article className="ec-card profile-identityCard">
            <div className="ec-card-shine" />

            <div className="profile-avatarWrap">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar placeholder">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="profile-name" style={displayNameStyle}>
              {displayName}
            </div>

            <div className="profile-badges">
              <span className="ec-badge ec-badge-gold">{etherBalance} Ξ</span>
              <span className="ec-badge ec-badge-soft">
                {getVipLabel(profile?.vip_level)}
              </span>
              {profile?.is_verified ? (
                <span className="ec-badge ec-badge-blue">Vérifié</span>
              ) : null}
              {profile?.is_admin ? (
                <span className="ec-badge ec-badge-danger">Admin</span>
              ) : null}
            </div>

            <div className="profile-identityText">
              <p>{profile?.bio || "Aucune bio pour le moment."}</p>
            </div>

            <div className="profile-meta">
              <div className="ec-stat-card">
                <span className="ec-stat-label">Ville</span>
                <strong>{profile?.city || "—"}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Inscrit le</span>
                <strong>{formatDate(profile?.created_at)}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Thème actif</span>
                <strong>{getThemeLabel(profile?.theme_mode)}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Préférence</span>
                <strong>{profile?.match_preference || "soft"}</strong>
              </div>
            </div>
          </article>

          <article className="ec-card profile-formCard">
            <div className="ec-card-shine" />
            <div className="ec-card-kicker">Édition</div>
            <h2 className="ec-card-title">Gérer mon identité</h2>
            <p className="ec-card-text">
              Ici tu modifies la partie visible de ton profil de manière propre.
            </p>

            <div className="profile-form">
              <label className="ec-field">
                <span className="ec-field-label">Nom de profil</span>
                <input
                  className="ec-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nom affiché"
                />
              </label>

              <label className="ec-field">
                <span className="ec-field-label">Ville</span>
                <input
                  className="ec-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ville"
                />
              </label>

              <label className="ec-field profile-form-full">
                <span className="ec-field-label">Avatar URL</span>
                <input
                  className="ec-input"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="ec-field profile-form-full">
                <span className="ec-field-label">Bio</span>
                <textarea
                  className="ec-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ta présentation"
                />
              </label>

              <label className="ec-field profile-form-full">
                <span className="ec-field-label">Préférence DésirIntense</span>
                <select
                  className="ec-select"
                  value={matchPreference}
                  onChange={(e) => setMatchPreference(e.target.value)}
                >
                  <option value="soft">Soft</option>
                  <option value="vip">VIP</option>
                  <option value="intense">Intense</option>
                </select>
              </label>

              <div className="profile-actions profile-form-full">
                <button
                  className="ec-btn ec-btn-gold"
                  onClick={() => void saveProfile()}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>

                <button
                  className="ec-btn ec-btn-ghost"
                  onClick={() => router.push("/dashboard")}
                  type="button"
                >
                  Dashboard
                </button>

                <button
                  className="ec-btn ec-btn-blue"
                  onClick={() => router.push("/shop")}
                  type="button"
                >
                  Boutique
                </button>

                <button
                  className="ec-btn ec-btn-vip"
                  onClick={() => router.push("/inventaire")}
                  type="button"
                >
                  Inventaire
                </button>

                <button
                  className="ec-btn ec-btn-ghost"
                  onClick={() => router.push("/options")}
                  type="button"
                >
                  Options
                </button>

                <button
                  className="ec-btn ec-btn-danger"
                  onClick={() => void signOut()}
                  type="button"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </article>
        </section>

        <section className="profile-bottomGrid ec-section">
          <article className="ec-card">
            <div className="ec-card-shine" />
            <div className="ec-card-kicker">Effets & inventaire</div>
            <h2 className="ec-card-title">Effets actifs</h2>
            <p className="ec-card-text">
              Ce qui est actuellement possédé et réellement visible sur ton identité.
            </p>

            <div className="profile-effectsRow">
              <div className="ec-stat-card">
                <span className="ec-stat-label">Couleur nom</span>
                <strong>{profile?.display_name_color || "Aucune"}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Glow</span>
                <strong>{profile?.display_name_glow || "Aucun"}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Gradient</span>
                <strong>{profile?.display_name_gradient ? "Actif" : "Aucun"}</strong>
              </div>
            </div>

            <div className="profile-list">
              {activeInventory.length > 0 ? (
                activeInventory.map((item) => (
                  <div key={item.id} className="profile-listRow">
                    <div>
                      <strong>{getInventoryLabel(item)}</strong>
                      <p>{getInventoryMeta(item)}</p>
                    </div>
                    <span className="ec-badge ec-badge-gold">Équipé</span>
                  </div>
                ))
              ) : (
                <div className="profile-empty">Aucun effet actif pour le moment.</div>
              )}
            </div>
          </article>

          <article className="ec-card">
            <div className="ec-card-shine" />
            <div className="ec-card-kicker">Achats</div>
            <h2 className="ec-card-title">Historique récent</h2>
            <p className="ec-card-text">
              Résumé rapide de tes derniers achats boutique.
            </p>

            <div className="profile-list">
              {purchases.length > 0 ? (
                purchases.map((purchase) => (
                  <div key={purchase.id} className="profile-listRow">
                    <div>
                      <strong>{purchase.item_slug || "Produit"}</strong>
                      <p>
                        {purchase.payment_type || "—"} • {getPurchaseAmount(purchase)}
                      </p>
                    </div>
                    <span className="ec-badge ec-badge-soft">
                      {purchase.status || "completed"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="profile-empty">Aucun achat récent.</div>
              )}
            </div>
          </article>
        </section>

        <section className="profile-bottomGrid ec-section">
          <article className="ec-card">
            <div className="ec-card-shine" />
            <div className="ec-card-kicker">Activité</div>
            <h2 className="ec-card-title">Résumé du compte</h2>
            <p className="ec-card-text">
              Un aperçu simple de ce que tu utilises réellement sur le site.
            </p>

            <div className="profile-effectsRow">
              <div className="ec-stat-card">
                <span className="ec-stat-label">Messages non lus</span>
                <strong>{unreadMessages}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Objets inventaire</span>
                <strong>{inventory.length}</strong>
              </div>
              <div className="ec-stat-card">
                <span className="ec-stat-label">Achats récents</span>
                <strong>{purchases.length}</strong>
              </div>
            </div>
          </article>

          <article className="ec-card">
            <div className="ec-card-shine" />
            <div className="ec-card-kicker">Salons</div>
            <h2 className="ec-card-title">Rooms récentes</h2>
            <p className="ec-card-text">
              Tes dernières entrées ou traces d’activité dans les salons.
            </p>

            <div className="profile-list">
              {recentRooms.length > 0 ? (
                recentRooms.map((room) => (
                  <div key={room.id} className="profile-listRow">
                    <div>
                      <strong>{room.room_id || "Room"}</strong>
                      <p>
                        {room.role || "participant"} • {formatDateTime(room.joined_at)}
                      </p>
                    </div>
                    <span
                      className={`ec-badge ${
                        room.is_active ? "ec-badge-gold" : "ec-badge-soft"
                      }`}
                    >
                      {room.is_active ? "Active" : "Historique"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="profile-empty">Aucune room récente.</div>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

const css = `
.profile-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:linear-gradient(180deg,#100307 0%, #090205 42%, #050205 100%);
  color:#fff;
}

.profile-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.profile-bg-a{
  background:
    radial-gradient(circle at 18% 18%, rgba(212,175,55,0.10), transparent 34%),
    radial-gradient(circle at 80% 20%, rgba(255,170,40,0.06), transparent 28%),
    radial-gradient(circle at 58% 76%, rgba(130,0,25,0.18), transparent 42%);
}
.profile-bg-b{
  background:
    radial-gradient(circle at 70% 55%, rgba(255,255,255,0.03), transparent 18%),
    radial-gradient(circle at 35% 70%, rgba(212,175,55,0.07), transparent 24%);
  filter:blur(8px);
}

.profile-orb-a{
  width:180px;
  height:180px;
  left:180px;
  top:80px;
  background:rgba(212,175,55,0.55);
}
.profile-orb-b{
  width:220px;
  height:220px;
  right:120px;
  top:180px;
  background:rgba(255,140,60,0.24);
}

.profile-topGrid{
  display:grid;
  grid-template-columns:420px 1fr;
  gap:24px;
}

.profile-bottomGrid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:24px;
}

.profile-identityCard{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
}

.profile-avatarWrap{
  margin-bottom:18px;
}
.profile-avatar{
  width:120px;
  height:120px;
  border-radius:28px;
  object-fit:cover;
  border:1px solid rgba(255,255,255,0.10);
}
.profile-avatar.placeholder{
  width:120px;
  height:120px;
  border-radius:28px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:42px;
  font-weight:900;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff3c2;
}

.profile-name{
  font-size:34px;
  line-height:1;
  font-weight:900;
  letter-spacing:-0.05em;
}

.profile-badges{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:16px;
}

.profile-identityText{
  margin-top:18px;
}
.profile-identityText p{
  margin:0;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
}

.profile-meta{
  display:grid;
  gap:12px;
  margin-top:22px;
  width:100%;
}

.profile-form{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
  margin-top:18px;
}
.profile-form-full{
  grid-column:1 / -1;
}

.profile-actions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.profile-effectsRow{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
  margin-top:18px;
}

.profile-list{
  display:flex;
  flex-direction:column;
  gap:12px;
  margin-top:18px;
}
.profile-listRow{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.profile-listRow p{
  margin:6px 0 0;
  color:rgba(255,245,220,0.62);
}
.profile-empty{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.70);
}

@media (max-width: 980px){
  .profile-topGrid,
  .profile-bottomGrid{
    grid-template-columns:1fr;
  }

  .profile-effectsRow{
    grid-template-columns:1fr;
  }
}

@media (max-width: 760px){
  .profile-form{
    grid-template-columns:1fr;
  }

  .profile-listRow{
    flex-direction:column;
    align-items:flex-start;
  }
}
`;
