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
  is_admin?: boolean | null;
  avatar_url?: string | null;
  city?: string | null;
  display_name_color?: string | null;
  display_name_glow?: string | null;
  display_name_gradient?: string | null;
};

type VipDuration = {
  id: string;
  label: string;
  price: number;
  displayPrice: string;
  popular?: boolean;
};

type VipTier = {
  id: string;
  name: string;
  subtitle: string;
  accent: "gold" | "diamond";
  badge: string;
  description: string;
  features: string[];
  highlight: string;
  durations: VipDuration[];
  levelMatches: string[];
};

const VIP_TIERS: VipTier[] = [
  {
    id: "vip",
    name: "VIP",
    subtitle: "Accès premium élégant",
    accent: "gold",
    badge: "Gold Access",
    description:
      "Le palier premium essentiel pour débloquer les salons VIP, améliorer ta présence et donner à ton compte une vraie montée en gamme.",
    highlight:
      "L’équilibre parfait entre accès premium, image renforcée et expérience plus exclusive.",
    features: [
      "Accès aux salons VIP",
      "Badge premium visible sur le profil",
      "Présence plus valorisée dans l’univers EtherCristal",
      "Accès à certaines offres boutique réservées",
      "Ambiance premium sur les expériences clés",
      "Priorité légère sur certains accès",
    ],
    durations: [
      { id: "1w", label: "1 semaine", price: 5, displayPrice: "5 $" },
      { id: "1m", label: "1 mois", price: 17, displayPrice: "17 $", popular: true },
      { id: "3m", label: "3 mois", price: 36.99, displayPrice: "36.99 $" },
      { id: "6m", label: "6 mois", price: 60, displayPrice: "60 $" },
      { id: "12m", label: "1 an", price: 90, displayPrice: "90 $" },
    ],
    levelMatches: ["vip", "vip nuit", "vip_nuit", "vip gold", "gold"],
  },
  {
    id: "vip-plus",
    name: "VIP+",
    subtitle: "Bleu diamant, prestige supérieur",
    accent: "diamond",
    badge: "Diamond Blue",
    description:
      "Le niveau renforcé pour les membres qui veulent une identité plus rare, plus visible, plus luxueuse et une sensation de vrai privilège.",
    highlight:
      "Le palier qui transforme le compte en présence premium forte, visuelle et immédiatement reconnue.",
    features: [
      "Tous les avantages VIP",
      "Identité visuelle VIP+ bleu diamant",
      "Mise en avant plus marquée du profil",
      "Accès premium renforcé selon les espaces",
      "Priorité supérieure sur certaines expériences",
      "Avantages plus rares sur boutique et univers VIP",
    ],
    durations: [
      { id: "1w", label: "1 semaine", price: 10, displayPrice: "10 $" },
      { id: "1m", label: "1 mois", price: 25, displayPrice: "25 $", popular: true },
      { id: "3m", label: "3 mois", price: 45, displayPrice: "45 $" },
      { id: "6m", label: "6 mois", price: 70, displayPrice: "70 $" },
      { id: "12m", label: "1 an", price: 110, displayPrice: "110 $" },
    ],
    levelMatches: [
      "vip+",
      "vip plus",
      "vip-plus",
      "vip_plus",
      "diamond",
      "blue diamond",
      "vip diamant",
    ],
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

export default function VipPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
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
      is_admin: false,
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
      const fallbackUsername = String(
        authUser.user_metadata?.username || authUser.email || "Membre"
      )
        .split("@")[0]
        .slice(0, 24);

      const ensuredProfile = await ensureProfile(authUser.id, fallbackUsername);
      setProfile(ensuredProfile);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement VIP.");
    } finally {
      setLoading(false);
    }
  }

  const currentLevel = useMemo(
    () => normalizeLevel(profile?.vip_level || "standard"),
    [profile?.vip_level]
  );

  const currentTier = useMemo(() => {
    return (
      VIP_TIERS.find((tier) => tier.levelMatches.includes(currentLevel)) || null
    );
  }, [currentLevel]);

  function chooseTier(tier: VipTier, duration: VipDuration) {
    router.push(`/vip/${tier.id}?duration=${duration.id}`);
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

      <div className="vip-shell">
        <header className="vip-topbar">
          <div>
            <div className="vip-kicker">Premium Access</div>
            <h1 className="vip-title">
              <span className="goldText">VIP</span> & <span className="diamondText">VIP+</span>
            </h1>
            <p className="vip-subtitle">
              Deux univers premium. Le premier en or sensuel et élégant. Le second en bleu diamant, plus rare, plus froid, plus luxueux.
            </p>
          </div>

          <div className="vip-topActions">
            <button className="vip-navBtn" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button className="vip-navBtn" type="button" onClick={() => router.push("/salons")}>
              Salons
            </button>
            <button className="vip-navBtn gold" type="button" onClick={() => router.push("/profile")}>
              Profil
            </button>
          </div>
        </header>

        <section className="vip-heroCard">
          <div className="vip-heroMain">
            <div className="vip-memberLabel">Compte actuel</div>
            <div className="vip-memberName" style={getProfileNameStyle(profile)}>
              {getProfileName(profile)}
            </div>

            <div className="vip-badgeRow">
              <span className="vip-badge ether">
                {Number(profile?.ether_balance || 0)} Ξ
              </span>
              <span className="vip-badge current">
                {profile?.vip_level || "Standard"}
              </span>
              {profile?.is_verified ? (
                <span className="vip-badge verified">Vérifié</span>
              ) : null}
            </div>

            <p className="vip-heroText">
              Ton niveau actuel est{" "}
              <strong>{currentTier ? currentTier.name : "Standard"}</strong>.
              Choisis le palier qui correspond à l’image que tu veux projeter et à l’accès que tu veux débloquer.
            </p>
          </div>

          <div className="vip-currentPanel">
            <span>Niveau actif</span>
            <strong>{currentTier ? currentTier.name : "Standard"}</strong>
            <p>
              {currentTier
                ? currentTier.subtitle
                : "Accès de base sans privilèges premium."}
            </p>
          </div>
        </section>

        {notice ? <div className="vip-notice">{notice}</div> : null}
        {errorMsg ? <div className="vip-error">{errorMsg}</div> : null}

        <section className="vip-tiersGrid">
          {VIP_TIERS.map((tier) => {
            const isCurrent = tier.levelMatches.includes(currentLevel);

            return (
              <article
                key={tier.id}
                className={`vip-tierCard ${tier.accent} ${isCurrent ? "current" : ""}`}
              >
                <div className="vip-tierGlow" />

                <div className="vip-tierHeader">
                  <div className="vip-chipRow">
                    <span className={`vip-chip ${tier.accent}`}>{tier.badge}</span>
                    {isCurrent ? <span className="vip-chip active">Actif</span> : null}
                  </div>

                  <h2 className="vip-tierTitle">{tier.name}</h2>
                  <div className="vip-tierSubtitle">{tier.subtitle}</div>
                </div>

                <p className="vip-tierText">{tier.description}</p>

                <div className="vip-highlightBox">
                  <span>Signature</span>
                  <strong>{tier.highlight}</strong>
                </div>

                <div className="vip-listBlock">
                  <div className="vip-listTitle">Ce que tu débloques</div>
                  <ul className="vip-list">
                    {tier.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="vip-durationsTitle">Durées disponibles</div>

                <div className="vip-durationGrid">
                  {tier.durations.map((duration) => (
                    <div
                      key={`${tier.id}-${duration.id}`}
                      className={`vip-durationCard ${duration.popular ? "popular" : ""}`}
                    >
                      <div className="vip-durationTop">
                        <span className="vip-durationLabel">{duration.label}</span>
                        {duration.popular ? (
                          <span className="vip-chip active">Populaire</span>
                        ) : null}
                      </div>

                      <strong className="vip-durationPrice">
                        {duration.displayPrice}
                      </strong>

                      <button
                        className={`vip-mainBtn ${tier.accent}`}
                        type="button"
                        onClick={() => chooseTier(tier, duration)}
                      >
                        Choisir
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="vip-compareSection">
          <div className="vip-sectionKicker">Comparatif</div>
          <h2 className="vip-sectionTitle">Différence entre VIP et VIP+</h2>

          <div className="vip-compareGrid">
            <div className="vip-compareHeader">Fonction</div>
            <div className="vip-compareHeader goldText">VIP</div>
            <div className="vip-compareHeader diamondText">VIP+</div>

            <div className="vip-compareCell feature">Accès salons VIP</div>
            <div className="vip-compareCell ok">Oui</div>
            <div className="vip-compareCell ok">Oui</div>

            <div className="vip-compareCell feature">Image premium</div>
            <div className="vip-compareCell ok">Renforcée</div>
            <div className="vip-compareCell ok">Renforcée +</div>

            <div className="vip-compareCell feature">Identité visuelle rare</div>
            <div className="vip-compareCell soft">Gold</div>
            <div className="vip-compareCell diamond">Bleu diamant</div>

            <div className="vip-compareCell feature">Priorité expériences</div>
            <div className="vip-compareCell soft">Bonne</div>
            <div className="vip-compareCell ok">Supérieure</div>

            <div className="vip-compareCell feature">Prestige global</div>
            <div className="vip-compareCell soft">Premium</div>
            <div className="vip-compareCell diamond">Très premium</div>
          </div>
        </section>

        <section className="vip-bottomGrid">
          <article className="vip-infoCard">
            <div className="vip-sectionKicker">Ambiance</div>
            <h3 className="vip-infoTitle">Deux styles, deux énergies</h3>
            <p className="vip-infoText">
              <span className="goldText">VIP</span> est plus chaud, doré, sensuel et luxueux.{" "}
              <span className="diamondText">VIP+</span> est plus rare, plus net, plus glacé, plus précieux.
            </p>
          </article>

          <article className="vip-infoCard">
            <div className="vip-sectionKicker">Accès rapide</div>
            <h3 className="vip-infoTitle">Navigation</h3>
            <div className="vip-actionCol">
              <button className="vip-navBtn full" type="button" onClick={() => router.push("/shop")}>
                Boutique
              </button>
              <button className="vip-navBtn full" type="button" onClick={() => router.push("/salons")}>
                Voir les salons
              </button>
              <button className="vip-navBtn full gold" type="button" onClick={() => router.push("/profile")}>
                Revenir au profil
              </button>
            </div>
          </article>
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
    radial-gradient(circle at 18% 16%, rgba(212,175,55,0.10), transparent 26%),
    radial-gradient(circle at 82% 18%, rgba(72,146,255,0.14), transparent 30%),
    linear-gradient(180deg,#0d0205 0%, #090206 38%, #050205 100%);
  color:#fff;
}

.vip-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.vip-bg-a{
  background:
    radial-gradient(circle at 28% 30%, rgba(255,255,255,0.02), transparent 18%),
    radial-gradient(circle at 74% 66%, rgba(212,175,55,0.04), transparent 24%);
  filter:blur(10px);
}
.vip-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.15;
}

.vip-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}

.vip-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.vip-orb-a{
  width:240px;
  height:240px;
  left:60px;
  top:120px;
  background:rgba(212,175,55,0.42);
}
.vip-orb-b{
  width:270px;
  height:270px;
  right:70px;
  top:150px;
  background:rgba(92,162,255,0.26);
}

.vip-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.vip-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.vip-kicker{
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

.vip-title{
  margin:16px 0 0;
  font-size:58px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.goldText{
  background:linear-gradient(90deg,#fff0be 0%, #d4af37 42%, #fff5c4 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.diamondText{
  background:linear-gradient(90deg,#dff6ff 0%, #6fdcff 35%, #5b8cff 72%, #dff6ff 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.vip-subtitle{
  margin:14px 0 0;
  max-width:860px;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
  font-size:17px;
}

.vip-topActions{
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
}
.vip-navBtn.full{
  width:100%;
}
.vip-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.vip-heroCard{
  margin-top:24px;
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:center;
  flex-wrap:wrap;
  padding:24px;
  border-radius:30px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  box-shadow:0 20px 60px rgba(0,0,0,0.26);
}

.vip-memberLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}

.vip-memberName{
  margin-top:8px;
  font-size:38px;
  font-weight:900;
  line-height:1;
}

.vip-badgeRow{
  margin-top:14px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.vip-badge{
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
.vip-badge.ether{
  background:rgba(212,175,55,0.14);
  border-color:rgba(212,175,55,0.22);
  color:#fff1c4;
}
.vip-badge.current{
  background:rgba(255,255,255,0.08);
}
.vip-badge.verified{
  background:rgba(47,143,88,0.16);
  border-color:rgba(47,143,88,0.24);
  color:#b9ffd4;
}

.vip-heroText{
  margin-top:14px;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
  max-width:760px;
}

.vip-currentPanel{
  min-width:240px;
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vip-currentPanel span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.vip-currentPanel strong{
  display:block;
  margin-top:10px;
  font-size:28px;
  color:#fff2cb;
}
.vip-currentPanel p{
  margin:10px 0 0;
  color:rgba(255,245,220,0.68);
  line-height:1.7;
}

.vip-notice,
.vip-error{
  margin-top:18px;
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

.vip-tiersGrid{
  margin-top:28px;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:20px;
}

.vip-tierCard{
  position:relative;
  overflow:hidden;
  border-radius:30px;
  padding:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  min-height:720px;
  display:flex;
  flex-direction:column;
  box-shadow:0 18px 60px rgba(0,0,0,0.24);
}
.vip-tierCard.current{
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.08) inset,
    0 20px 70px rgba(0,0,0,0.28);
}

.vip-tierGlow{
  position:absolute;
  width:220px;
  height:220px;
  right:-50px;
  bottom:-50px;
  border-radius:999px;
  filter:blur(42px);
  opacity:.18;
}
.vip-tierCard.gold .vip-tierGlow{
  background:rgba(212,175,55,0.78);
}
.vip-tierCard.diamond .vip-tierGlow{
  background:rgba(103,195,255,0.74);
}

.vip-chipRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.vip-chip{
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
.vip-chip.gold{
  background:rgba(212,175,55,0.14);
  border-color:rgba(212,175,55,0.22);
  color:#fff1c4;
}
.vip-chip.diamond{
  background:rgba(88,176,255,0.16);
  border-color:rgba(88,176,255,0.24);
  color:#dff5ff;
}
.vip-chip.active{
  background:rgba(47,143,88,0.16);
  border-color:rgba(47,143,88,0.24);
  color:#b9ffd4;
}

.vip-tierTitle{
  margin:18px 0 0;
  font-size:34px;
  line-height:1;
  font-weight:900;
}

.vip-tierSubtitle{
  margin-top:10px;
  font-size:16px;
  color:rgba(255,245,220,0.70);
}

.vip-tierText{
  margin:18px 0 0;
  color:rgba(255,245,220,0.76);
  line-height:1.8;
}

.vip-highlightBox{
  margin-top:18px;
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vip-highlightBox span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.vip-highlightBox strong{
  display:block;
  margin-top:8px;
  color:#fff2cb;
  line-height:1.65;
}

.vip-listBlock{
  margin-top:20px;
}
.vip-listTitle{
  font-size:13px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#fff2cb;
}
.vip-list{
  margin:12px 0 0;
  padding-left:18px;
  display:grid;
  gap:10px;
  color:rgba(255,245,220,0.76);
  line-height:1.7;
}

.vip-durationsTitle{
  margin-top:22px;
  font-size:13px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#fff2cb;
}

.vip-durationGrid{
  margin-top:14px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}

.vip-durationCard{
  padding:14px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vip-durationCard.popular{
  border-color:rgba(212,175,55,0.26);
  box-shadow:0 0 0 1px rgba(212,175,55,0.10) inset;
}

.vip-durationTop{
  display:flex;
  justify-content:space-between;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
}

.vip-durationLabel{
  font-size:13px;
  font-weight:800;
  color:rgba(255,245,220,0.80);
}

.vip-durationPrice{
  display:block;
  margin-top:12px;
  margin-bottom:14px;
  font-size:30px;
  color:#fff2cb;
}

.vip-mainBtn{
  min-height:48px;
  width:100%;
  padding:12px 16px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.vip-mainBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.vip-mainBtn.diamond{
  background:linear-gradient(90deg,#58b0ff,#9ce8ff);
  color:#08141b;
}

.vip-compareSection{
  margin-top:34px;
}
.vip-sectionKicker{
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
.vip-sectionTitle{
  margin:16px 0 0;
  font-size:40px;
  line-height:1;
  font-weight:900;
}

.vip-compareGrid{
  margin-top:20px;
  display:grid;
  grid-template-columns:1.4fr 1fr 1fr;
  gap:10px;
}
.vip-compareHeader,
.vip-compareCell{
  padding:14px 12px;
  border-radius:16px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vip-compareHeader{
  font-weight:900;
  color:#fff2cb;
}
.vip-compareCell.feature{
  color:#fff;
  font-weight:800;
}
.vip-compareCell.ok{
  color:#b9ffd4;
  font-weight:800;
}
.vip-compareCell.soft{
  color:#fff1c4;
  font-weight:800;
}
.vip-compareCell.diamond{
  color:#dff5ff;
  font-weight:800;
}

.vip-bottomGrid{
  margin-top:30px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
}
.vip-infoCard{
  border-radius:28px;
  padding:22px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
}
.vip-infoTitle{
  margin:16px 0 0;
  font-size:30px;
  font-weight:900;
}
.vip-infoText{
  margin:14px 0 0;
  color:rgba(255,245,220,0.76);
  line-height:1.8;
}
.vip-actionCol{
  margin-top:18px;
  display:grid;
  gap:10px;
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

@media (max-width: 1100px){
  .vip-tiersGrid{
    grid-template-columns:1fr;
  }

  .vip-bottomGrid{
    grid-template-columns:1fr;
  }
}

@media (max-width: 860px){
  .vip-title{
    font-size:42px;
  }

  .vip-compareGrid{
    grid-template-columns:1fr;
  }

  .vip-heroCard{
    align-items:flex-start;
  }
}

@media (max-width: 560px){
  .vip-title{
    font-size:34px;
  }

  .vip-memberName{
    font-size:30px;
  }

  .vip-durationGrid{
    grid-template-columns:1fr;
  }
}
`;
