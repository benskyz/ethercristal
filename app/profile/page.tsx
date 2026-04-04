"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../lib/supabase";

type MatchPreference = "soft" | "vip" | "intense";

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  vip_level?: string | null;
  ether_balance?: number | null;
  is_verified?: boolean | null;
  theme_mode?: string | null;
  match_preference?: MatchPreference | null;
  show_online?: boolean | null;
  allow_messages?: boolean | null;
  created_at?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type InventoryRow = {
  id: string;
  item_slug?: string | null;
  item_type?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
};

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isVipLevel(value?: string | null) {
  const v = String(value || "").toLowerCase();
  return v !== "" && v !== "free" && v !== "standard";
}

function inventoryTitle(item: InventoryRow) {
  return String(item.metadata?.title || item.item_slug || "Item");
}

function inventoryBadge(item: InventoryRow) {
  return String(item.metadata?.badge || item.item_type || "premium");
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [matchPreference, setMatchPreference] = useState<MatchPreference>("soft");

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
      theme_mode: "gold",
      match_preference: "soft",
      show_online: true,
      allow_messages: true,
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
      const fallbackUsername =
        String(authUser.user_metadata?.username || authUser.email || "Membre")
          .split("@")[0]
          .slice(0, 24);

      const ensuredProfile = await ensureProfile(authUser.id, fallbackUsername);

      const [
        { data: inventoryRows, error: inventoryError },
        { count: unreadMessages, error: unreadError },
      ] = await Promise.all([
        supabase
          .from("user_inventory")
          .select("*")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("private_messages")
          .select("id", { count: "exact", head: true })
          .eq("to_user", authUser.id)
          .eq("is_read", false),
      ]);

      if (inventoryError) {
        throw new Error(inventoryError.message || "Impossible de charger l’inventaire.");
      }

      if (unreadError) {
        throw new Error(unreadError.message || "Impossible de charger les messages non lus.");
      }

      setProfile(ensuredProfile);
      setInventory((inventoryRows || []) as InventoryRow[]);
      setUnreadCount(Number(unreadMessages || 0));

      setUsername(String(ensuredProfile.username || ""));
      setCity(String(ensuredProfile.city || ""));
      setAvatarUrl(String(ensuredProfile.avatar_url || ""));
      setBio(String(ensuredProfile.bio || ""));
      setMatchPreference(
        (ensuredProfile.match_preference as MatchPreference) || "soft"
      );
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement profil.");
    } finally {
      setLoading(false);
    }
  }

  const isVip = useMemo(() => isVipLevel(profile?.vip_level), [profile?.vip_level]);

  const activeItems = useMemo(() => {
    return inventory.filter((item) => item.is_active);
  }, [inventory]);

  const recentItems = useMemo(() => {
    return inventory.slice(0, 6);
  }, [inventory]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!profile?.id) return;

    try {
      setSaving(true);
      setNotice("");
      setErrorMsg("");

      const cleanUsername = username.trim().replace(/\s+/g, " ");
      const cleanCity = city.trim().slice(0, 60);
      const cleanAvatar = avatarUrl.trim();
      const cleanBio = bio.trim().slice(0, 400);

      if (!cleanUsername || cleanUsername.length < 3) {
        setErrorMsg("Le nom de profil doit contenir au moins 3 caractères.");
        return;
      }

      if (!/^[a-zA-Z0-9._ -]{3,24}$/.test(cleanUsername)) {
        setErrorMsg("Le nom de profil contient des caractères non autorisés.");
        return;
      }

      if (cleanAvatar && !/^https?:\/\//i.test(cleanAvatar)) {
        setErrorMsg("L’avatar URL doit commencer par http:// ou https://");
        return;
      }

      const supabase = requireSupabaseBrowserClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          city: cleanCity || null,
          avatar_url: cleanAvatar || null,
          bio: cleanBio || null,
          match_preference: matchPreference,
        })
        .eq("id", profile.id);

      if (error) {
        setErrorMsg(error.message || "Impossible d’enregistrer le profil.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: cleanUsername,
              city: cleanCity || null,
              avatar_url: cleanAvatar || null,
              bio: cleanBio || null,
              match_preference: matchPreference,
            }
          : prev
      );

      setNotice("Profil enregistré.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur enregistrement profil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="profile-page">
        <style>{css}</style>
        <div className="profile-loading">
          <div className="profile-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <style>{css}</style>

      <div className="profile-bg profile-bg-a" />
      <div className="profile-bg profile-bg-b" />
      <div className="profile-noise" />
      <div className="profile-orb profile-orb-a" />
      <div className="profile-orb profile-orb-b" />

      <div className="profile-shell">
        <header className="profile-topbar">
          <div>
            <div className="profile-kicker">Profil</div>
            <h1 className="profile-title">Mon profil complet</h1>
            <p className="profile-subtitle">
              Ton identité, tes effets, ton activité, ton statut et la gestion complète de ton compte.
            </p>
          </div>

          <div className="profile-topActions">
            <button className="profile-navBtn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="profile-navBtn" type="button" onClick={() => router.push("/shop")}>
              Boutique
            </button>
            <button className="profile-navBtn" type="button" onClick={() => router.push("/inventaire")}>
              Inventaire
            </button>
            <button className="profile-navBtn gold" type="button" onClick={() => router.push("/options")}>
              Options
            </button>
          </div>
        </header>

        <section className="profile-stats">
          <div className="profile-statCard">
            <span>Ether</span>
            <strong>{Number(profile?.ether_balance || 0)} Ξ</strong>
          </div>
          <div className="profile-statCard">
            <span>Grade</span>
            <strong>{profile?.vip_level || "Standard"}</strong>
          </div>
          <div className="profile-statCard">
            <span>Messages non lus</span>
            <strong>{unreadCount}</strong>
          </div>
          <div className="profile-statCard">
            <span>Objets possédés</span>
            <strong>{inventory.length}</strong>
          </div>
        </section>

        {notice ? <div className="profile-notice">{notice}</div> : null}
        {errorMsg ? <div className="profile-error">{errorMsg}</div> : null}

        <section className="profile-grid">
          <article className="profile-card hero">
            <div className="profile-cardShine" />

            <div className="profile-identity">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={getProfileName(profile)}
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar placeholder">
                  {getProfileName(profile).charAt(0).toUpperCase()}
                </div>
              )}

              <div className="profile-identityMain">
                <div className="profile-name" style={getProfileNameStyle(profile)}>
                  {getProfileName(profile)}
                </div>

                <div className="profile-badges">
                  <span className="profile-badge ether">
                    {Number(profile?.ether_balance || 0)} Ξ
                  </span>
                  <span className={`profile-badge ${isVip ? "vip" : "standard"}`}>
                    {profile?.vip_level || "Standard"}
                  </span>
                  {profile?.is_verified ? (
                    <span className="profile-badge verified">Vérifié</span>
                  ) : null}
                </div>

                <p className="profile-bioPreview">
                  {profile?.bio || "Aucune bio pour le moment."}
                </p>
              </div>
            </div>

            <div className="profile-overviewGrid">
              <div className="profile-overviewItem">
                <span>Ville</span>
                <strong>{profile?.city || "—"}</strong>
              </div>
              <div className="profile-overviewItem">
                <span>Inscrit le</span>
                <strong>{formatDate(profile?.created_at)}</strong>
              </div>
              <div className="profile-overviewItem">
                <span>Thème actif</span>
                <strong>{profile?.theme_mode || "gold"}</strong>
              </div>
              <div className="profile-overviewItem">
                <span>Préférence</span>
                <strong>{profile?.match_preference || "soft"}</strong>
              </div>
              <div className="profile-overviewItem">
                <span>Présence</span>
                <strong>{profile?.show_online === false ? "Invisible" : "Visible"}</strong>
              </div>
              <div className="profile-overviewItem">
                <span>Messages privés</span>
                <strong>{profile?.allow_messages === false ? "Limités" : "Ouverts"}</strong>
              </div>
            </div>
          </article>

          <article className="profile-card edit">
            <div className="profile-cardShine" />

            <div className="profile-cardKicker">Édition</div>
            <h2 className="profile-cardTitle">Gérer mon identité</h2>
            <p className="profile-cardText">
              Ici tu modifies la partie visible de ton profil de manière propre.
            </p>

            <form className="profile-form" onSubmit={handleSave}>
              <div className="profile-row two">
                <label className="profile-field">
                  <span>Nom de profil</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ton pseudo"
                    maxLength={24}
                  />
                </label>

                <label className="profile-field">
                  <span>Ville</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ville"
                    maxLength={60}
                  />
                </label>
              </div>

              <label className="profile-field">
                <span>Avatar URL</span>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="profile-field">
                <span>Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ta présentation"
                  maxLength={400}
                />
              </label>

              <label className="profile-field">
                <span>Préférence DésirIntense</span>
                <select
                  value={matchPreference}
                  onChange={(e) => setMatchPreference(e.target.value as MatchPreference)}
                >
                  <option value="soft">Soft</option>
                  <option value="vip">VIP</option>
                  <option value="intense">Intense</option>
                </select>
              </label>

              <div className="profile-formActions">
                <button className="profile-mainBtn" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>

                <button
                  className="profile-secondaryBtn"
                  type="button"
                  onClick={() => router.push("/dashboard")}
                >
                  Dashboard
                </button>

                <button
                  className="profile-secondaryBtn blue"
                  type="button"
                  onClick={() => router.push("/shop")}
                >
                  Boutique
                </button>

                <button
                  className="profile-secondaryBtn violet"
                  type="button"
                  onClick={() => router.push("/inventaire")}
                >
                  Inventaire
                </button>

                <button
                  className="profile-secondaryBtn"
                  type="button"
                  onClick={() => router.push("/options")}
                >
                  Options
                </button>

                <button
                  className="profile-dangerBtn"
                  type="button"
                  onClick={() => router.push("/login")}
                >
                  Déconnexion
                </button>
              </div>
            </form>
          </article>

          <article className="profile-card side">
            <div className="profile-cardShine" />

            <div className="profile-cardKicker">Effets actifs</div>
            <h2 className="profile-cardTitle">État actuel</h2>

            <div className="profile-stateList">
              {activeItems.length > 0 ? (
                activeItems.map((item) => (
                  <div key={item.id} className="profile-stateItem">
                    <div>
                      <strong>{inventoryTitle(item)}</strong>
                      <p>{inventoryBadge(item)}</p>
                    </div>
                    <span className="profile-chip active">Actif</span>
                  </div>
                ))
              ) : (
                <div className="profile-emptyBox">
                  Aucun effet actif pour le moment.
                </div>
              )}
            </div>

            <div className="profile-sideActions">
              <button
                className="profile-secondaryBtn violet full"
                type="button"
                onClick={() => router.push("/inventaire")}
              >
                Gérer mes objets
              </button>
              <button
                className="profile-secondaryBtn blue full"
                type="button"
                onClick={() => router.push("/shop")}
              >
                Aller à la boutique
              </button>
            </div>
          </article>

          <article className="profile-card wide">
            <div className="profile-cardShine" />

            <div className="profile-cardKicker">Inventaire récent</div>
            <h2 className="profile-cardTitle">Derniers objets obtenus</h2>

            <div className="profile-recentGrid">
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <div key={item.id} className="profile-recentCard">
                    <div className="profile-recentTop">
                      <span className="profile-chip">{inventoryBadge(item)}</span>
                      {item.is_active ? (
                        <span className="profile-chip active">Actif</span>
                      ) : null}
                    </div>

                    <strong>{inventoryTitle(item)}</strong>
                    <p>{String(item.item_slug || "—")}</p>
                  </div>
                ))
              ) : (
                <div className="profile-emptyBox">
                  Ton inventaire est vide pour le moment.
                </div>
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
  background:
    radial-gradient(circle at 20% 18%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.profile-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.profile-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.profile-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.18;
}

.profile-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}

.profile-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.profile-orb-a{
  width:220px;
  height:220px;
  left:60px;
  top:100px;
  background:rgba(212,175,55,0.42);
}
.profile-orb-b{
  width:260px;
  height:260px;
  right:80px;
  top:160px;
  background:rgba(180,30,60,0.22);
}

.profile-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.profile-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.profile-kicker{
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

.profile-title{
  margin:16px 0 0;
  font-size:52px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.profile-subtitle{
  margin:14px 0 0;
  max-width:760px;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
  font-size:17px;
}

.profile-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.profile-navBtn{
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
.profile-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.profile-stats{
  margin-top:24px;
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
}

.profile-statCard{
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(212,175,55,0.14);
}
.profile-statCard span{
  display:block;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.profile-statCard strong{
  display:block;
  margin-top:10px;
  font-size:28px;
  color:#fff2cb;
}

.profile-notice,
.profile-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.profile-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.profile-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.profile-grid{
  margin-top:24px;
  display:grid;
  grid-template-columns:1.25fr 1fr 0.75fr;
  gap:20px;
}

.profile-card{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  padding:20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  min-height:200px;
}
.profile-card.hero{
  grid-column:1 / span 2;
}
.profile-card.wide{
  grid-column:1 / span 2;
}
.profile-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:profileShine 7s linear infinite;
  pointer-events:none;
}
@keyframes profileShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.profile-identity{
  display:flex;
  gap:18px;
  align-items:flex-start;
  flex-wrap:wrap;
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
  font-size:48px;
  font-weight:900;
  background:rgba(255,255,255,0.08);
  color:#fff3c2;
  border:1px solid rgba(255,255,255,0.10);
}

.profile-identityMain{
  flex:1;
  min-width:0;
}

.profile-name{
  font-size:48px;
  font-weight:900;
  line-height:1;
  letter-spacing:-1px;
}

.profile-badges{
  margin-top:14px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.profile-badge,
.profile-chip{
  display:inline-flex;
  min-height:34px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff2d3;
  font-size:12px;
  font-weight:900;
}
.profile-badge.ether{
  background:rgba(212,175,55,0.14);
  border-color:rgba(212,175,55,0.22);
  color:#fff1c4;
}
.profile-badge.vip{
  background:rgba(139,92,246,0.16);
  border-color:rgba(139,92,246,0.26);
  color:#eadcff;
}
.profile-badge.standard{
  background:rgba(255,255,255,0.08);
}
.profile-badge.verified{
  background:rgba(47,143,88,0.16);
  border-color:rgba(47,143,88,0.24);
  color:#b9ffd4;
}
.profile-chip.active{
  background:rgba(47,143,88,0.16);
  border-color:rgba(47,143,88,0.24);
  color:#b9ffd4;
}

.profile-bioPreview{
  margin:18px 0 0;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
}

.profile-overviewGrid{
  margin-top:22px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}

.profile-overviewItem{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.profile-overviewItem span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.profile-overviewItem strong{
  display:block;
  margin-top:8px;
  font-size:20px;
  color:#fff2cb;
}

.profile-cardKicker{
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
.profile-cardTitle{
  margin:14px 0 0;
  font-size:38px;
  line-height:1;
  letter-spacing:-1px;
  font-weight:900;
}
.profile-cardText{
  margin:14px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.8;
}

.profile-form{
  margin-top:22px;
  display:grid;
  gap:14px;
}
.profile-row.two{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
}
.profile-field{
  display:grid;
  gap:10px;
}
.profile-field span{
  font-size:13px;
  color:rgba(255,255,255,0.76);
}
.profile-field input,
.profile-field textarea,
.profile-field select{
  width:100%;
  min-height:54px;
  padding:0 16px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.profile-field textarea{
  min-height:140px;
  padding:14px 16px;
  resize:vertical;
}
.profile-field input::placeholder,
.profile-field textarea::placeholder{
  color:rgba(255,255,255,0.42);
}

.profile-formActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:4px;
}

.profile-mainBtn,
.profile-secondaryBtn,
.profile-dangerBtn{
  min-height:48px;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.profile-mainBtn{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.profile-secondaryBtn{
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
}
.profile-secondaryBtn.blue{
  background:linear-gradient(90deg,#3366cc,#5a95ff);
  color:#fff;
  border-color:transparent;
}
.profile-secondaryBtn.violet{
  background:linear-gradient(90deg,#6b42b8,#9c6cff);
  color:#fff;
  border-color:transparent;
}
.profile-secondaryBtn.full{
  width:100%;
}
.profile-dangerBtn{
  background:linear-gradient(90deg,#a43a48,#ff7b6b);
  color:#fff;
}

.profile-stateList{
  margin-top:20px;
  display:grid;
  gap:12px;
}
.profile-stateItem{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.profile-stateItem strong{
  display:block;
  font-size:16px;
}
.profile-stateItem p{
  margin:6px 0 0;
  color:rgba(255,245,220,0.64);
  font-size:13px;
}

.profile-sideActions{
  margin-top:18px;
  display:grid;
  gap:10px;
}

.profile-recentGrid{
  margin-top:20px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;
}
.profile-recentCard{
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.profile-recentTop{
  display:flex;
  justify-content:space-between;
  gap:8px;
  flex-wrap:wrap;
}
.profile-recentCard strong{
  display:block;
  margin-top:14px;
  font-size:18px;
  color:#fff2cb;
}
.profile-recentCard p{
  margin:8px 0 0;
  color:rgba(255,245,220,0.64);
  font-size:13px;
  line-height:1.6;
}

.profile-emptyBox{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:rgba(255,245,220,0.74);
}

.profile-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.profile-loader{
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
  .profile-grid{
    grid-template-columns:1fr 1fr;
  }

  .profile-card.hero,
  .profile-card.wide{
    grid-column:auto;
  }

  .profile-recentGrid{
    grid-template-columns:1fr 1fr;
  }

  .profile-overviewGrid{
    grid-template-columns:1fr 1fr;
  }
}

@media (max-width: 820px){
  .profile-grid{
    grid-template-columns:1fr;
  }

  .profile-stats{
    grid-template-columns:1fr 1fr;
  }

  .profile-row.two,
  .profile-overviewGrid,
  .profile-recentGrid{
    grid-template-columns:1fr;
  }

  .profile-name{
    font-size:38px;
  }
}

@media (max-width: 560px){
  .profile-title{
    font-size:38px;
  }

  .profile-stats{
    grid-template-columns:1fr;
  }

  .profile-avatar,
  .profile-avatar.placeholder{
    width:92px;
    height:92px;
    border-radius:22px;
    font-size:36px;
  }

  .profile-formActions{
    flex-direction:column;
  }
}
`;
