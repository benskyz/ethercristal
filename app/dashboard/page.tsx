"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "benskyz123@gmail.com";

type ProfileRow = {
  id: string;
  username?: string | null;
  ether_balance?: number | null;
  vip_level?: string | null;
  theme_mode?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

function safeName(profile?: ProfileRow | null, email?: string | null) {
  const username = String(profile?.username || "").trim();
  if (username) return username;
  if (email) return email.split("@")[0];
  return "Membre";
}

function getNameStyle(profile?: ProfileRow | null): CSSProperties {
  const color = String(profile?.display_name_color || "").trim();
  const glow = String(profile?.display_name_glow || "").trim();
  const gradient = String(profile?.display_name_gradient || "").trim();

  if (gradient) {
    return {
      background: gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: glow ? `0 0 18px ${glow}` : "0 0 16px rgba(212,175,55,0.14)",
    };
  }

  return {
    color: color || "#fff6d6",
    textShadow: glow ? `0 0 18px ${glow}` : "0 0 16px rgba(212,175,55,0.14)",
  };
}

function getProfileAura(profile?: ProfileRow | null) {
  const mode = String(profile?.theme_mode || "").toLowerCase();
  if (mode === "velvet") return "rgba(130, 25, 55, 0.22)";
  if (mode === "dark") return "rgba(80, 95, 160, 0.18)";
  return "rgba(212, 175, 55, 0.20)";
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [online, setOnline] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      const email = String(auth.user.email || "");
      if (!mounted) return;

      setUserEmail(email);
      setIsAdmin(email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      const [{ data: profileData }, { data: countRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
        supabase.from("salon_room_counts").select("*"),
      ]);

      if (!mounted) return;

      setProfile((profileData || null) as ProfileRow | null);

      const totalOnline =
        countRows?.reduce((sum: number, row: any) => {
          return (
            sum +
            Number(row?.participants_online || 0) +
            Number(row?.spectators_online || 0)
          );
        }, 0) || 0;

      setOnline(totalOnline);
      setLoading(false);
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [router]);

  const displayName = useMemo(
    () => safeName(profile, userEmail),
    [profile, userEmail]
  );

  const etherBalance = useMemo(
    () => Number(profile?.ether_balance || 0),
    [profile?.ether_balance]
  );

  const vipLevel = useMemo(
    () => String(profile?.vip_level || "Standard"),
    [profile?.vip_level]
  );

  const nameStyle = useMemo(() => getNameStyle(profile), [profile]);
  const profileAura = useMemo(() => getProfileAura(profile), [profile]);

  if (loading) {
    return (
      <main className="dashboard-page">
        <style>{localCss}</style>
        <div className="ec-loading-screen">
          <div className="ec-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <style>{localCss}</style>

      <div className="dashboard-bg dashboard-bg-a" />
      <div className="dashboard-bg dashboard-bg-b" />
      <div className="ec-grid-noise" />
      <div className="ec-gold-orb dashboard-orb-a" />
      <div className="ec-gold-orb dashboard-orb-b" />

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-logoWrap">
            <div className="dashboard-logoGlow" />
            <div className="dashboard-logo">
              Ether<span className="dashboard-logoGold">Cristal</span>
            </div>
          </div>

          <div className="ec-card dashboard-profileCard">
            <div
              className="dashboard-profileAura"
              style={{ background: profileAura }}
            />

            <div className="dashboard-profileContent">
              <div className="dashboard-name" style={nameStyle}>
                {displayName}
              </div>

              <div className="dashboard-badges">
                <span className="ec-badge ec-badge-gold">
                  {etherBalance} Ξ
                </span>
                <span className="ec-badge ec-badge-soft">{vipLevel}</span>
              </div>

              <div className="dashboard-onlineLine">
                <span className="dashboard-dot" />
                <span>{online} en ligne</span>
              </div>
            </div>
          </div>

          <nav className="dashboard-nav">
            <button
              className="dashboard-navBtn active"
              onClick={() => router.push("/dashboard")}
              type="button"
            >
              <span>🏠</span>
              <span>Accueil</span>
            </button>

            <button
              className="dashboard-navBtn"
              onClick={() => router.push("/messages")}
              type="button"
            >
              <span>💬</span>
              <span>Messages</span>
            </button>

            <button
              className="dashboard-navBtn"
              onClick={() => router.push("/profile")}
              type="button"
            >
              <span>👤</span>
              <span>Profil</span>
            </button>

            <button
              className="dashboard-navBtn"
              onClick={() => router.push("/shop")}
              type="button"
            >
              <span>👑</span>
              <span>VIP / Boutique</span>
            </button>

            <button
              className="dashboard-navBtn"
              onClick={() => router.push("/salons")}
              type="button"
            >
              <span>🎥</span>
              <span>Salons Webcam</span>
            </button>

            <button
              className="dashboard-navBtn"
              onClick={() => router.push("/desir")}
              type="button"
            >
              <span>❤</span>
              <span>DésirIntense</span>
            </button>

            <button
              className="dashboard-navBtn"
              onClick={() => router.push("/options")}
              type="button"
            >
              <span>⚙️</span>
              <span>Options</span>
            </button>

            {isAdmin ? (
              <button
                className="dashboard-navBtn admin"
                onClick={() => router.push("/admin")}
                type="button"
              >
                <span>🛡️</span>
                <span>Admin</span>
              </button>
            ) : null}
          </nav>
        </aside>

        <section className="dashboard-main">
          <div className="ec-header">
            <div>
              <div className="ec-kicker">Dashboard</div>
              <h1 className="ec-title">
                Bienvenue <span className="ec-title-gradient">{displayName}</span>
              </h1>
              <p className="ec-subtitle">
                Accède rapidement à tes espaces, à tes messages et à ton univers
                EtherCristal.
              </p>
            </div>

            <div className="ec-sidecards">
              <div className="ec-sidecard">
                <span className="ec-sidecard-label">Éther</span>
                <strong>{etherBalance} Ξ</strong>
              </div>

              <div className="ec-sidecard">
                <span className="ec-sidecard-label">Grade</span>
                <strong>{vipLevel}</strong>
              </div>

              <div className="ec-sidecard">
                <span className="ec-sidecard-label">En ligne</span>
                <strong>{online}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-cards">
            <article
              className="ec-card dashboard-bigCard"
              onClick={() => router.push("/desir")}
            >
              <div className="ec-card-shine" />
              <div className="ec-card-kicker">Cam to cam</div>
              <h2 className="ec-card-title">DésirIntense</h2>
              <p className="ec-card-text">
                Lance une connexion rapide, choisis ton filtre et entre dans
                l’expérience directe.
              </p>
              <button className="ec-btn ec-btn-danger" type="button">
                Ouvrir
              </button>
            </article>

            <article
              className="ec-card dashboard-bigCard"
              onClick={() => router.push("/salons")}
            >
              <div className="ec-card-shine" />
              <div className="ec-card-kicker">Rooms</div>
              <h2 className="ec-card-title">Salons Webcam</h2>
              <p className="ec-card-text">
                Explore les rooms, rejoins une ambiance précise et navigue entre
                les salons disponibles.
              </p>
              <button className="ec-btn ec-btn-gold" type="button">
                Voir les salons
              </button>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

const localCss = `
.dashboard-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:linear-gradient(180deg,#100307 0%, #090205 42%, #050205 100%);
  color:#fff;
}

.dashboard-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.dashboard-bg-a{
  background:
    radial-gradient(circle at 18% 18%, rgba(212,175,55,0.10), transparent 34%),
    radial-gradient(circle at 80% 20%, rgba(255,170,40,0.06), transparent 28%),
    radial-gradient(circle at 58% 76%, rgba(130,0,25,0.18), transparent 42%);
}
.dashboard-bg-b{
  background:
    radial-gradient(circle at 70% 55%, rgba(255,255,255,0.03), transparent 18%),
    radial-gradient(circle at 35% 70%, rgba(212,175,55,0.07), transparent 24%);
  filter:blur(8px);
}

.dashboard-orb-a{
  width:180px;
  height:180px;
  left:180px;
  top:80px;
  background:rgba(212,175,55,0.55);
}
.dashboard-orb-b{
  width:220px;
  height:220px;
  right:120px;
  top:180px;
  background:rgba(255,140,60,0.24);
}

.dashboard-layout{
  position:relative;
  z-index:2;
  display:grid;
  grid-template-columns:300px 1fr;
  min-height:100vh;
}

.dashboard-sidebar{
  position:relative;
  backdrop-filter:blur(22px);
  background:linear-gradient(180deg, rgba(18,4,8,0.94), rgba(11,3,6,0.92));
  border-right:1px solid rgba(255,215,0,0.12);
  padding:30px 24px;
  display:flex;
  flex-direction:column;
  gap:28px;
  box-shadow:
    8px 0 40px rgba(0,0,0,0.45),
    inset -1px 0 0 rgba(255,255,255,0.03);
}

.dashboard-logoWrap{
  position:relative;
}
.dashboard-logoGlow{
  position:absolute;
  left:-12px;
  top:-8px;
  width:220px;
  height:70px;
  background:radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.07) 48%, transparent 78%);
  filter:blur(14px);
  pointer-events:none;
}
.dashboard-logo{
  position:relative;
  z-index:2;
  font-size:38px;
  font-weight:900;
  letter-spacing:-2px;
  color:#fff;
}
.dashboard-logoGold{
  background:linear-gradient(90deg,#fff5c4 0%,#d4af37 42%,#fff0a8 78%,#b8871b 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 22px rgba(212,175,55,0.35);
}

.dashboard-profileCard{
  padding:20px;
}
.dashboard-profileAura{
  position:absolute;
  width:140px;
  height:140px;
  right:-30px;
  top:-20px;
  border-radius:999px;
  filter:blur(38px);
  opacity:.9;
  pointer-events:none;
}
.dashboard-profileContent{
  position:relative;
  z-index:2;
}
.dashboard-name{
  font-size:24px;
  font-weight:900;
  line-height:1.05;
  letter-spacing:-0.04em;
}
.dashboard-badges{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:12px;
}
.dashboard-onlineLine{
  display:flex;
  align-items:center;
  gap:8px;
  margin-top:14px;
  font-size:16px;
  font-weight:800;
  color:#ffddb3;
}
.dashboard-dot{
  width:8px;
  height:8px;
  background:#22c55e;
  border-radius:999px;
  display:inline-block;
  box-shadow:0 0 10px rgba(34,197,94,0.9);
}

.dashboard-nav{
  display:flex;
  flex-direction:column;
  gap:8px;
}
.dashboard-navBtn{
  background:transparent;
  border:none;
  color:#edd7ad;
  text-align:left;
  padding:14px 16px;
  border-radius:16px;
  cursor:pointer;
  font-size:15px;
  font-weight:700;
  transition:all .28s ease;
  display:flex;
  align-items:center;
  gap:14px;
}
.dashboard-navBtn:hover{
  background:rgba(212,175,55,0.10);
  color:#fff9e6;
  transform:translateX(8px);
}
.dashboard-navBtn.active{
  background:linear-gradient(90deg, #d4af37, #f0d48a);
  color:#1a0014;
  font-weight:800;
}
.dashboard-navBtn.admin{
  color:#ff9494;
  border:1px solid rgba(255,120,120,0.16);
  background:rgba(255,70,70,0.04);
}

.dashboard-main{
  padding:28px 24px 36px;
}

.dashboard-cards{
  display:grid;
  grid-template-columns:repeat(2, minmax(0,1fr));
  gap:24px;
  margin-top:8px;
}
.dashboard-bigCard{
  cursor:pointer;
}
.dashboard-bigCard .ec-btn{
  margin-top:22px;
}

@media (max-width: 980px){
  .dashboard-layout{
    grid-template-columns:1fr;
  }
  .dashboard-main{
    padding:20px 14px 28px;
  }
  .dashboard-cards{
    grid-template-columns:1fr;
  }
}
`;
