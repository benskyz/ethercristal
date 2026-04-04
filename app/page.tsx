import Link from "next/link";

export default function HomePage() {
  return (
    <main className="ec-entry">
      <style>{css}</style>

      <div className="ec-grid" />
      <div className="ec-noise" />

      <div className="ec-smoke ec-smoke-a" />
      <div className="ec-smoke ec-smoke-b" />
      <div className="ec-smoke ec-smoke-c" />

      <div className="ec-glow ec-glow-red" />
      <div className="ec-glow ec-glow-gold" />
      <div className="ec-glow ec-glow-white" />

      <section className="ec-shell">
        <div className="ec-topBadge">
          <span>💎</span>
          <span>Accès privé réservé aux adultes</span>
        </div>

        <div className="ec-logoWrap">
          <div className="ec-logoGem">◆</div>
          <h1 className="ec-logoText">EtherCristal</h1>
          <div className="ec-logoShine" />
        </div>

        <div className="ec-mainCard">
          <h2 className="ec-title">Un espace fermé. Une entrée assumée.</h2>

          <p className="ec-lead">
            EtherCristal est une plateforme privée 18+ pensée comme une porte
            d’entrée vers un univers plus sombre, plus élégant et plus exclusif.
          </p>

          <div className="ec-textBlock">
            <p>
              Ici, rien n’est exposé avant la connexion. L’expérience commence
              par l’atmosphère, par le seuil, par la décision d’entrer.
            </p>

            <p>
              L’identité visuelle repose sur un mélange de noir profond, de rouge
              néon, de gold lumineux et de reflets cristal pour créer une
              présence forte, adulte et soignée.
            </p>

            <p>
              L’accès au reste de l’univers se fait uniquement après
              authentification. Cette page n’est pas une vitrine. C’est
              l’introduction.
            </p>
          </div>

          <div className="ec-infoGrid">
            <div className="ec-infoCard">
              <span>Accès</span>
              <strong>Connexion requise</strong>
            </div>

            <div className="ec-infoCard">
              <span>Entrée</span>
              <strong>Réservée aux membres</strong>
            </div>

            <div className="ec-infoCard">
              <span>Cadre</span>
              <strong>Privé • 18+ • Québec</strong>
            </div>
          </div>

          <div className="ec-actions">
            <Link href="/login" className="ec-btn ec-btn-primary">
              Entrer
            </Link>

            <Link href="/register" className="ec-btn ec-btn-secondary">
              Créer un compte
            </Link>
          </div>

          <p className="ec-footnote">
            L’univers complet devient accessible après connexion.
          </p>
        </div>
      </section>
    </main>
  );
}

const css = `
.ec-entry{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 14%, rgba(255,0,72,0.16), transparent 18%),
    linear-gradient(180deg,#020202 0%, #070305 48%, #020202 100%);
  color:#fff;
}

.ec-grid{
  position:absolute;
  inset:0;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size:44px 44px;
  opacity:.04;
  pointer-events:none;
}

.ec-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.05;
  background-image:radial-gradient(rgba(255,255,255,0.10) 0.7px, transparent 0.7px);
  background-size:8px 8px;
  mix-blend-mode:soft-light;
}

.ec-smoke{
  position:absolute;
  border-radius:999px;
  filter:blur(95px);
  pointer-events:none;
  mix-blend-mode:screen;
  opacity:.18;
  animation:ecSmokeFloat 18s ease-in-out infinite alternate;
}

.ec-smoke-a{
  top:-2%;
  left:-8%;
  width:580px;
  height:300px;
  background:
    radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.11), transparent 56%),
    radial-gradient(ellipse at 58% 40%, rgba(255,0,72,0.14), transparent 58%),
    radial-gradient(ellipse at 82% 55%, rgba(212,175,55,0.12), transparent 54%);
}

.ec-smoke-b{
  top:12%;
  right:-10%;
  width:660px;
  height:340px;
  background:
    radial-gradient(ellipse at 30% 52%, rgba(255,255,255,0.09), transparent 56%),
    radial-gradient(ellipse at 58% 42%, rgba(255,40,90,0.14), transparent 58%),
    radial-gradient(ellipse at 78% 60%, rgba(212,175,55,0.12), transparent 54%);
  animation-duration:24s;
}

.ec-smoke-c{
  bottom:-2%;
  left:18%;
  width:620px;
  height:300px;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08), transparent 58%),
    radial-gradient(ellipse at 28% 48%, rgba(255,0,72,0.12), transparent 56%),
    radial-gradient(ellipse at 74% 52%, rgba(212,175,55,0.11), transparent 54%);
  animation-duration:21s;
}

.ec-glow{
  position:absolute;
  border-radius:999px;
  filter:blur(120px);
  pointer-events:none;
  opacity:.14;
  animation:ecGlowPulse 8s ease-in-out infinite;
}

.ec-glow-red{
  width:260px;
  height:260px;
  top:10%;
  left:14%;
  background:rgba(255,0,72,0.34);
}

.ec-glow-gold{
  width:300px;
  height:300px;
  top:10%;
  right:18%;
  background:rgba(212,175,55,0.28);
  animation-delay:1.2s;
}

.ec-glow-white{
  width:180px;
  height:180px;
  top:28%;
  left:48%;
  background:rgba(255,255,255,0.16);
  animation-delay:2.4s;
}

.ec-shell{
  position:relative;
  z-index:2;
  min-height:100vh;
  width:100%;
  max-width:980px;
  margin:0 auto;
  padding:34px 18px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-align:center;
}

.ec-topBadge{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:10px 16px;
  border-radius:999px;
  border:1px solid rgba(212,175,55,0.14);
  background:rgba(255,255,255,0.04);
  color:#f3d27a;
  font-size:12px;
  font-weight:800;
  letter-spacing:.10em;
  text-transform:uppercase;
  backdrop-filter:blur(12px);
}

.ec-logoWrap{
  position:relative;
  margin-top:22px;
  width:max-content;
  padding-right:18px;
}

.ec-logoGem{
  font-size:34px;
  color:#ffffff;
  opacity:.94;
  text-shadow:
    0 0 12px rgba(255,255,255,0.30),
    0 0 22px rgba(212,175,55,0.18);
  margin-bottom:10px;
}

.ec-logoText{
  margin:0;
  font-size:clamp(58px, 10vw, 102px);
  line-height:.9;
  font-weight:900;
  letter-spacing:-0.065em;
  background:linear-gradient(
    90deg,
    #ff5b6e 0%,
    #ff314f 20%,
    #d4af37 58%,
    #fff1c9 84%,
    #ffffff 100%
  );
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ec-logoShine{
  position:absolute;
  top:-12px;
  left:-28px;
  width:90px;
  height:160%;
  background:linear-gradient(
    120deg,
    transparent 0%,
    rgba(255,255,255,0.00) 32%,
    rgba(255,255,255,0.22) 50%,
    rgba(255,255,255,0.00) 68%,
    transparent 100%
  );
  transform:translateX(-120%) skewX(-16deg);
  filter:blur(4px);
  animation:ecLogoShine 5.4s ease-in-out infinite;
  pointer-events:none;
}

.ec-mainCard{
  width:100%;
  max-width:760px;
  margin-top:26px;
  padding:30px 28px;
  border-radius:30px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
    rgba(8,8,10,0.78);
  border:1px solid rgba(255,255,255,0.07);
  backdrop-filter:blur(18px);
  box-shadow:0 20px 60px rgba(0,0,0,0.42);
}

.ec-title{
  margin:0;
  font-size:clamp(28px, 5vw, 40px);
  font-weight:900;
  line-height:1.1;
  color:#fff8df;
}

.ec-lead{
  margin:18px auto 0;
  max-width:640px;
  color:#fff0cc;
  font-size:18px;
  font-weight:700;
  line-height:1.8;
}

.ec-textBlock{
  margin-top:22px;
  display:grid;
  gap:16px;
}

.ec-textBlock p{
  margin:0;
  color:rgba(255,255,255,0.74);
  line-height:1.9;
  font-size:15px;
}

.ec-infoGrid{
  margin-top:24px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}

.ec-infoCard{
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.06);
}

.ec-infoCard span{
  display:block;
  color:rgba(255,255,255,0.48);
  font-size:11px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
}

.ec-infoCard strong{
  display:block;
  margin-top:8px;
  color:#f7f1da;
  font-size:14px;
  line-height:1.5;
}

.ec-actions{
  margin-top:26px;
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  gap:14px;
}

.ec-btn{
  min-width:210px;
  min-height:56px;
  padding:16px 24px;
  border-radius:18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;
  font-size:15px;
  font-weight:900;
  letter-spacing:.04em;
  transition:transform .18s ease, filter .2s ease, box-shadow .2s ease;
}

.ec-btn:hover{
  transform:translateY(-1px);
  filter:brightness(1.06);
}

.ec-btn-primary{
  color:#160d02;
  background:linear-gradient(90deg,#8f1b1b 0%, #d6284f 40%, #d4af37 78%, #fff0cc 100%);
  box-shadow:
    0 0 20px rgba(255,0,72,0.18),
    0 0 32px rgba(212,175,55,0.12);
}

.ec-btn-secondary{
  color:#f5ead1;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(212,175,55,0.14);
}

.ec-footnote{
  margin:18px 0 0;
  color:rgba(255,255,255,0.44);
  font-size:12px;
  line-height:1.7;
}

@keyframes ecSmokeFloat{
  0%{ transform:translate3d(0,0,0) scale(1); }
  50%{ transform:translate3d(18px,-10px,0) scale(1.05); }
  100%{ transform:translate3d(-24px,14px,0) scale(1.09); }
}

@keyframes ecGlowPulse{
  0%,100%{ opacity:.10; transform:scale(1); }
  50%{ opacity:.18; transform:scale(1.08); }
}

@keyframes ecLogoShine{
  0%{ transform:translateX(-120%) skewX(-16deg); opacity:0; }
  18%{ opacity:1; }
  38%{ transform:translateX(300%) skewX(-16deg); opacity:.95; }
  100%{ transform:translateX(300%) skewX(-16deg); opacity:0; }
}

@media (max-width: 760px){
  .ec-shell{
    padding:26px 14px;
  }

  .ec-mainCard{
    padding:22px 18px;
    border-radius:22px;
  }

  .ec-lead{
    font-size:16px;
  }

  .ec-infoGrid{
    grid-template-columns:1fr;
  }

  .ec-actions{
    flex-direction:column;
    align-items:center;
  }

  .ec-btn{
    width:100%;
    max-width:340px;
  }
}
`;
