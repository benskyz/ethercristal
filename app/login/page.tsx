"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

const GUARD_KEY = "ec_login_guard_v2";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function LoginPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [capsLock, setCapsLock] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GUARD_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (typeof parsed.attempts === "number") setAttempts(parsed.attempts);
      if (typeof parsed.lockedUntil === "number") setLockedUntil(parsed.lockedUntil);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GUARD_KEY,
        JSON.stringify({
          attempts,
          lockedUntil,
        })
      );
    } catch {}
  }, [attempts, lockedUntil]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();

        if (!active) return;

        if (data.user) {
          router.replace("/dashboard");
          return;
        }
      } catch {
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  const cooldownRemaining = useMemo(() => {
    return Math.max(0, lockedUntil - now);
  }, [lockedUntil, now]);

  const cooldownText = useMemo(() => {
    const seconds = Math.ceil(cooldownRemaining / 1000);
    if (seconds <= 0) return "";
    return `${seconds}s`;
  }, [cooldownRemaining]);

  function handleCapsLock(e: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setNotice("");
    setErrorMsg("");

    if (honeypot.trim()) {
      setErrorMsg("Connexion impossible.");
      return;
    }

    if (cooldownRemaining > 0) {
      setErrorMsg(`Trop de tentatives. Réessaie dans ${cooldownText}.`);
      return;
    }

    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      setErrorMsg("Remplis correctement l’email et le mot de passe.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMsg("Adresse email invalide.");
      return;
    }

    try {
      setLoading(true);

      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const nextAttempts = attempts + 1;

        if (nextAttempts >= 5) {
          const nextLockedUntil = Date.now() + 30000;
          setAttempts(0);
          setLockedUntil(nextLockedUntil);
          setErrorMsg("Connexion bloquée temporairement. Réessaie dans 30 secondes.");
        } else {
          setAttempts(nextAttempts);
          setErrorMsg("Connexion impossible. Vérifie tes identifiants.");
        }

        return;
      }

      setAttempts(0);
      setLockedUntil(0);
      setNotice("Connexion réussie. Redirection...");
      router.replace("/dashboard");
    } catch {
      setErrorMsg("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="login-page">
        <style>{css}</style>
        <div className="login-loading">
          <div className="login-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <style>{css}</style>

      <div className="login-bg login-bg-a" />
      <div className="login-bg login-bg-b" />
      <div className="login-noise" />
      <div className="login-orb login-orb-a" />
      <div className="login-orb login-orb-b" />
      <div className="login-orb login-orb-c" />

      <section className="login-screen">
        <div className="login-screenGlow" />

        <div className="login-logo">
          <span className="ether">Ether</span>
          <span className="cristal">Cristal</span>
        </div>

        <div className="login-titleWrap">
          <h1 className="login-title">Entre dans l’espace privé</h1>
          <p className="login-subtitle">Réservé aux adultes.</p>
        </div>

        <div className="login-card">
          <div className="login-cardShine" />

          {notice ? <div className="login-notice">{notice}</div> : null}
          {errorMsg ? <div className="login-error">{errorMsg}</div> : null}

          {cooldownRemaining > 0 ? (
            <div className="login-lockBox">
              Verrouillage temporaire actif : <strong>{cooldownText}</strong>
            </div>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="login-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <label className="login-field">
              <span className="login-label">Adresse email</span>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@ethercristal.site"
                autoComplete="email"
                inputMode="email"
              />
            </label>

            <label className="login-field">
              <span className="login-label">Mot de passe</span>

              <div className="login-passwordWrap">
                <input
                  className="login-input login-passwordInput"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                />

                <button
                  className="login-visibilityBtn"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>

              {capsLock ? <div className="login-hint">Caps Lock est activé.</div> : null}
            </label>

            <button
              className="login-submit"
              type="submit"
              disabled={loading || cooldownRemaining > 0}
            >
              {loading ? "Connexion..." : "Entrer dans EtherCristal"}
            </button>
          </form>

          <div className="login-links">
            <button
              type="button"
              className="login-linkBtn"
              onClick={() => router.push("/register")}
            >
              Créer un compte
            </button>

            <button
              type="button"
              className="login-linkBtn"
              onClick={() => router.push("/age")}
            >
              Vérification 18+
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

const css = `
.login-page{
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

.login-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.login-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.login-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.22;
  mask-image:linear-gradient(180deg, rgba(255,255,255,0.55), transparent 100%);
}

.login-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.035;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
  mix-blend-mode:screen;
}

.login-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.18;
  pointer-events:none;
}
.login-orb-a{
  width:220px;
  height:220px;
  left:80px;
  top:100px;
  background:rgba(212,175,55,0.46);
  animation:floatA 9s ease-in-out infinite;
}
.login-orb-b{
  width:260px;
  height:260px;
  right:100px;
  top:140px;
  background:rgba(180,30,60,0.24);
  animation:floatB 12s ease-in-out infinite;
}
.login-orb-c{
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

.login-screen{
  position:relative;
  z-index:2;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:28px 20px;
}

.login-screenGlow{
  position:absolute;
  width:min(780px, 90vw);
  height:min(780px, 90vw);
  border-radius:999px;
  background:radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 45%, transparent 72%);
  filter:blur(18px);
  pointer-events:none;
}

.login-logo{
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

.login-logo .ether{
  background:linear-gradient(90deg,#b8871b 0%, #fff0a8 35%, #d4af37 65%, #fff5c4 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 24px rgba(212,175,55,0.18);
  animation:etherPulse 3.2s ease-in-out infinite;
}

.login-logo .cristal{
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

.login-titleWrap{
  margin-top:18px;
  text-align:center;
}

.login-title{
  margin:0;
  font-size:54px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.login-subtitle{
  margin:14px 0 0;
  font-size:18px;
  color:rgba(255,245,220,0.74);
  line-height:1.6;
}

.login-card{
  position:relative;
  width:100%;
  max-width:620px;
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

.login-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:loginShine 7s linear infinite;
  pointer-events:none;
}

@keyframes loginShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.login-notice,
.login-error,
.login-lockBox{
  margin-bottom:16px;
  padding:14px 16px;
  border-radius:18px;
}
.login-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.login-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}
.login-lockBox{
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#f6ead0;
}

.login-form{
  display:grid;
  gap:16px;
}

.login-honeypot{
  position:absolute;
  left:-9999px;
  opacity:0;
  pointer-events:none;
}

.login-field{
  display:grid;
  gap:10px;
}

.login-label{
  font-size:13px;
  color:rgba(255,255,255,0.76);
}

.login-input{
  width:100%;
  min-height:58px;
  padding:0 18px;
  border:none;
  outline:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  border:1px solid rgba(255,255,255,0.08);
  transition:border-color .22s ease, box-shadow .22s ease, background .22s ease;
}
.login-input::placeholder{
  color:rgba(255,255,255,0.42);
}
.login-input:focus{
  border-color:rgba(212,175,55,0.26);
  box-shadow:0 0 0 3px rgba(212,175,55,0.08);
  background:rgba(255,255,255,0.07);
}

.login-passwordWrap{
  display:grid;
  grid-template-columns:1fr auto;
  gap:10px;
}
.login-passwordInput{
  min-width:0;
}
.login-visibilityBtn{
  min-height:58px;
  padding:0 18px;
  border:none;
  border-radius:18px;
  background:rgba(255,255,255,0.06);
  color:#fff;
  font-weight:700;
  cursor:pointer;
  border:1px solid rgba(255,255,255,0.08);
  transition:border-color .22s ease, background .22s ease;
}
.login-visibilityBtn:hover{
  border-color:rgba(212,175,55,0.18);
  background:rgba(255,255,255,0.08);
}

.login-hint{
  font-size:12px;
  color:#ffcf8c;
}

.login-submit{
  min-height:60px;
  margin-top:4px;
  border:none;
  border-radius:18px;
  background:linear-gradient(90deg,#d4af37,#f0d48a);
  color:#1a0014;
  font-size:16px;
  font-weight:900;
  cursor:pointer;
  transition:transform .22s ease, opacity .22s ease, box-shadow .22s ease;
  box-shadow:0 12px 30px rgba(212,175,55,0.18);
}
.login-submit:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 36px rgba(212,175,55,0.24);
}
.login-submit:disabled{
  opacity:.74;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.login-links{
  margin-top:18px;
  display:flex;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}

.login-linkBtn{
  border:none;
  background:transparent;
  color:#f2d995;
  font-weight:700;
  cursor:pointer;
  padding:0;
}

.login-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}

.login-loader{
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

@media (max-width: 820px){
  .login-logo{
    font-size:42px;
  }

  .login-title{
    font-size:40px;
  }

  .login-subtitle{
    font-size:16px;
  }

  .login-card{
    max-width:100%;
    padding:22px;
    border-radius:24px;
  }
}

@media (max-width: 560px){
  .login-passwordWrap{
    grid-template-columns:1fr;
  }

  .login-links{
    flex-direction:column;
    align-items:flex-start;
  }

  .login-title{
    font-size:34px;
  }

  .login-logo{
    font-size:34px;
  }
}
`;
