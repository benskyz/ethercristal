"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getSafeNextPath() {
  if (typeof window === "undefined") return "/dashboard";

  const params = new URLSearchParams(window.location.search);
  const rawNext = params.get("next") || "/dashboard";

  if (!rawNext.startsWith("/")) return "/dashboard";
  if (rawNext.startsWith("//")) return "/dashboard";

  return rawNext;
}

export default function AgePage() {
  const router = useRouter();

  const [nextPath, setNextPath] = useState("/dashboard");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setNextPath(getSafeNextPath());
  }, []);

  const nextLabel = useMemo(() => {
    if (nextPath === "/dashboard") return "dashboard";
    return nextPath.replace("/", "") || "espace privé";
  }, [nextPath]);

  async function handleAccept() {
    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/age/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accepted: true,
          next: nextPath,
        }),
      });

      if (!res.ok) {
        throw new Error("Impossible de valider l’accès 18+.");
      }

      router.replace(nextPath);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors de la validation.");
      setSubmitting(false);
    }
  }

  function handleDecline() {
    window.location.href = "https://www.google.com";
  }

  return (
    <main className="age-page">
      <style>{css}</style>

      <div className="age-bg age-bg-a" />
      <div className="age-bg age-bg-b" />
      <div className="age-noise" />
      <div className="age-orb age-orb-a" />
      <div className="age-orb age-orb-b" />
      <div className="age-orb age-orb-c" />

      <section className="age-screen">
        <div className="age-screenGlow" />

        <div className="age-logo">
          <span className="ether">Ether</span>
          <span className="cristal">Cristal</span>
        </div>

        <div className="age-titleWrap">
          <div className="age-kicker">Vérification d’accès</div>
          <h1 className="age-title">Entrer dans l’espace privé</h1>
          <p className="age-subtitle">
            Cette zone est réservée aux adultes. Tu dois confirmer avoir 18 ans ou plus pour continuer vers le {nextLabel}.
          </p>
        </div>

        <div className="age-card">
          <div className="age-cardShine" />

          <div className="age-warning">
            <div className="age-warningIcon">18+</div>
            <div className="age-warningText">
              <strong>Accès réservé aux adultes</strong>
              <p>
                En continuant, tu confirmes que tu as l’âge légal requis pour accéder à ce contenu privé.
              </p>
            </div>
          </div>

          {errorMsg ? <div className="age-error">{errorMsg}</div> : null}

          <div className="age-points">
            <div className="age-point">
              <span className="dot" />
              Univers privé réservé
            </div>
            <div className="age-point">
              <span className="dot" />
              Vérification avant entrée
            </div>
            <div className="age-point">
              <span className="dot" />
              Redirection sécurisée
            </div>
          </div>

          <div className="age-actions">
            <button
              className="age-btn age-btn-primary"
              onClick={() => void handleAccept()}
              disabled={submitting}
              type="button"
            >
              {submitting ? "Validation..." : "J’ai 18 ans ou plus"}
            </button>

            <button
              className="age-btn age-btn-secondary"
              onClick={handleDecline}
              disabled={submitting}
              type="button"
            >
              Quitter
            </button>
          </div>

          <div className="age-footer">
            En accédant à cet espace, tu reconnais être majeur selon les lois applicables de ton lieu de résidence.
          </div>
        </div>
      </section>
    </main>
  );
}

const css = `
.age-page{
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

.age-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.age-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.age-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.22;
  mask-image:linear-gradient(180deg, rgba(255,255,255,0.55), transparent 100%);
}

.age-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.035;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
  mix-blend-mode:screen;
}

.age-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.18;
  pointer-events:none;
}
.age-orb-a{
  width:220px;
  height:220px;
  left:80px;
  top:100px;
  background:rgba(212,175,55,0.46);
  animation:floatA 9s ease-in-out infinite;
}
.age-orb-b{
  width:260px;
  height:260px;
  right:100px;
  top:140px;
  background:rgba(180,30,60,0.24);
  animation:floatB 12s ease-in-out infinite;
}
.age-orb-c{
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

.age-screen{
  position:relative;
  z-index:2;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:28px 20px;
}

.age-screenGlow{
  position:absolute;
  width:min(820px, 92vw);
  height:min(820px, 92vw);
  border-radius:999px;
  background:radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 45%, transparent 72%);
  filter:blur(18px);
  pointer-events:none;
}

.age-logo{
  position:relative;
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  justify-content:center;
  align-items:center;
  font-size:56px;
  font-weight:900;
  letter-spacing:-2px;
  line-height:1;
  text-align:center;
}

.age-logo .ether{
  background:linear-gradient(90deg,#b8871b 0%, #fff0a8 35%, #d4af37 65%, #fff5c4 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 24px rgba(212,175,55,0.18);
  animation:etherPulse 3.2s ease-in-out infinite;
}

.age-logo .cristal{
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

.age-titleWrap{
  margin-top:18px;
  text-align:center;
  max-width:760px;
}

.age-kicker{
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

.age-title{
  margin:18px 0 0;
  font-size:54px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.age-subtitle{
  margin:14px 0 0;
  font-size:18px;
  color:rgba(255,245,220,0.74);
  line-height:1.7;
}

.age-card{
  position:relative;
  width:100%;
  max-width:680px;
  margin-top:28px;
  padding:28px;
  border-radius:30px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)),
    rgba(255,255,255,0.03);
  border:1px solid rgba(212,175,55,0.16);
  backdrop-filter:blur(16px);
  box-shadow:
    0 24px 80px rgba(0,0,0,0.40),
    inset 0 1px 0 rgba(255,255,255,0.05);
  overflow:hidden;
}

.age-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:ageShine 7s linear infinite;
  pointer-events:none;
}

@keyframes ageShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.age-warning{
  display:flex;
  gap:16px;
  align-items:flex-start;
  padding:18px;
  border-radius:22px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
}

.age-warningIcon{
  min-width:64px;
  height:64px;
  border-radius:18px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  font-size:20px;
  font-weight:900;
  box-shadow:0 12px 28px rgba(212,175,55,0.20);
}

.age-warningText strong{
  display:block;
  font-size:20px;
  color:#fff3d2;
}

.age-warningText p{
  margin:8px 0 0;
  color:rgba(255,245,220,0.72);
  line-height:1.7;
}

.age-error{
  margin-top:16px;
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}

.age-points{
  margin-top:18px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.age-point{
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-height:34px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#f6ead0;
  font-size:12px;
  font-weight:700;
}

.dot{
  width:8px;
  height:8px;
  border-radius:999px;
  background:#d4af37;
  box-shadow:0 0 10px rgba(212,175,55,0.8);
  display:inline-block;
}

.age-actions{
  margin-top:22px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}

.age-btn{
  min-height:60px;
  border:none;
  border-radius:18px;
  font-size:16px;
  font-weight:900;
  cursor:pointer;
  transition:transform .22s ease, opacity .22s ease, box-shadow .22s ease;
}

.age-btn-primary{
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  box-shadow:0 12px 30px rgba(212,175,55,0.18);
}
.age-btn-primary:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 36px rgba(212,175,55,0.24);
}

.age-btn-secondary{
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.10);
}
.age-btn-secondary:hover{
  transform:translateY(-1px);
  border-color:rgba(212,175,55,0.18);
}

.age-btn:disabled{
  opacity:.74;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.age-footer{
  margin-top:18px;
  font-size:12px;
  line-height:1.7;
  color:rgba(255,245,220,0.56);
}

@media (max-width: 820px){
  .age-logo{
    font-size:42px;
  }

  .age-title{
    font-size:40px;
  }

  .age-subtitle{
    font-size:16px;
  }

  .age-card{
    max-width:100%;
    padding:22px;
    border-radius:24px;
  }
}

@media (max-width: 560px){
  .age-actions{
    grid-template-columns:1fr;
  }

  .age-title{
    font-size:34px;
  }

  .age-logo{
    font-size:34px;
  }

  .age-warning{
    flex-direction:column;
  }
}
`;
