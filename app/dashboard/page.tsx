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
  is_admin?: boolean | null;
};

type RoomCountRow = {
  room_id?: string | number | null;
  room_name?: string | null;
  slug?: string | null;
  viewers_count?: number | null;
  members_count?: number | null;
  is_live?: boolean | null;
};

const BASE_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: "✦" },
  { label: "Messages", href: "/messages", icon: "💬" },
  { label: "Salons", href: "/salons", icon: "🎥" },
  { label: "Shop", href: "/shop", icon: "🛍️" },
  { label: "Profil", href: "/profile", icon: "🖤" },
  { label: "VIP", href: "/vip", icon: "👑" },
  { label: "Options", href: "/options", icon: "⚙️" },
];

function getDisplayName(profile: ProfileRow | null) {
  return String(profile?.username || "Membre");
}

function getVipName(profile: ProfileRow | null) {
  return String(profile?.vip_level || "Standard");
}

function getInitial(profile: ProfileRow | null) {
  return getDisplayName(profile).trim().charAt(0).toUpperCase() || "M";
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [rooms, setRooms] = useState<RoomCountRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function ensureProfile(userId: string, fallbackUsername: string) {
    const supabase = requireSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Impossible de charger le profil.");
    }

    if (data) return data as ProfileRow;

    const payload = {
      id: userId,
      username: fallbackUsername || "Membre",
      vip_level: "Standard",
      ether_balance: 0,
      is_verified: false,
      is_admin: false,
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      throw new Error(upsertError.message || "Impossible de créer le profil.");
    }

    const { data: created, error: createdError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (createdError) {
      throw new Error(createdError.message || "Impossible de relire le profil.");
    }

    if (!created) {
      throw new Error("Profil introuvable après création.");
    }

    return created as ProfileRow;
  }

  async function loadDashboard() {
    setLoading(true);
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

      const { data: roomData, error: roomError } = await supabase
        .from("salon_room_counts")
        .select("*")
        .order("viewers_count", { ascending: false });

      if (roomError) {
        throw new Error(roomError.message || "Impossible de charger les salons.");
      }

      setProfile(ensuredProfile);
      setRooms((roomData || []) as RoomCountRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const supabase = requireSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setErrorMsg("Impossible de se déconnecter.");
      setLoggingOut(false);
    }
  }

  const liveRooms = useMemo(() => {
    return rooms.filter(
      (room) => room.is_live || Number(room.viewers_count || 0) > 0
    );
  }, [rooms]);

  const totalViewers = useMemo(() => {
    return liveRooms.reduce((acc, room) => acc + Number(room.viewers_count || 0), 0);
  }, [liveRooms]);

  const navItems = useMemo(() => {
    if (profile?.is_admin) {
      return [...BASE_NAV, { label: "Admin", href: "/admin", icon: "🛠️" }];
    }
    return BASE_NAV;
  }, [profile?.is_admin]);

  if (loading) {
    return (
      <main className="dash-page">
        <style>{css}</style>
        <div className="dash-loadingWrap">
          <div className="dash-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="dash-page">
      <style>{css}</style>

      <div className="dash-bg dash-bg-a" />
      <div className="dash-bg dash-bg-b" />

      <div className="dash-orb dash-orb-red" />
      <div className="dash-orb dash-orb-pink" />
      <div className="dash-orb dash-orb-blue" />
      <div className="dash-orb dash-orb-violet" />

      <div className="dash-smoke dash-smoke-a" />
      <div className="dash-smoke dash-smoke-b" />
      <div className="dash-smoke dash-smoke-c" />

      <div className="dash-fogGlow dash-fogGlow-red" />
      <div className="dash-fogGlow dash-fogGlow-blue" />
      <div className="dash-fogGlow dash-fogGlow-violet" />

      <div className="dash-shell">
        <header className="dash-top">
          <div className="dash-topLeft">
            <div className="dash-brandRow">
              <div className="dash-brandGem">💎</div>

              <div>
                <div className="dash-logo">EtherCristal</div>
                <div className="dash-kicker">Private Lounge Dashboard</div>
              </div>
            </div>

            <div className="dash-welcome">Bienvenue, {getDisplayName(profile)}</div>

            <div className="dash-metaRow">
              <div className="dash-metaCard">
                <span>Ether</span>
                <strong>{Number(profile?.ether_balance || 0)} Ξ</strong>
              </div>

              <div className="dash-metaCard diamond">
                <span>Badge</span>
                <strong>{getVipName(profile)}</strong>
              </div>

              <div className="dash-metaCard">
                <span>Compte</span>
                <strong>{profile?.is_verified ? "Vérifié" : "Standard"}</strong>
              </div>
            </div>
          </div>

          <div className="dash-topRight">
            <div className="dash-userChip">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={getDisplayName(profile)}
                  className="dash-avatar"
                />
              ) : (
                <div className="dash-avatar fallback">{getInitial(profile)}</div>
              )}

              <div className="dash-userMeta">
                <strong>{getDisplayName(profile)}</strong>
                <span>{getVipName(profile)}</span>
              </div>
            </div>

            <div className="dash-actionRow">
              <button
                type="button"
                className="dash-topBtn"
                onClick={() => router.push("/options")}
              >
                Options
              </button>

              {profile?.is_admin ? (
                <button
                  type="button"
                  className="dash-topBtn diamond"
                  onClick={() => router.push("/admin")}
                >
                  Administration
                </button>
              ) : null}

              <button
                type="button"
                className="dash-topBtn danger"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
              >
                {loggingOut ? "Déconnexion..." : "Déconnexion"}
              </button>
            </div>
          </div>
        </header>

        {errorMsg ? <div className="dash-error">{errorMsg}</div> : null}

        <div className="dash-layout">
          <aside className="dash-sidebar">
            <nav className="dash-nav">
              {navItems.map((item) => {
                const active = item.href === "/dashboard";
                return (
                  <button
                    key={item.href}
                    type="button"
                    className={`dash-navItem ${active ? "active" : ""}`}
                    onClick={() => router.push(item.href)}
                  >
                    <span className="dash-navIcon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="dash-content">
            <article className="dash-card desir">
              <div className="dash-cardBadge">Private room</div>
              <h2 className="dash-cardTitle">Désir intense</h2>
              <p className="dash-cardText">
                L’espace le plus exclusif, le plus direct et le plus chargé en tension.
                Une ambiance lounge privée, plus intime, plus sélective, plus immersive.
              </p>

              <div className="dash-cardStats">
                <div className="dash-statBox">
                  <span>Accès</span>
                  <strong>Privé</strong>
                </div>
                <div className="dash-statBox">
                  <span>Statut</span>
                  <strong>{getVipName(profile)}</strong>
                </div>
                <div className="dash-statBox">
                  <span>Ambiance</span>
                  <strong>Intense</strong>
                </div>
              </div>

              <div className="dash-cardActions">
                <button
                  type="button"
                  className="dash-cta red"
                  onClick={() => router.push("/desir")}
                >
                  Entrer dans Désir intense
                </button>
              </div>
            </article>

            <article className="dash-card webcam">
              <div className="dash-cardBadge diamond">Diamond live</div>
              <h2 className="dash-cardTitle">Salons webcam</h2>
              <p className="dash-cardText">
                Les salons live d’EtherCristal dans une ambiance bar privé lounge :
                plus de présence, plus de mouvement, plus de prestige visuel.
              </p>

              <div className="dash-cardStats">
                <div className="dash-statBox">
                  <span>Salons live</span>
                  <strong>{liveRooms.length}</strong>
                </div>
                <div className="dash-statBox">
                  <span>Viewers</span>
                  <strong>{totalViewers}</strong>
                </div>
                <div className="dash-statBox">
                  <span>Mode</span>
                  <strong>Webcam</strong>
                </div>
              </div>

              <div className="dash-roomList">
                {liveRooms.slice(0, 3).length > 0 ? (
                  liveRooms.slice(0, 3).map((room, idx) => (
                    <button
                      key={`${room.slug || room.room_id || idx}`}
                      type="button"
                      className="dash-roomItem"
                      onClick={() =>
                        router.push(
                          room.room_id ? `/salons/${room.room_id}` : "/salons"
                        )
                      }
                    >
                      <div>
                        <strong>{room.room_name || room.slug || `Salon ${idx + 1}`}</strong>
                        <span>
                          {Number(room.viewers_count || 0)} en ligne •{" "}
                          {Number(room.members_count || 0)} membres
                        </span>
                      </div>
                      <span className="dash-liveDot" />
                    </button>
                  ))
                ) : (
                  <div className="dash-empty">Aucun salon actif pour le moment.</div>
                )}
              </div>

              <div className="dash-cardActions">
                <button
                  type="button"
                  className="dash-cta diamond"
                  onClick={() => router.push("/salons")}
                >
                  Ouvrir les salons webcam
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}

const css = `
.dash-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 0%, rgba(255,0,72,0.08), transparent 20%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02), transparent 38%),
    linear-gradient(180deg,#030304 0%, #120007 42%, #070312 75%, #030304 100%);
  color:#fff;
}

.dash-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}

.dash-bg-a{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.12;
}

.dash-bg-b{
  background:
    radial-gradient(circle at 24% 30%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 76% 70%, rgba(255,255,255,0.018), transparent 20%);
}

.dash-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(80px);
  pointer-events:none;
  z-index:1;
}

.dash-orb-red{
  width:220px;
  height:220px;
  top:70px;
  left:60px;
  background:rgba(255,0,60,0.18);
}

.dash-orb-pink{
  width:260px;
  height:260px;
  top:120px;
  right:120px;
  background:rgba(255,0,128,0.14);
}

.dash-orb-blue{
  width:240px;
  height:240px;
  bottom:120px;
  right:180px;
  background:rgba(59,130,246,0.14);
}

.dash-orb-violet{
  width:240px;
  height:240px;
  bottom:80px;
  left:260px;
  background:rgba(139,92,246,0.10);
}

.dash-smoke{
  position:absolute;
  inset:auto;
  pointer-events:none;
  z-index:1;
  filter:blur(70px);
  opacity:.22;
  mix-blend-mode:screen;
  animation:dashSmokeFloat 18s ease-in-out infinite alternate;
}

.dash-smoke-a{
  top:8%;
  left:-8%;
  width:560px;
  height:260px;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 22%, transparent 58%),
    radial-gradient(ellipse at 60% 40%, rgba(255,0,72,0.16) 0%, rgba(255,0,72,0.06) 28%, transparent 62%),
    radial-gradient(ellipse at 82% 60%, rgba(96,165,250,0.14) 0%, rgba(96,165,250,0.05) 24%, transparent 58%);
  animation-duration:22s;
}

.dash-smoke-b{
  bottom:10%;
  right:-10%;
  width:620px;
  height:300px;
  background:
    radial-gradient(ellipse at 30% 55%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 24%, transparent 58%),
    radial-gradient(ellipse at 58% 42%, rgba(139,92,246,0.16) 0%, rgba(139,92,246,0.05) 24%, transparent 60%),
    radial-gradient(ellipse at 78% 58%, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0.04) 22%, transparent 56%);
  animation-duration:26s;
}

.dash-smoke-c{
  top:42%;
  left:24%;
  width:520px;
  height:240px;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 22%, transparent 56%),
    radial-gradient(ellipse at 32% 48%, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.05) 22%, transparent 55%),
    radial-gradient(ellipse at 68% 52%, rgba(255,0,60,0.12) 0%, rgba(255,0,60,0.05) 22%, transparent 55%);
  animation-duration:20s;
}

.dash-fogGlow{
  position:absolute;
  border-radius:999px;
  pointer-events:none;
  z-index:1;
  filter:blur(120px);
  opacity:.14;
  animation:dashFogPulse 8s ease-in-out infinite;
}

.dash-fogGlow-red{
  top:18%;
  left:18%;
  width:260px;
  height:260px;
  background:rgba(255,0,72,0.34);
}

.dash-fogGlow-blue{
  top:16%;
  right:22%;
  width:280px;
  height:280px;
  background:rgba(59,130,246,0.30);
  animation-delay:1.2s;
}

.dash-fogGlow-violet{
  bottom:16%;
  left:38%;
  width:300px;
  height:300px;
  background:rgba(139,92,246,0.26);
  animation-delay:2.1s;
}

.dash-shell{
  position:relative;
  z-index:2;
  max-width:1540px;
  margin:0 auto;
  padding:24px;
}

.dash-top{
  display:flex;
  justify-content:space-between;
  gap:24px;
  align-items:flex-start;
  flex-wrap:wrap;
  margin-bottom:20px;
  padding:24px;
  border-radius:32px;
  background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(18px);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.02) inset,
    0 10px 40px rgba(0,0,0,0.25);
}

.dash-topLeft{
  flex:1 1 620px;
  min-width:280px;
}

.dash-brandRow{
  display:flex;
  align-items:center;
  gap:14px;
}

.dash-brandGem{
  width:58px;
  height:58px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:18px;
  background:linear-gradient(135deg,#7c3aed,#2563eb);
  box-shadow:0 0 24px rgba(96,165,250,0.22);
  font-size:26px;
}

.dash-logo{
  font-size:44px;
  line-height:1;
  font-weight:900;
  letter-spacing:-1.4px;
  background:linear-gradient(90deg,#ef4444 0%, #ec4899 34%, #60a5fa 68%, #a78bfa 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 24px rgba(96,165,250,0.12);
}

.dash-kicker{
  margin-top:5px;
  color:rgba(255,255,255,0.52);
  font-size:12px;
  font-weight:800;
  letter-spacing:.18em;
  text-transform:uppercase;
}

.dash-welcome{
  margin-top:22px;
  font-size:34px;
  font-weight:900;
  line-height:1.08;
}

.dash-metaRow{
  margin-top:16px;
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.dash-metaCard{
  min-width:130px;
  padding:14px 16px;
  border-radius:20px;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.08);
}

.dash-metaCard.diamond{
  border-color:rgba(96,165,250,0.22);
  box-shadow:inset 0 0 0 1px rgba(96,165,250,0.10);
}

.dash-metaCard span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.52);
}

.dash-metaCard strong{
  display:block;
  margin-top:8px;
  font-size:21px;
  color:#fff;
}

.dash-topRight{
  display:flex;
  flex-direction:column;
  gap:14px;
  align-items:flex-end;
}

.dash-userChip{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px 14px;
  border-radius:22px;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.08);
}

.dash-avatar{
  width:54px;
  height:54px;
  border-radius:18px;
  object-fit:cover;
}

.dash-avatar.fallback{
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(135deg,#2563eb,#8b5cf6);
  color:#fff;
  font-size:24px;
  font-weight:900;
  box-shadow:0 0 18px rgba(96,165,250,0.18);
}

.dash-userMeta{
  display:grid;
  gap:4px;
  text-align:left;
}

.dash-userMeta strong{
  font-size:16px;
}

.dash-userMeta span{
  color:rgba(255,255,255,0.58);
  font-size:12px;
}

.dash-actionRow{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.dash-topBtn{
  min-height:48px;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.08);
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.dash-topBtn.diamond{
  background:linear-gradient(90deg,#2563eb,#8b5cf6);
  box-shadow:0 0 18px rgba(96,165,250,0.18);
}

.dash-topBtn.danger{
  background:linear-gradient(90deg,#7f1d1d,#dc2626);
}

.dash-topBtn:disabled{
  opacity:.7;
  cursor:not-allowed;
}

.dash-error{
  margin-bottom:18px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,60,80,0.12);
  border:1px solid rgba(255,60,80,0.18);
  color:#ffbcc8;
}

.dash-layout{
  display:grid;
  grid-template-columns:220px minmax(0,1fr);
  gap:20px;
  align-items:start;
}

.dash-sidebar{
  padding:14px;
  border-radius:26px;
  background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(16px);
}

.dash-nav{
  display:grid;
  gap:10px;
}

.dash-navItem{
  min-height:50px;
  padding:12px 14px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.06);
  color:#fff;
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:800;
  cursor:pointer;
  text-align:left;
}

.dash-navItem.active{
  background:linear-gradient(90deg, rgba(239,68,68,0.16), rgba(96,165,250,0.12));
  border-color:rgba(96,165,250,0.22);
  box-shadow:0 0 18px rgba(96,165,250,0.08);
}

.dash-navIcon{
  width:24px;
  display:inline-flex;
  justify-content:center;
}

.dash-content{
  display:grid;
  gap:18px;
}

.dash-card{
  position:relative;
  overflow:hidden;
  padding:28px;
  border-radius:32px;
  background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(18px);
  min-height:330px;
  display:flex;
  flex-direction:column;
}

.dash-card.desir{
  box-shadow:
    inset 0 0 0 1px rgba(255,60,120,0.14),
    0 0 30px rgba(255,0,72,0.06);
}

.dash-card.webcam{
  box-shadow:
    inset 0 0 0 1px rgba(96,165,250,0.16),
    0 0 30px rgba(96,165,250,0.06);
}

.dash-cardBadge{
  display:inline-flex;
  width:max-content;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  color:#ffd1df;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
}

.dash-cardBadge.diamond{
  color:#d7e9ff;
}

.dash-cardTitle{
  margin:18px 0 0;
  font-size:40px;
  line-height:.95;
  letter-spacing:-1.4px;
  font-weight:900;
}

.dash-cardText{
  margin:16px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.85;
  font-size:15px;
  max-width:95%;
}

.dash-cardStats{
  margin-top:20px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}

.dash-statBox{
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.08);
}

.dash-statBox span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  color:rgba(255,255,255,0.54);
  letter-spacing:.08em;
}

.dash-statBox strong{
  display:block;
  margin-top:8px;
  font-size:22px;
}

.dash-roomList{
  margin-top:18px;
  display:grid;
  gap:12px;
}

.dash-roomItem{
  padding:14px 16px;
  border:none;
  border-radius:18px;
  background:rgba(255,255,255,0.05);
  color:#fff;
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  text-align:left;
  cursor:pointer;
}

.dash-roomItem strong{
  display:block;
}

.dash-roomItem span{
  color:rgba(255,245,220,0.68);
  font-size:13px;
}

.dash-liveDot{
  width:12px;
  height:12px;
  border-radius:999px;
  background:#4cff92;
  box-shadow:0 0 14px #4cff92;
  flex:0 0 auto;
}

.dash-cardActions{
  margin-top:auto;
  padding-top:22px;
}

.dash-cta{
  min-height:52px;
  padding:14px 18px;
  border:none;
  border-radius:18px;
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.dash-cta.red{
  background:linear-gradient(90deg,#b91c1c,#ec4899);
  box-shadow:0 0 18px rgba(255,0,72,0.16);
}

.dash-cta.diamond{
  background:linear-gradient(90deg,#2563eb,#8b5cf6);
  box-shadow:0 0 18px rgba(96,165,250,0.18);
}

.dash-empty{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  color:rgba(255,245,220,0.66);
}

.dash-loadingWrap{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}

.dash-loader{
  width:72px;
  height:72px;
  border:6px solid rgba(96,165,250,0.18);
  border-top:6px solid #ec4899;
  border-radius:50%;
  animation:dashSpin 1.2s linear infinite;
}

@keyframes dashSpin{
  to{transform:rotate(360deg)}
}

@keyframes dashSmokeFloat{
  0%{
    transform:translate3d(0,0,0) scale(1) rotate(0deg);
  }
  50%{
    transform:translate3d(18px,-10px,0) scale(1.05) rotate(1deg);
  }
  100%{
    transform:translate3d(-22px,12px,0) scale(1.08) rotate(-1deg);
  }
}

@keyframes dashFogPulse{
  0%,100%{
    opacity:.10;
    transform:scale(1);
  }
  50%{
    opacity:.18;
    transform:scale(1.08);
  }
}

@media (max-width: 1180px){
  .dash-layout{
    grid-template-columns:1fr;
  }

  .dash-topRight{
    align-items:flex-start;
  }

  .dash-actionRow{
    justify-content:flex-start;
  }
}

@media (max-width: 860px){
  .dash-logo{
    font-size:36px;
  }

  .dash-welcome{
    font-size:28px;
  }

  .dash-cardStats{
    grid-template-columns:1fr;
  }
}

@media (max-width: 640px){
  .dash-top{
    padding:18px;
  }

  .dash-card{
    padding:22px;
  }

  .dash-cardTitle{
    font-size:32px;
  }
}
`;
