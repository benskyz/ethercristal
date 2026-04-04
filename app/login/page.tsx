"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode") === "register" ? "register" : "login";
    setMode(nextMode);
  }, []);

  const isReady = useMemo(() => {
    if (mode === "login") {
      return email.trim().length > 0 && password.trim().length > 0;
    }

    return (
      username.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length >= 8 &&
      confirmPassword.trim().length > 0
    );
  }, [mode, username, email, password, confirmPassword]);

  async function ensureProfile(user: any, fallbackUsername?: string) {
    const supabase = requireSupabaseBrowserClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || "Impossible de lire le profil.");
    }

    if (profile) return profile;

    const safeUsername = String(
      fallbackUsername || user.user_metadata?.username || user.email || "membre"
    )
      .split("@")[0]
      .slice(0, 24);

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: safeUsername,
        vip_level: "Standard",
        ether_balance: 100,
        is_verified: false,
        is_admin: false,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      throw new Error(upsertError.message || "Impossible de créer le profil.");
    }
  }

  async function handleLogin() {
    const supabase = requireSupabaseBrowserClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    await ensureProfile(data.user);

    window.location.href = "/dashboard";
  }

  async function handleRegister() {
    const supabase = requireSupabaseBrowserClient();

    if (password !== confirmPassword) {
      throw new Error("Les mots de passe ne correspondent pas.");
    }

    if (password.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }

    const cleanUsername = username.trim().slice(0, 24);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { username: cleanUsername },
      },
    });

    if (signUpError) {
      throw new Error(signUpError.message || "Erreur pendant l’inscription.");
    }

    if (data.user) {
      await ensureProfile(data.user, cleanUsername);
    }

    if (data.session && data.user) {
      window.location.href = "/dashboard";
      return;
    }

    setSuccess("Compte créé. Vérifie ton courriel puis connecte-toi.");
    setMode("login");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch (e: any) {
      setError(e?.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ec-auth">
      <style>{css}</style>

      <div className="ec-auth-grid" />
      <div className="ec-auth-noise" />

      <div className="ec-auth-smoke smoke-a" />
      <div className="ec-auth-smoke smoke-b" />
      <div className="ec-auth-smoke smoke-c" />

      <div className="ec-auth-glow glow-red" />
      <div className="ec-auth-glow glow-gold" />
      <div className="ec-auth-glow glow-white" />

      <section className="ec-auth-shell">
        <div className="ec-auth-top">
          <div className="ec-auth-badge">
            <span>💎</span>
            <span>Accès privé EtherCristal</span>
          </div>

          <div className="ec-auth-gem">💎</div>

          <h1 className="ec-auth-logo">EtherCristal</h1>
          <p className="ec-auth-kicker">Noir • Gold • Néon rouge • Cristal</p>
          <p className="ec-auth-sub">
            Entrée membre. Univers réservé. Connexion directe vers le dashboard.
          </p>
        </div>

        <div className="ec-auth-card">
          <div className="ec-auth-switch">
            <button
              type="button"
              className={`ec-auth-switchBtn ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Connexion
            </button>

            <button
              type="button"
              className={`ec-auth-switchBtn ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
              }}
            >
              Inscription
            </button>
          </div>

          <div className="ec-auth-head">
            <h2>{mode === "login" ? "Entrer" : "Créer un compte"}</h2>
            <p>
              {mode === "login"
                ? "Accède à ton espace membre en une étape."
                : "Crée ton accès EtherCristal et prépare ton profil."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="ec-auth-form">
            {mode === "register" ? (
              <div className={`field ${username ? "filled" : ""}`}>
                <label className="field-label">Nom d’utilisateur</label>
                <div className="field-box">
                  <span className="field-icon">✦</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Votre pseudo"
                  />
                  <div className="field-line" />
                </div>
              </div>
            ) : null}

            <div className={`field ${email ? "filled" : ""}`}>
              <label className="field-label">Adresse email</label>
              <div className="field-box">
                <span className="field-icon">◆</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
                <div className="field-line" />
              </div>
            </div>

            <div className={`field ${password ? "filled" : ""}`}>
              <label className="field-label">Mot de passe</label>
              <div className="field-box">
                <span className="field-icon">✦</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
                <div className="field-line" />
              </div>
            </div>

            {mode === "register" ? (
              <div className={`field ${confirmPassword ? "filled" : ""}`}>
                <label className="field-label">Confirmer le mot de passe</label>
                <div className="field-box">
                  <span className="field-icon">◆</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <div className="field-line" />
                </div>
              </div>
            ) : null}

            {error ? <div className="ec-auth-error">{error}</div> : null}
            {success ? <div className="ec-auth-success">{success}</div> : null}

            <button
              type="submit"
              disabled={loading || !isReady}
              className={`ec-auth-submit ${isReady ? "ready" : ""}`}
            >
              <span className="ec-auth-submitGlow" />
              <span className="ec-auth-submitText">
                {loading
                  ? mode === "login"
                    ? "Connexion..."
                    : "Création..."
                  : mode === "login"
                  ? "SE CONNECTER"
                  : "CRÉER MON COMPTE"}
              </span>
            </button>
          </form>

          <div className="ec-auth-miniStats">
            <div className="miniStat">
              <span>Ether</span>
              <strong>Monnaie</strong>
            </div>
            <div className="miniStat">
              <span>VIP</span>
              <strong>Statut</strong>
            </div>
            <div className="miniStat">
              <span>Accès</span>
              <strong>Privé</strong>
            </div>
          </div>

          <div className="ec-auth-bottom">
            {mode === "login" ? (
              <p>
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  className="ec-auth-linkBtn"
                  onClick={() => setMode("register")}
                >
                  Créer un compte
                </button>
              </p>
            ) : (
              <p>
                Déjà un compte ?{" "}
                <button
                  type="button"
                  className="ec-auth-linkBtn"
                  onClick={() => setMode("login")}
                >
                  Se connecter
                </button>
              </p>
            )}

            <p className="ec-auth-footnote">Accès réservé • 18+ • Québec</p>
          </div>
        </div>
      </section>
    </main>
  );
}

const css = `
.ec-auth{
  min-height:100vh;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 14%, rgba(255,0,72,0.16), transparent 18%),
    linear-gradient(180deg,#020202 0%, #070305 48%, #020202 100%);
  color:#fff;
}

.ec-auth-grid{
  position:absolute;
  inset:0;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.04;
  pointer-events:none;
}

.ec-auth-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.05;
  background-image:radial-gradient(rgba(255,255,255,0.10) 0.7px, transparent 0.7px);
  background-size:8px 8px;
  mix-blend-mode:soft-light;
}

.ec-auth-smoke{
  position:absolute;
  border-radius:999px;
  filter:blur(90px);
  pointer-events:none;
  mix-blend-mode:screen;
  opacity:.18;
  animation:authSmokeFloat 18s ease-in-out infinite alternate;
}

.smoke-a{
  top:1%;
  left:-8%;
  width:520px;
  height:260px;
  background:
    radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.10), transparent 56%),
    radial-gradient(ellipse at 60% 45%, rgba(255,0,72,0.15), transparent 58%),
    radial-gradient(ellipse at 82% 55%, rgba(212,175,55,0.12), transparent 54%);
}

.smoke-b{
  right:-10%;
  top:14%;
  width:560px;
  height:300px;
  background:
    radial-gradient(ellipse at 30% 52%, rgba(255,255,255,0.09), transparent 56%),
    radial-gradient(ellipse at 58% 42%, rgba(255,40,90,0.14), transparent 58%),
    radial-gradient(ellipse at 78% 60%, rgba(212,175,55,0.12), transparent 54%);
  animation-duration:23s;
}

.smoke-c{
  left:22%;
  bottom:0%;
  width:500px;
  height:260px;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.07), transparent 58%),
    radial-gradient(ellipse at 30% 48%, rgba(255,0,72,0.11), transparent 56%),
    radial-gradient(ellipse at 72% 52%, rgba(212,175,55,0.10), transparent 54%);
  animation-duration:20s;
}

.ec-auth-glow{
  position:absolute;
  border-radius:999px;
  filter:blur(120px);
  pointer-events:none;
  opacity:.14;
  animation:authGlowPulse 8s ease-in-out infinite;
}

.glow-red{
  width:220px;
  height:220px;
  top:12%;
  left:15%;
  background:rgba(255,0,72,0.34);
}

.glow-gold{
  width:260px;
  height:260px;
  top:10%;
  right:18%;
  background:rgba(212,175,55,0.24);
  animation-delay:1.2s;
}

.glow-white{
  width:170px;
  height:170px;
  bottom:10%;
  left:48%;
  background:rgba(255,255,255,0.16);
  animation-delay:2.2s;
}

.ec-auth-shell{
  position:relative;
  z-index:2;
  min-height:100vh;
  width:100%;
  max-width:700px;
  margin:0 auto;
  padding:20px 16px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:14px;
}

.ec-auth-top{
  text-align:center;
}

.ec-auth-badge{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:9px 14px;
  border-radius:999px;
  border:1px solid rgba(212,175,55,0.14);
  background:rgba(255,255,255,0.04);
  color:#f3d27a;
  font-size:11px;
  font-weight:800;
  letter-spacing:.10em;
  text-transform:uppercase;
  backdrop-filter:blur(12px);
}

.ec-auth-gem{
  margin:14px auto 10px;
  width:70px;
  height:70px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:34px;
  background:linear-gradient(135deg,#b91c1c,#ec4899,#d4af37);
  box-shadow:0 0 28px rgba(255,0,72,0.20);
}

.ec-auth-logo{
  margin:0;
  font-size:clamp(42px, 8vw, 58px);
  line-height:.94;
  font-weight:900;
  letter-spacing:-0.055em;
  background:linear-gradient(
    90deg,
    #ff5b6e 0%,
    #ff314f 22%,
    #d4af37 58%,
    #fff1c9 84%,
    #ffffff 100%
  );
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ec-auth-kicker{
  margin:8px 0 0;
  color:rgba(255,245,220,0.70);
  font-size:10px;
  font-weight:800;
  letter-spacing:.20em;
  text-transform:uppercase;
}

.ec-auth-sub{
  margin:10px auto 0;
  max-width:420px;
  color:rgba(255,255,255,0.56);
  line-height:1.7;
  font-size:13px;
}

.ec-auth-card{
  width:100%;
  max-width:500px;
  margin:0 auto;
  padding:20px;
  border-radius:24px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)),
    rgba(8,8,10,0.88);
  border:1px solid rgba(212,175,55,0.10);
  box-shadow:
    0 18px 48px rgba(0,0,0,0.56),
    inset 0 0 0 1px rgba(255,255,255,0.02);
  backdrop-filter:blur(18px);
}

.ec-auth-switch{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-bottom:14px;
}

.ec-auth-switchBtn{
  min-height:42px;
  border:none;
  border-radius:14px;
  background:rgba(255,255,255,0.04);
  color:rgba(255,255,255,0.72);
  font-weight:900;
  cursor:pointer;
}

.ec-auth-switchBtn.active{
  background:linear-gradient(90deg,#8f1b1b 0%, #d6284f 52%, #d4af37 100%);
  color:#140c02;
}

.ec-auth-head{
  text-align:center;
}

.ec-auth-head h2{
  margin:0;
  font-size:26px;
  font-weight:900;
}

.ec-auth-head p{
  margin:8px auto 0;
  max-width:320px;
  color:rgba(255,255,255,0.60);
  line-height:1.6;
  font-size:13px;
}

.ec-auth-form{
  margin-top:16px;
  display:grid;
  gap:12px;
}

.field{
  position:relative;
}

.field-label{
  display:block;
  margin:0 0 7px;
  color:rgba(255,255,255,0.64);
  font-size:11px;
  font-weight:700;
  letter-spacing:.05em;
}

.field-box{
  position:relative;
  display:flex;
  align-items:center;
  min-height:52px;
  padding:0 12px 0 14px;
  border-radius:16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
    rgba(16,16,18,0.92);
  border:1px solid rgba(255,255,255,0.08);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.01),
    0 0 0 rgba(255,0,72,0);
  transition:border-color .25s ease, box-shadow .25s ease, transform .25s ease;
  overflow:hidden;
}

.field-box::before{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(
    120deg,
    transparent 0%,
    rgba(255,255,255,0.00) 35%,
    rgba(255,255,255,0.10) 50%,
    rgba(255,255,255,0.00) 65%,
    transparent 100%
  );
  transform:translateX(-120%);
  pointer-events:none;
}

.field.filled .field-box::before{
  animation:fieldShine 3.8s ease-in-out infinite;
}

.field-box:focus-within{
  border-color:rgba(212,175,55,0.34);
  box-shadow:
    0 0 0 1px rgba(212,175,55,0.10),
    0 0 16px rgba(255,0,72,0.12),
    0 0 24px rgba(212,175,55,0.08);
  transform:translateY(-1px);
}

.field-icon{
  width:20px;
  margin-right:10px;
  color:#f3d27a;
  font-size:14px;
  text-align:center;
  opacity:.9;
}

.field-box input{
  flex:1;
  border:none;
  outline:none;
  background:transparent;
  color:#fff;
  font-size:14px;
}

.field-box input::placeholder{
  color:rgba(255,255,255,0.28);
}

.field-toggle{
  border:none;
  background:transparent;
  color:rgba(255,255,255,0.54);
  font-size:16px;
  cursor:pointer;
}

.field-line{
  position:absolute;
  left:0;
  bottom:0;
  width:100%;
  height:2px;
  background:linear-gradient(90deg,#ff3b57 0%, #d4af37 60%, #ffffff 100%);
  transform:scaleX(0);
  transform-origin:left;
  transition:transform .28s ease;
  opacity:.95;
}

.field-box:focus-within .field-line{
  transform:scaleX(1);
}

.ec-auth-error,
.ec-auth-success{
  padding:12px 13px;
  border-radius:14px;
  text-align:center;
  font-size:12px;
}

.ec-auth-error{
  background:rgba(255,60,80,0.10);
  border:1px solid rgba(255,60,80,0.22);
  color:#ffbec8;
}

.ec-auth-success{
  background:rgba(34,197,94,0.10);
  border:1px solid rgba(34,197,94,0.22);
  color:#cbffd9;
}

.ec-auth-submit{
  position:relative;
  min-height:52px;
  border:none;
  border-radius:16px;
  overflow:hidden;
  cursor:pointer;
  font-weight:900;
  color:#fff;
  background:linear-gradient(90deg,#7f1d1d 0%, #c81e4a 52%, #a61c2f 100%);
  transition:transform .18s ease, box-shadow .22s ease, filter .22s ease;
}

.ec-auth-submit.ready{
  background:linear-gradient(90deg,#8f1b1b 0%, #d6284f 42%, #d4af37 78%, #fff0cc 100%);
  color:#160d02;
  box-shadow:
    0 0 16px rgba(255,0,72,0.18),
    0 0 24px rgba(212,175,55,0.12);
}

.ec-auth-submit:hover{
  transform:translateY(-1px);
  filter:brightness(1.06);
}

.ec-auth-submit:disabled{
  opacity:.74;
  cursor:not-allowed;
}

.ec-auth-submitGlow{
  position:absolute;
  inset:-40%;
  background:radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 55%);
  opacity:0;
  transition:opacity .25s ease;
}

.ec-auth-submit.ready .ec-auth-submitGlow{
  opacity:1;
  animation:buttonGlow 2.8s ease-in-out infinite;
}

.ec-auth-submitText{
  position:relative;
  z-index:2;
  display:block;
  padding:15px 18px;
  letter-spacing:.04em;
  font-size:15px;
}

.ec-auth-miniStats{
  margin-top:14px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}

.miniStat{
  padding:12px;
  border-radius:14px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  text-align:center;
}

.miniStat span{
  display:block;
  color:rgba(255,255,255,0.48);
  font-size:10px;
  font-weight:800;
  letter-spacing:.10em;
  text-transform:uppercase;
}

.miniStat strong{
  display:block;
  margin-top:6px;
  font-size:13px;
  color:#f7f1da;
}

.ec-auth-bottom{
  margin-top:16px;
  text-align:center;
}

.ec-auth-linkBtn{
  background:none;
  border:none;
  color:#f3d27a;
  font-weight:700;
  cursor:pointer;
}

.ec-auth-footnote{
  margin:14px 0 0;
  color:rgba(255,255,255,0.38);
  font-size:10px;
  font-weight:800;
  letter-spacing:.18em;
  text-transform:uppercase;
}

@keyframes authSmokeFloat{
  0%{ transform:translate3d(0,0,0) scale(1); }
  50%{ transform:translate3d(18px,-10px,0) scale(1.05); }
  100%{ transform:translate3d(-24px,14px,0) scale(1.09); }
}

@keyframes authGlowPulse{
  0%,100%{ opacity:.10; transform:scale(1); }
  50%{ opacity:.18; transform:scale(1.08); }
}

@keyframes fieldShine{
  0%{ transform:translateX(-120%); opacity:0; }
  20%{ opacity:1; }
  45%{ transform:translateX(160%); opacity:.85; }
  100%{ transform:translateX(160%); opacity:0; }
}

@keyframes buttonGlow{
  0%,100%{ transform:scale(1); opacity:.18; }
  50%{ transform:scale(1.08); opacity:.30; }
}

@media (max-width: 560px){
  .ec-auth-shell{
    padding:16px 10px;
  }

  .ec-auth-card{
    padding:16px;
    border-radius:20px;
  }

  .ec-auth-head h2{
    font-size:23px;
  }

  .ec-auth-miniStats{
    grid-template-columns:1fr;
  }
}
`;
