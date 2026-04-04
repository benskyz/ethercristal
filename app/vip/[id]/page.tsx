"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { requireSupabaseBrowserClient } from "../../../lib/supabase";

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
  visuals: string[];
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
      "Une aura dorée, plus sensuelle, plus luxueuse, plus visible sans tomber dans l’excès.",
    features: [
      "Accès aux salons VIP",
      "Badge premium visible",
      "Profil mieux valorisé",
      "Expérience premium plus cohérente",
      "Accès boutique réservé sur certaines offres",
      "Présence plus forte dans l’univers EtherCristal",
    ],
    durations: [
      { id: "1w", label: "1 semaine", price: 5, displayPrice: "5 $" },
      { id: "1m", label: "1 mois", price: 17, displayPrice: "17 $", popular: true },
      { id: "3m", label: "3 mois", price: 36.99, displayPrice: "36.99 $" },
      { id: "6m", label: "6 mois", price: 60, displayPrice: "60 $" },
      { id: "12m", label: "1 an", price: 90, displayPrice: "90 $" },
    ],
    levelMatches: ["vip", "vip nuit", "vip_nuit", "vip gold", "gold"],
    visuals: [
      "Palette or chaud et velours sombre",
      "Présence premium visible",
      "Ambiance élégante et sensuelle",
    ],
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
      "Une présence plus nette, plus froide, plus précieuse, avec une vraie impression de rareté premium.",
    features: [
      "Tous les avantages VIP",
      "Identité VIP+ bleu diamant",
      "Présence encore plus haut de gamme",
      "Meilleure mise en avant du profil",
      "Accès premium renforcé selon les espaces",
      "Sens d’exclusivité supérieur",
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
    visuals: [
      "Palette bleu diamant et reflets glacés",
      "Prestige plus rare et plus net",
      "Signature premium plus exclusive",
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

export default function VipDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const tierId = String(params?.id || "").toLowerCase();
  const durationParam = String(searchParams.get("duration") || "");

  const tier = useMemo(() => {
    return VIP_TIERS.find((item) => item.id === tierId) || null;
  }, [tierId]);

  const selectedDuration = useMemo(() => {
    if (!tier) return null;
    return (
      tier.durations.find((duration) => duration.id === durationParam) ||
      tier.durations.find((duration) => duration.popular) ||
      tier.durations[0]
    );
  }, [tier, durationParam]);

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

      if (!tier) {
        setErrorMsg("Offre VIP introuvable.");
        setLoading(false);
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
      setErrorMsg(e?.message || "Erreur chargement offre VIP.");
    } finally {
      setLoading(false);
    }
  }

  const currentLevel = useMemo(
    () => normalizeLevel(profile?.vip_level || "standard"),
    [profile?.vip_level]
  );

  const isCurrentTier = useMemo(() => {
    if (!tier) return false;
    return tier.levelMatches.includes(currentLevel);
  }, [tier, currentLevel]);

  async function handleCheckout() {
    if (!tier || !selectedDuration) return;

    try {
      setStartingCheckout(true);
      setNotice("");
      setErrorMsg("");

      const productSlug = `${tier.id}-${selectedDuration.id}`;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceName: `${tier.name} — ${selectedDuration.label}`,
          amountUsd: selectedDuration.price,
          mode: "payment",
          metadata: {
            product_slug: productSlug,
            vip_tier: tier.id,
            vip_duration: selectedDuration.id,
            vip_duration_label: selectedDuration.label,
            auto_equip: "false",
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.url) {
        setErrorMsg(json?.error || "Impossible de lancer le paiement Stripe.");
        return;
      }

      window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lancement paiement.");
    } finally {
      setStartingCheckout(false);
    }
  }

  if (loading) {
    return (
      <main className="vipd-page">
        <style>{css}</style>
        <div className="vipd-loading">
          <div className="vipd-loader" />
        </div>
      </main>
    );
  }

  if (!tier || !selectedDuration) {
    return (
      <main className="vipd-page">
        <style>{css}</style>
        <div className="vipd-shell">
          <div className="vipd-error">Offre introuvable.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="vipd-page">
      <style>{css}</style>

      <div className="vipd-bg vipd-bg-a" />
      <div className="vipd-bg vipd-bg-b" />
      <div className="vipd-noise" />
      <div className={`vipd-orb vipd-orb-a ${tier.accent}`} />
      <div className={`vipd-orb vipd-orb-b ${tier.accent}`} />

      <div className="vipd-shell">
        <header className="vipd-topbar">
          <div>
            <div className="vipd-kicker">Détail de l’offre</div>
            <h1 className="vipd-title">
              {tier.accent === "gold" ? (
                <span className="goldText">{tier.name}</span>
              ) : (
                <span className="diamondText">{tier.name}</span>
              )}
            </h1>
            <p className="vipd-subtitle">{tier.subtitle}</p>
          </div>

          <div className="vipd-topActions">
            <button className="vipd-navBtn" type="button" onClick={() => router.push("/vip")}>
              Retour VIP
            </button>
            <button className="vipd-navBtn" type="button" onClick={() => router.push("/profile")}>
              Profil
            </button>
            <button className="vipd-navBtn gold" type="button" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
          </div>
        </header>

        <section className={`vipd-hero ${tier.accent}`}>
          <div className="vipd-memberBlock">
            <div className="vipd-memberLabel">Compte</div>
            <div className="vipd-memberName" style={getProfileNameStyle(profile)}>
              {getProfileName(profile)}
            </div>

            <div className="vipd-badgeRow">
              <span className="vipd-badge ether">
                {Number(profile?.ether_balance || 0)} Ξ
              </span>
              <span className="vipd-badge current">
                {profile?.vip_level || "Standard"}
              </span>
              {profile?.is_verified ? (
                <span className="vipd-badge verified">Vérifié</span>
              ) : null}
            </div>

            <p className="vipd-memberText">
              {isCurrentTier
                ? `Tu es déjà sur le niveau ${tier.name}. Tu peux renouveler ou prolonger avec une nouvelle durée.`
                : `Tu es actuellement sur ${profile?.vip_level || "Standard"}. Cette offre te fera passer sur ${tier.name}.`}
            </p>
          </div>

          <div className="vipd-summaryCard">
            <span>Durée sélectionnée</span>
            <strong>{selectedDuration.label}</strong>
            <p>{selectedDuration.displayPrice}</p>
          </div>
        </section>

        {notice ? <div className="vipd-notice">{notice}</div> : null}
        {errorMsg ? <div className="vipd-error">{errorMsg}</div> : null}

        <section className="vipd-grid">
          <article className={`vipd-card main ${tier.accent}`}>
            <div className="vipd-cardKicker">Signature</div>
            <h2 className="vipd-cardTitle">{tier.highlight}</h2>
            <p className="vipd-cardText">{tier.description}</p>

            <div className="vipd-visualGrid">
              {tier.visuals.map((item) => (
                <div key={item} className="vipd-visualItem">
                  {item}
                </div>
              ))}
            </div>

            <div className="vipd-listBlock">
              <div className="vipd-listTitle">Ce que tu débloques</div>
              <ul className="vipd-list">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </article>

          <article className="vipd-card side">
            <div className="vipd-cardKicker">Durées</div>
            <h2 className="vipd-cardTitle">Choisis ta formule</h2>

            <div className="vipd-durationGrid">
              {tier.durations.map((duration) => {
                const active = duration.id === selectedDuration.id;

                return (
                  <button
                    key={duration.id}
                    className={`vipd-durationChoice ${active ? "active" : ""}`}
                    type="button"
                    onClick={() => router.push(`/vip/${tier.id}?duration=${duration.id}`)}
                  >
                    <div className="vipd-durationTop">
                      <span>{duration.label}</span>
                      {duration.popular ? (
                        <span className="vipd-miniBadge">Populaire</span>
                      ) : null}
                    </div>
                    <strong>{duration.displayPrice}</strong>
                  </button>
                );
              })}
            </div>

            <div className="vipd-checkoutBox">
              <div className="vipd-checkoutRow">
                <span>Offre</span>
                <strong>{tier.name}</strong>
              </div>
              <div className="vipd-checkoutRow">
                <span>Durée</span>
                <strong>{selectedDuration.label}</strong>
              </div>
              <div className="vipd-checkoutRow total">
                <span>Total</span>
                <strong>{selectedDuration.displayPrice}</strong>
              </div>
            </div>

            <button
              className={`vipd-mainBtn ${tier.accent}`}
              type="button"
              onClick={() => void handleCheckout()}
              disabled={startingCheckout}
            >
              {startingCheckout ? "Ouverture..." : isCurrentTier ? "Renouveler" : "Continuer vers paiement"}
            </button>
          </article>

          <article className="vipd-card wide">
            <div className="vipd-cardKicker">Questions rapides</div>
            <h2 className="vipd-cardTitle">Ce qu’il faut savoir</h2>

            <div className="vipd-faqGrid">
              <div className="vipd-faqItem">
                <strong>Quand l’accès est débloqué ?</strong>
                <p>Dès que le paiement est validé et traité côté site.</p>
              </div>
              <div className="vipd-faqItem">
                <strong>VIP+ inclut-il VIP ?</strong>
                <p>Oui, VIP+ est au-dessus de VIP et reprend ses avantages essentiels.</p>
              </div>
              <div className="vipd-faqItem">
                <strong>Peut-on renouveler ?</strong>
                <p>Oui, tu peux reprendre une durée même si tu es déjà sur ce niveau.</p>
              </div>
              <div className="vipd-faqItem">
                <strong>Où voir l’effet ensuite ?</strong>
                <p>Sur le profil, dans les salons concernés et dans ton expérience premium globale.</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

const css = `
.vipd-page{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 18% 16%, rgba(212,175,55,0.10), transparent 26%),
    radial-gradient(circle at 82% 18%, rgba(72,146,255,0.14), transparent 30%),
    linear-gradient(180deg,#0d0205 0%, #090206 38%, #050205 100%);
  color:#fff;
}

.vipd-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.vipd-bg-a{
  background:
    radial-gradient(circle at 28% 30%, rgba(255,255,255,0.02), transparent 18%),
    radial-gradient(circle at 74% 66%, rgba(212,175,55,0.04), transparent 24%);
  filter:blur(10px);
}
.vipd-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.15;
}

.vipd-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.03;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
}

.vipd-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.16;
  pointer-events:none;
}
.vipd-orb-a{
  width:240px;
  height:240px;
  left:60px;
  top:120px;
}
.vipd-orb-b{
  width:270px;
  height:270px;
  right:70px;
  top:150px;
}
.vipd-orb.gold{
  background:rgba(212,175,55,0.42);
}
.vipd-orb.diamond{
  background:rgba(92,162,255,0.28);
}

.vipd-shell{
  position:relative;
  z-index:2;
  max-width:1460px;
  margin:0 auto;
  padding:28px 20px 42px;
}

.vipd-topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
  align-items:flex-start;
}

.vipd-kicker{
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

.vipd-title{
  margin:16px 0 0;
  font-size:56px;
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

.vipd-subtitle{
  margin:14px 0 0;
  max-width:760px;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
  font-size:17px;
}

.vipd-topActions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
}

.vipd-navBtn{
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
.vipd-navBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  border-color:transparent;
}

.vipd-hero{
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
.vipd-hero.diamond{
  border-color:rgba(92,162,255,0.24);
}

.vipd-memberLabel{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.56);
}
.vipd-memberName{
  margin-top:8px;
  font-size:38px;
  font-weight:900;
  line-height:1;
}
.vipd-badgeRow{
  margin-top:14px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.vipd-badge{
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
.vipd-badge.ether{
  background:rgba(212,175,55,0.14);
  border-color:rgba(212,175,55,0.22);
  color:#fff1c4;
}
.vipd-badge.current{
  background:rgba(255,255,255,0.08);
}
.vipd-badge.verified{
  background:rgba(47,143,88,0.16);
  border-color:rgba(47,143,88,0.24);
  color:#b9ffd4;
}
.vipd-memberText{
  margin-top:14px;
  color:rgba(255,245,220,0.74);
  line-height:1.8;
  max-width:740px;
}

.vipd-summaryCard{
  min-width:240px;
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vipd-summaryCard span{
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:rgba(255,255,255,0.54);
}
.vipd-summaryCard strong{
  display:block;
  margin-top:10px;
  font-size:28px;
  color:#fff2cb;
}
.vipd-summaryCard p{
  margin:10px 0 0;
  color:rgba(255,245,220,0.68);
  line-height:1.7;
}

.vipd-notice,
.vipd-error{
  margin-top:18px;
  padding:14px 16px;
  border-radius:18px;
}
.vipd-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.vipd-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.vipd-grid{
  margin-top:28px;
  display:grid;
  grid-template-columns:1.2fr 0.8fr;
  gap:20px;
}

.vipd-card{
  border-radius:30px;
  padding:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(14px);
  box-shadow:0 18px 60px rgba(0,0,0,0.24);
}
.vipd-card.wide{
  grid-column:1 / -1;
}
.vipd-card.diamond{
  border-color:rgba(92,162,255,0.24);
}

.vipd-cardKicker{
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
.vipd-cardTitle{
  margin:16px 0 0;
  font-size:34px;
  line-height:1;
  font-weight:900;
}
.vipd-cardText{
  margin:16px 0 0;
  color:rgba(255,245,220,0.76);
  line-height:1.8;
}

.vipd-visualGrid{
  margin-top:18px;
  display:grid;
  gap:10px;
}
.vipd-visualItem{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff2cb;
  font-weight:800;
}

.vipd-listBlock{
  margin-top:20px;
}
.vipd-listTitle{
  font-size:13px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#fff2cb;
}
.vipd-list{
  margin:12px 0 0;
  padding-left:18px;
  display:grid;
  gap:10px;
  color:rgba(255,245,220,0.76);
  line-height:1.7;
}

.vipd-durationGrid{
  margin-top:18px;
  display:grid;
  gap:10px;
}
.vipd-durationChoice{
  width:100%;
  text-align:left;
  border:none;
  cursor:pointer;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#fff;
}
.vipd-durationChoice.active{
  border-color:rgba(212,175,55,0.26);
  box-shadow:0 0 0 1px rgba(212,175,55,0.10) inset;
}
.vipd-durationTop{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:center;
}
.vipd-durationChoice strong{
  display:block;
  margin-top:10px;
  color:#fff2cb;
  font-size:24px;
}

.vipd-miniBadge{
  display:inline-flex;
  min-height:28px;
  padding:5px 10px;
  border-radius:999px;
  background:rgba(47,143,88,0.16);
  border:1px solid rgba(47,143,88,0.24);
  color:#b9ffd4;
  font-size:11px;
  font-weight:900;
}

.vipd-checkoutBox{
  margin-top:20px;
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vipd-checkoutRow{
  display:flex;
  justify-content:space-between;
  gap:10px;
  padding:8px 0;
  color:rgba(255,245,220,0.76);
}
.vipd-checkoutRow.total{
  margin-top:6px;
  padding-top:14px;
  border-top:1px solid rgba(255,255,255,0.08);
}
.vipd-checkoutRow strong{
  color:#fff2cb;
}

.vipd-mainBtn{
  margin-top:18px;
  min-height:50px;
  width:100%;
  padding:12px 18px;
  border:none;
  border-radius:16px;
  font-weight:900;
  cursor:pointer;
}
.vipd-mainBtn.gold{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
}
.vipd-mainBtn.diamond{
  background:linear-gradient(90deg,#58b0ff,#9ce8ff);
  color:#08141b;
}

.vipd-faqGrid{
  margin-top:18px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.vipd-faqItem{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}
.vipd-faqItem strong{
  display:block;
  color:#fff2cb;
}
.vipd-faqItem p{
  margin:10px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.75;
}

.vipd-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}
.vipd-loader{
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

@media (max-width: 980px){
  .vipd-grid{
    grid-template-columns:1fr;
  }

  .vipd-faqGrid{
    grid-template-columns:1fr;
  }
}

@media (max-width: 760px){
  .vipd-title{
    font-size:40px;
  }

  .vipd-hero{
    align-items:flex-start;
  }
}

@media (max-width: 560px){
  .vipd-title{
    font-size:34px;
  }

  .vipd-memberName{
    font-size:30px;
  }
}
`;
