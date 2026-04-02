"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

const GUARD_KEY = "ec_register_guard_v3";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: "Faible", level: 1 };
  if (score <= 4) return { label: "Correct", level: 2 };
  return { label: "Fort", level: 3 };
}

export default function RegisterPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
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

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(password);
  }, [password]);

  const passwordsMatch = useMemo(() => {
    return confirmPassword.length > 0 && password === confirmPassword;
  }, [password, confirmPassword]);

  function handleCapsLock(e: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setNotice("");
    setErrorMsg("");

    if (honeypot.trim()) {
      setErrorMsg("Inscription impossible.");
      return;
    }

    if (cooldownRemaining > 0) {
      setErrorMsg(`Trop de tentatives. Réessaie dans ${cooldownText}.`);
      return;
    }

    const cleanUsername = normalizeUsername(username);
    const cleanEmail = normalizeEmail(email);

    if (!cleanUsername || !cleanEmail || !password || !confirmPassword) {
      setErrorMsg("Remplis correctement tous les champs.");
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg("Le nom de profil doit contenir au moins 3 caractères.");
      return;
    }

    if (!/^[a-zA-Z0-9._ -]{3,24}$/.test(cleanUsername)) {
      setErrorMsg("Le nom de profil contient des caractères non autorisés.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMsg("Adresse email invalide.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!ageConfirmed) {
      setErrorMsg("Tu dois confirmer que tu as 18 ans ou plus.");
      return;
    }

    if (!acceptRules) {
      setErrorMsg("Tu dois accepter les règles d’accès.");
      return;
    }

    try {
      setLoading(true);

      const supabase = getSupabaseBrowserClient();

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login?registered=1`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            username: cleanUsername,
            age_confirmed: true,
          },
        },
      });

      if (error) {
        const nextAttempts = attempts + 1;

        if (nextAttempts >= 5) {
          const nextLockedUntil = Date.now() + 45000;
          setAttempts(0);
          setLockedUntil(nextLockedUntil);
          setErrorMsg("Inscription bloquée temporairement. Réessaie dans 45 secondes.");
        } else {
          setAttempts(nextAttempts);
          setErrorMsg(error.message || "Inscription impossible.");
        }

        return;
      }

      if (data.user?.id) {
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            username: cleanUsername,
            vip_level: "Standard",
            ether_balance: 0,
            is_verified: false,
            theme_mode: "gold",
          },
          { onConflict: "id" }
        );
      }

      setAttempts(0);
      setLockedUntil(0);

      if (data.session) {
        setNotice("Compte créé. Redirection...");
        router.replace("/dashboard");
        return;
      }

      setNotice("Compte créé. Vérifie ton email avant de te connecter.");
    } catch {
      setErrorMsg("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="register-page">
        <style>{css}</style>
        <div className="register-loading">
          <div className="register-loader" />
        </div>
      </main>
    );
  }

  return (
    <main className="register-page">
      <style>{css}</style>

      <div className="register-bg register-bg-a" />
      <div className="register-bg register-bg-b" />
      <div className="register-noise" />
      <div className="register-orb register-orb-a" />
      <div className="register-orb register-orb-b" />
      <div className="register-orb register-orb-c" />

      <section className="register-screen">
        <div className="register-screenGlow" />

        <div className="register-logo">
          <span className="ether">Ether</span>
          <span className="cristal">Cristal</span>
        </div>

        <div className="register-titleWrap">
          <h1 className="register-title">Crée ton accès privé</h1>
          <p className="register-subtitle">Réservé aux adultes.</p>
        </div>

        <div className="register-card">
          <div className="register-cardShine" />

          {notice ? <div className="register-notice">{notice}</div> : null}
          {errorMsg ? <div className="register-error">{errorMsg}</div> : null}

          {cooldownRemaining > 0 ? (
            <div className="register-lockBox">
              Verrouillage temporaire actif : <strong>{cooldownText}</strong>
            </div>
          ) : null}

          <form className="register-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="register-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <label className="register-field">
              <span className="register-label">Nom de profil</span>
              <input
                className="register-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ton pseudo"
                autoComplete="nickname"
                maxLength={24}
              />
            </label>

            <label className="register-field">
              <span className="register-label">Adresse email</span>
              <input
                className="register-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@ethercristal.site"
                autoComplete="email"
                inputMode="email"
              />
            </label>

            <label className="register-field">
              <span className="register-label">Mot de passe</span>

              <div className="register-passwordWrap">
                <input
                  className="register-input register-passwordInput"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                />

                <button
                  className="register-visibilityBtn"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>

              <div className="register-strength">
                <div className="register-strengthTrack">
                  <div
                    className={`register-strengthFill level-${passwordStrength.level}`}
                    style={{
                      width:
                        passwordStrength.level === 1
                          ? "33%"
                          : passwordStrength.level === 2
                          ? "66%"
                          : "100%",
                    }}
                  />
                </div>
                <span className="register-strengthLabel">
                  Force : {passwordStrength.label}
                </span>
              </div>
            </label>

            <label className="register-field">
              <span className="register-label">Confirmation du mot de passe</span>

              <div className="register-passwordWrap">
                <input
                  className="register-input register-passwordInput"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                />

                <button
                  className="register-visibilityBtn"
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? "Masquer" : "Afficher"}
                </button>
              </div>

              {confirmPassword ? (
                <div
                  className={`register-matchHint ${
                    passwordsMatch ? "ok" : "bad"
                  }`}
                >
                  {passwordsMatch
                    ? "Les mots de passe correspondent."
                    : "Les mots de passe ne correspondent pas."}
                </div>
              ) : null}
            </label>

            {capsLock ? <div className="register-hint">Caps Lock est activé.</div> : null}

            <div className="register-checks">
              <label className="register-checkRow">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                />
                <span>Je confirme avoir 18 ans ou plus.</span>
              </label>

              <label className="register-checkRow">
                <input
                  type="checkbox"
                  checked={acceptRules}
                  onChange={(e) => setAcceptRules(e.target.checked)}
                />
                <span>J’accepte les règles d’accès de la plateforme.</span>
              </label>
            </div>

            <button
              className="register-submit"
              type="submit"
              disabled={loading || cooldownRemaining > 0}
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <div className="register-links">
            <button
              type="button"
              className="register-linkBtn"
              onClick={() => router.push("/login")}
            >
              J’ai déjà un compte
            </button>

            <button
              type="button"
              className="register-linkBtn"
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
.register-page{
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

.register-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.register-bg-a{
  background:
    radial-gradient(circle at 35% 32%, rgba(255,255,255,0.025), transparent 18%),
    radial-gradient(circle at 70% 72%, rgba(212,175,55,0.05), transparent 22%);
  filter:blur(10px);
}
.register-bg-b{
  background:
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size:42px 42px;
  opacity:.22;
  mask-image:linear-gradient(180deg, rgba(255,255,255,0.55), transparent 100%);
}

.register-noise{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.035;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0, transparent 22%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.10) 0, transparent 18%);
  mix-blend-mode:screen;
}

.register-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(60px);
  opacity:.18;
  pointer-events:none;
}
.register-orb-a{
  width:220px;
  height:220px;
  left:80px;
  top:100px;
  background:rgba(212,175,55,0.46);
  animation:floatA 9s ease-in-out infinite;
}
.register-orb-b{
  width:260px;
  height:260px;
  right:100px;
  top:140px;
  background:rgba(180,30,60,0.24);
  animation:floatB 12s ease-in-out infinite;
}
.register-orb-c{
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

.register-screen{
  position:relative;
  z-index:2;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:28px 20px;
}

.register-screenGlow{
  position:absolute;
  width:min(820px, 92vw);
  height:min(820px, 92vw);
  border-radius:999px;
  background:radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 45%, transparent 72%);
  filter:blur(18px);
  pointer-events:none;
}

.register-logo{
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

.register-logo .ether{
  background:linear-gradient(90deg,#b8871b 0%, #fff0a8 35%, #d4af37 65%, #fff5c4 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 24px rgba(212,175,55,0.18);
  animation:etherPulse 3.2s ease-in-out infinite;
}

.register-logo .cristal{
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

.register-titleWrap{
  margin-top:18px;
  text-align:center;
}

.register-title{
  margin:0;
  font-size:54px;
  line-height:.95;
  letter-spacing:-2px;
  font-weight:900;
}

.register-subtitle{
  margin:14px 0 0;
  font-size:18px;
  color:rgba(255,245,220,0.74);
  line-height:1.6;
}

.register-card{
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

.register-cardShine{
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 18%, transparent 34%);
  transform:translateX(-120%);
  animation:registerShine 7s linear infinite;
  pointer-events:none;
}

@keyframes registerShine{
  0%{transform:translateX(-120%)}
  30%{transform:translateX(120%)}
  100%{transform:translateX(120%)}
}

.register-notice,
.register-error,
.register-lockBox{
  margin-bottom:16px;
  padding:14px 16px;
  border-radius:18px;
}
.register-notice{
  background:rgba(212,175,55,0.10);
  border:1px solid rgba(212,175,55,0.18);
  color:#fff1c4;
}
.register-error{
  background:rgba(255,47,67,0.10);
  border:1px solid rgba(255,47,67,0.18);
  color:#ffb1ba;
}
.register-lockBox{
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#f6ead0;
}

.register-form{
  display:grid;
  gap:16px;
}

.register-honeypot{
  position:absolute;
  left:-9999px;
  opacity:0;
  pointer-events:none;
}

.register-field{
  display:grid;
  gap:10px;
}

.register-label{
  font-size:13px;
  color:rgba(255,255,255,0.76);
}

.register-input{
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
.register-input::placeholder{
  color:rgba(255,255,255,0.42);
}
.register-input:focus{
  border-color:rgba(212,175,55,0.26);
  box-shadow:0 0 0 3px rgba(212,175,55,0.08);
  background:rgba(255,255,255,0.07);
}

.register-passwordWrap{
  display:grid;
  grid-template-columns:1fr auto;
  gap:10px;
}
.register-passwordInput{
  min-width:0;
}
.register-visibilityBtn{
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
.register-visibilityBtn:hover{
  border-color:rgba(212,175,55,0.18);
  background:rgba(255,255,255,0.08);
}

.register-strength{
  display:flex;
  align-items:center;
  gap:10px;
}
.register-strengthTrack{
  flex:1;
  height:10px;
  border-radius:999px;
  background:rgba(255,255,255,0.08);
  overflow:hidden;
}
.register-strengthFill{
  height:100%;
  border-radius:999px;
  transition:width .22s ease;
}
.register-strengthFill.level-1{
  background:linear-gradient(90deg,#7a2232,#c23a62);
}
.register-strengthFill.level-2{
  background:linear-gradient(90deg,#a46e2a,#d4af37);
}
.register-strengthFill.level-3{
  background:linear-gradient(90deg,#2b7a49,#40c977);
}
.register-strengthLabel{
  font-size:12px;
  color:rgba(255,255,255,0.68);
}

.register-matchHint{
  font-size:12px;
}
.register-matchHint.ok{
  color:#9ee6b8;
}
.register-matchHint.bad{
  color:#ffb1ba;
}

.register-hint{
  font-size:12px;
  color:#ffcf8c;
}

.register-checks{
  display:grid;
  gap:10px;
}

.register-checkRow{
  display:flex;
  gap:10px;
  align-items:flex-start;
  color:rgba(255,245,220,0.82);
  font-size:14px;
}

.register-checkRow input{
  margin-top:2px;
}

.register-submit{
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
.register-submit:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 36px rgba(212,175,55,0.24);
}
.register-submit:disabled{
  opacity:.74;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.register-links{
  margin-top:18px;
  display:flex;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}

.register-linkBtn{
  border:none;
  background:transparent;
  color:#f2d995;
  font-weight:700;
  cursor:pointer;
  padding:0;
}

.register-loading{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#0a0005;
}

.register-loader{
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
  .register-logo{
    font-size:42px;
  }

  .register-title{
    font-size:40px;
  }

  .register-subtitle{
    font-size:16px;
  }

  .register-card{
    max-width:100%;
    padding:22px;
    border-radius:24px;
  }
}

@media (max-width: 560px){
  .register-passwordWrap{
    grid-template-columns:1fr;
  }

  .register-links{
    flex-direction:column;
    align-items:flex-start;
  }

  .register-title{
    font-size:34px;
  }

  .register-logo{
    font-size:34px;
  }
}
`;
