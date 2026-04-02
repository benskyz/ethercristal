"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

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

export default function VipPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const canceled = params.get("canceled");

    if (success === "1") {
      setNotice("Paiement validé. Ton accès VIP va être activé dès confirmation du paiement.");
      setErrorMsg("");
      void loadPage();
    } else if (canceled === "1") {
      setNotice("Paiement annulé.");
      setErrorMsg("");
    }
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

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message || "Impossible de charger ton statut VIP.");
        setLoading(false);
        return;
      }

      setProfile((profileData || null) as ProfileRow | null);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement page VIP.");
    } finally {
      setLoading(false);
    }
  }

  const isVip = useMemo(() => {
    const value = String(profile?.vip_level || "").toLowerCase();
    return value !== "" && value !== "free" && value !== "standard";
  }, [profile?.vip_level]);

  async function handleUnlockVip() {
    try {
      setCheckoutLoading(true);
      setNotice("");
      setErrorMsg("");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceName: "Pass VIP",
          amountUsd: 19.99,
          metadata: {
            product_slug: "vip-pass",
            category: "vip",
            scope: "global",
          },
          mode: "subscription",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.url) {
        setErrorMsg(json?.error || "Impossible de lancer le paiement VIP.");
        return;
      }

      window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lancement paiement VIP.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="vip-page">
        <style>{css}</style>
        <div className="vip-loading">
          <div className="vip-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="vip-page">
      <style>{css}</style>

      <div className="vip-bg vip-bg-a" />
      <div className="vip-bg vip-bg-b" />
      <div className="vip-noise" />
      <div className="vip-orb vip-orb-a" />
      <div className="vip-orb vip-orb-b" />
      <div className="vip-orb vip-orb-c" />

      <div className="vip-shell">
        <header className="vip-topbar">
          <button className="vip-navBtn" onClick={() => router.push("/dashboard")} type="button">
            Retour
          </button>

          <div className="vip-topbarRight">
            <button className="vip-navBtn" onClick={() => router.push("/salons")} type="button">
              Salons
            </button>
            <button className="vip-navBtn gold" onClick={() => router.push("/shop")} type="button">
              Shop
            </button>
          </div>
        </header>

        <section className="vip-hero">
          <div className="vip-brand">
            <span className="ether">Ether</span>
            <span className="cristal">Cristal</span>
          </div>

          <div className="vip-kicker">Accès premium</div>

          <h1 className="vip-title">Débloque le niveau VIP</h1>
          <p className="vip-subtitle">
            Accède aux salles VIP, aux avantages premium, aux filtres exclusifs et à une présence plus luxueuse sur tout l’écosystème EtherCristal.
          </p>

          <div className="vip-statusCard">
            <div className="vip-statusLeft">
              <div className="vip-statusLabel">Ton statut actuel</div>
              <div className="vip-statusName" style={getProfileNameStyle(profile)}>
                {getProfileName(profile)}
              </div>
              <div className="vip-statusMeta">
                {isVip ? "VIP actif" : "Standard"} • {Number(profile?.ether_balance || 0)} Ξ
              </div>
            </div>

            <div className={`vip-statusBadge ${isVip ? "active" : ""}`}>
              {isVip ? "VIP actif" : "Standard"}
            </div>
          </div>
        </section>

        {notice ? <div className="vip-notice">{notice}</div> : null}
        {errorMsg ? <div className="vip-error">{errorMsg}</div> : null}

        <section className="vip-grid">
          <article className="vip-card main">
            <div className="vip-cardShine" />

            <div className="vip-cardKicker">Ce que le VIP débloque</div>
            <h2 className="vip-cardTitle">Avantages premium</h2>

            <div className="vip-benefits">
              <div className="vip-benefit">
                <div className="vip-benefitIcon">◆</div>
                <div>
                  <strong>Accès aux salles VIP</strong>
                  <p>Entre dans les rooms réservées aux membres premium.</p>
                </div>
              </div>

              <div className="vip-benefit">
                <div className="vip-benefitIcon">◆</div>
                <div>
                  <strong>Filtres et accès premium</strong>
                  <p>Débloque certains filtres exclusifs et options spéciales.</p>
                </div>
              </div>

              <div className="vip-benefit">
                <div className="vip-benefitIcon">◆</div>
                <div>
                  <strong>Présence visuelle premium</strong>
                  <p>Meilleure mise en valeur sur ton profil et dans les espaces privés.</p>
                </div>
              </div>

              <div className="vip-benefit">
                <div className="vip-benefitIcon">◆</div>
                <div>
                  <strong>Objets et effets exclusifs</strong>
                  <p>Accès à certains items et bundles réservés au premium.</p>
                </div>
              </div>
            </div>

            <div className="vip-warningBox">
              Le VIP donne des avantages d’accès et de visibilité. Il ne donne jamais d’immunité sur la modération.
            </div>
          </article>

          <article className="vip-card price">
            <div className="vip-cardShine" />

            <div className="vip-cardKicker">Abonnement</div>
            <h2 className="vip-cardTitle">Pass VIP</h2>

            <div className="vip-price">$19.99</div>
            <div className="vip-priceSub">accès premium</div>

            <div className="vip-compare">
              <div className="vip-compareRow">
                <span>Salons publics</span>
                <strong>Oui</strong>
              </div>
              <div className="vip-compareRow">
                <span>Salles VIP</span>
                <strong>Oui</strong>
              </div>
              <div className="vip-compareRow">
                <span>Effets exclusifs</span>
                <strong>Oui</strong>
              </div>
              <div className="vip-compareRow">
                <span>Visibilité premium</span>
                <strong>Oui</strong>
              </div>
            </div>

            {isVip ? (
              <div className="vip-activeBox">
                Ton compte a déjà un accès VIP actif.
              </div>
            ) : (
              <button
                className="vip-mainBtn"
                onClick={() => void handleUnlockVip()}
                disabled={checkoutLoading}
                type="button"
              >
                {checkoutLoading ? "Ouverture..." : "Débloquer le VIP"}
              </button>
            )}

            <button
              className="vip-secondaryBtn"
              onClick={() => router.push("/shop")}
              type="button"
            >
              Voir la boutique
            </button>
          </article>
        </section>

        <section className="vip-rules">
          <div className="vip-rulesKicker">Règles VIP</div>
          <h2 className="vip-rulesTitle">Simple, clair, utile</h2>

          <div className="vip-rulesGrid">
            <div className="vip-ruleCard">
              <strong>Standard</strong>
              <p>Accès normal au site, mais certaines zones premium restent verrouillées.</p>
            </div>

            <div className="vip-ruleCard">
              <strong>VIP</strong>
              <p>Accès aux salles VIP, à certains effets premium et à une meilleure présence visuelle.</p>
            </div>

            <div className="vip-ruleCard">
              <strong>Modération</strong>
              <p>Le VIP n’achète jamais un passe-droit. Les règles restent les mêmes pour tous.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const css = `
.vip-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 20%, rgba(212,175,55,0.08), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(130,20,50,0.16), transparent 28%),
    radial-gradient(circle at 50% 82%, rgba(70,20,110,0.16), transparent 30%),
    linear-gradient(180deg,#0d0205 0%, #070205 52%, #030204 100%);
  color:#fff;
}

.vip-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.vip-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.vip-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.22;
  mask-image:linear-gradient(180deg, rgba(255,255,255,0.55), transparent 100%);
}

.vip-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.035;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
  mix-blend-mode:screen;
}

.vip-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.18;
  pointer-events:none;
}
.vip-orb-a{
  width:220px;
  height:220px;
  left:80px;
  top:100px;
  background:rgba(212,175,55,0.46);
  animation:floatA 9s ease-in-out infinite;
}
.vip-orb-b{
  width:260px;
  height:260px;
  right:100px;
  top:140px;
  background:rgba(180,30,60,0.24);
  animation:floatB 12s ease-in-out infinite;
}
.vip-orb-c{
  width:230px;
  height:230px;
  left:50%;
  bottom:30px;
  transform:translateX(-50%);
  background:rgba(100,40,170,0.18);
  animation:floatC 11s ease-in-out infinite;
}

@keyframes floatA{
  0%,100%{transform:translateY(0) scale(1)}
  50%{transform:translateY(-18px) scale(1.06)}
}
@keyframes floatB{
  0%,100%{transform:translateX(0) scale(1)}
  50%{transform:translateX(-22px) scale(1.05)}
}
@keyframes floatC{
  0%,100%{transform:translateX(-50%) translateY(0) scale(1)}
  50%{transform:translateX(-50%) translateY(-14px) scale(1.04)}
}

.vip-shell{
  position:relative;
  z-index:2;
  max-width:1380px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.vip-topbar{
  display:flex;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}

.vip-topbarRight{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.vip-navBtn{
  min-height:46px;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
  font-weight:800;
  cursor:pointer;
  transition:all .22s ease;
}
.vip-navBtn:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.20);
}
.vip-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.vip-hero{
  margin-top:28px;
  text-align:center;
}

.vip-brand{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  justify-content:center;
  align-items:center;
  font-size:54px;
  font-weight:900;
  letter-spacing:-2px;
  line-height:1;
}

.vip-brand .ether{
  background:linear-gradient(90deg,#b8871b 0%, #fff0a8 35%, #d4af37 65%, #fff5c4 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 24px rgba(212,175,55,0.18);
  animation:etherPulse 3.2s ease-in-out infinite;
}

.vip-brand .cristal{
  color:#f8f1de;
  text-shadow:0 0 18px rgba(255,255,255,0.10);
}

@keyframes etherPulse{
  0%,100%{
    filter:drop-shadow(0 0 6px rgba(212,175,55,0.18));
    transform:scale(1);
    opacity:.94;
  }
  50%{
    filter:drop-shadow(0 0 14px rgba(212,175,55,0.34));
    transform:scale(1.02);
    opacity:1;
  }
}

.vip-kicker{
  margin:18px auto 0;
  display:inline-flex;
  align-items:center;
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

.vip-title{
  margin:18px 0 0;
  font-size:56px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.vip-subtitle{
  max-width:900px;
  margin:16px auto 0;
  font-size:18px;
  line-height:1.8;
  color:rgba(255,245,220,0.74);
}

.vip-statusCard{
  margin:26px auto 0;
  max-width:860px;
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  flex-wrap:wrap;
  padding:20px 22px;
  border-radius:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
}

.vip-statusLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}
.vip-statusName{
  margin-top:8px;
  font-size:32px;
  font-weight:900;
  line-height:1;
}
.vip-statusMeta{
  margin-top:8px;
  color:rgba(255,245,220,0.68);
  font-size:14px;
}
.vip-statusBadge{
  min-height:42px;
  padding:10px 16px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff;
  font-weight:900;
}
.vip-statusBadge.active{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.vip-notice,
.vip-error{
  max-width:1160px;
  margin:18px auto 0;
  padding:14px 16px;
  border-radius:18px;
}
.vip-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.vip-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.vip-grid{
  margin-top:28px;
  display:grid;
  grid-template-columns:1.2fr .8fr;
  gap:24px;
}

.vip-card{
  position:relative;
  overflow:hidden;
  border-radius:30px;
  padding:26px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(16px);
  box-shadow:
    0 24px 80px rgba(0,0,0,0.40),
    inset 0 1px 0 rgba(255,255,255,0.05);
}
.vip-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:vipShine 7s linear infinite;
  pointer-events:none;
}
@keyframes vipShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.vip-cardKicker{
  display:inline-flex;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.10);
  color:#fff1c4;
  font-size:12px;
  font-weight:800;
}

.vip-cardTitle{
  margin:16px 0 0;
  font-size:34px;
  line-height:1;
  letter-spacing:-1px;
  font-weight:900;
}

.vip-benefits{
  margin-top:22px;
  display:grid;
  gap:14px;
}

.vip-benefit{
  display:grid;
  grid-template-columns:44px 1fr;
  gap:14px;
  align-items:flex-start;
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vip-benefitIcon{
  width:44px;
  height:44px;
  border-radius:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  font-weight:900;
  box-shadow:0 10px 24px rgba(212,175,55,0.18);
}
.vip-benefit strong{
  display:block;
  font-size:17px;
  color:#fff3d2;
}
.vip-benefit p{
  margin:6px 0 0;
  color:rgba(255,245,220,0.70);
  line-height:1.7;
  font-size:14px;
}

.vip-warningBox{
  margin-top:20px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,245,220,0.74);
  line-height:1.7;
}

.vip-price{
  margin-top:20px;
  font-size:56px;
  line-height:1;
  font-weight:900;
  color:#fff3c2;
}
.vip-priceSub{
  margin-top:8px;
  color:rgba(255,245,220,0.68);
  font-size:14px;
}

.vip-compare{
  margin-top:22px;
  display:grid;
  gap:12px;
}
.vip-compareRow{
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vip-compareRow span{
  color:rgba(255,245,220,0.72);
}
.vip-compareRow strong{
  color:#fff2cb;
}

.vip-activeBox{
  margin-top:22px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}

.vip-mainBtn,
.vip-secondaryBtn{
  width:100%;
  min-height:58px;
  margin-top:18px;
  border:none;
  border-radius:18px;
  font-size:16px;
  font-weight:900;
  cursor:pointer;
  transition:transform .22s ease, opacity .22s ease, box-shadow .22s ease;
}
.vip-mainBtn{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  box-shadow:0 12px 30px rgba(212,175,55,0.18);
}
.vip-mainBtn:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 36px rgba(212,175,55,0.24);
}
.vip-mainBtn:disabled{
  opacity:.74;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}
.vip-secondaryBtn{
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.10);
}
.vip-secondaryBtn:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.18);
}

.vip-rules{
  margin-top:28px;
  text-align:center;
}
.vip-rulesKicker{
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
.vip-rulesTitle{
  margin:18px 0 0;
  font-size:42px;
  line-height:1;
  letter-spacing:-1px;
  font-weight:900;
}
.vip-rulesGrid{
  margin-top:22px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
}
.vip-ruleCard{
  padding:20px;
  border-radius:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.08);
  text-align:left;
}
.vip-ruleCard strong{
  display:block;
  font-size:20px;
  color:#fff2cb;
}
.vip-ruleCard p{
  margin:10px 0 0;
  color:rgba(255,245,220,0.70);
  line-height:1.75;
}

.vip-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.vip-loader{
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

@media (max-width: 1060px){
  .vip-grid{
    grid-template-columns:1fr;
  }

  .vip-rulesGrid{
    grid-template-columns:1fr;
  }
}

@media (max-width: 760px){
  .vip-brand{
    font-size:42px;
  }

  .vip-title{
    font-size:40px;
  }

  .vip-subtitle{
    font-size:16px;
  }

  .vip-card{
    padding:22px;
    border-radius:24px;
  }

  .vip-statusCard{
    padding:18px;
  }
}

@media (max-width: 560px){
  .vip-title{
    font-size:34px;
  }

  .vip-brand{
    font-size:34px;
  }
}
`;
