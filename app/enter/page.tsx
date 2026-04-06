"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Timer,
  KeyRound,
} from "lucide-react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function passwordScore(pw: string) {
  const s = pw.trim();
  let score = 0;
  if (s.length >= 10) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[a-z]/.test(s)) score++;
  if (/[0-9]/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  return Math.min(score, 5);
}

function nowMs() {
  return Date.now();
}

// --- simple local rate limiter ---
const RL_KEY = "ec_auth_attempts_v1";
function loadAttempts(): number[] {
  try {
    const raw = localStorage.getItem(RL_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}
function saveAttempts(list: number[]) {
  try {
    localStorage.setItem(RL_KEY, JSON.stringify(list.slice(-50)));
  } catch {}
}
function recordAttempt() {
  const t = nowMs();
  const list = loadAttempts().filter((x) => t - x < 10 * 60 * 1000); // keep 10 minutes
  list.push(t);
  saveAttempts(list);
  return list;
}
function attemptsInWindow(windowMs: number) {
  const t = nowMs();
  return loadAttempts().filter((x) => t - x < windowMs).length;
}

export default function EnterPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");

  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // honeypot anti-bot
  const [hp, setHp] = useState("");

  // cooldown
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const tickRef = useRef<number | null>(null);

  // already connected -> dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) router.replace("/dashboard");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer UI for cooldown
  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      // force rerender each second while cooldown
      if (cooldownUntil > nowMs()) setCooldownUntil((v) => v);
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [cooldownUntil]);

  const pwScore = useMemo(() => passwordScore(password), [password]);
  const pwLabel = useMemo(() => {
    if (!password.trim()) return "—";
    if (pwScore <= 1) return "Faible";
    if (pwScore === 2) return "Moyen";
    if (pwScore === 3) return "Bon";
    if (pwScore === 4) return "Très bon";
    return "Fort";
  }, [pwScore, password]);

  const cooldownSeconds = useMemo(() => {
    const left = Math.max(0, Math.ceil((cooldownUntil - nowMs()) / 1000));
    return left;
  }, [cooldownUntil]);

  const disabledByCooldown = cooldownUntil > nowMs();

  const emailRedirectTo = useMemo(() => {
    const prod = "https://www.ethercristal.site";
    const origin = typeof window !== "undefined" ? window.location.origin : prod;
    const base = origin.includes("localhost") || origin.includes("127.0.0.1") ? origin : prod;
    return `${base}/login?confirm=1&next=/dashboard`;
  }, []);

  const resetRedirectTo = useMemo(() => {
    const prod = "https://www.ethercristal.site";
    const origin = typeof window !== "undefined" ? window.location.origin : prod;
    const base = origin.includes("localhost") || origin.includes("127.0.0.1") ? origin : prod;
    return `${base}/login?reset=1&next=/dashboard`;
  }, []);

  function applyCooldownIfNeeded() {
    // 5 attempts in 2 minutes -> 30s cooldown
    // 10 attempts in 10 minutes -> 2 min cooldown
    const a2m = attemptsInWindow(2 * 60 * 1000);
    const a10m = attemptsInWindow(10 * 60 * 1000);

    let cd = 0;
    if (a10m >= 10) cd = 120;
    else if (a2m >= 5) cd = 30;

    if (cd > 0) setCooldownUntil(nowMs() + cd * 1000);
  }

  async function onSubmit() {
    setError("");
    setInfo("");

    // bot trap
    if (hp.trim()) {
      setError("Action bloquée.");
      return;
    }

    if (disabledByCooldown) {
      setError(`Patiente ${cooldownSeconds}s avant de réessayer.`);
      return;
    }

    const e = email.trim();

    if (!isValidEmail(e)) {
      setError("Entre un email valide.");
      return;
    }

    if (mode === "register") {
      const ps = pseudo.trim();
      if (ps.length < 3) {
        setError("Ton pseudo doit faire au moins 3 caractères.");
        return;
      }
      if (password.trim().length < 10) {
        setError("Mot de passe trop court (min 10).");
        return;
      }
      if (password !== password2) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }
      if (pwScore <= 1) {
        setError("Mot de passe trop faible. Renforce-le (majuscule, chiffre, symbole).");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        // record attempt before request (anti brute force)
        recordAttempt();
        applyCooldownIfNeeded();

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: e,
          password,
        });

        if (signInErr) {
          // generic message (don’t leak)
          setError("Connexion impossible. Vérifie tes infos et réessaie.");
          applyCooldownIfNeeded();
          return;
        }

        router.replace("/dashboard");
        return;
      }

      if (mode === "reset") {
        recordAttempt();
        applyCooldownIfNeeded();

        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(e, {
          redirectTo: resetRedirectTo,
        });

        if (resetErr) {
          setError("Impossible d’envoyer le lien. Réessaie.");
          applyCooldownIfNeeded();
          return;
        }

        setInfo("Lien de réinitialisation envoyé si l’email existe ✅");
        return;
      }

      // register
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          emailRedirectTo,
          data: { pseudo: pseudo.trim(), is_18_plus: true },
        },
      });

      if (signUpErr) throw signUpErr;

      // Upsert profile (si RLS bloque, signup reste OK)
      if (data?.user?.id) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          pseudo: pseudo.trim(),
          email: e,
          credits: 0,
          is_vip: false,
          is_admin: false,
          role: "user",
        });
      }

      setInfo("Compte créé. Vérifie ton email pour confirmer ✅");
      setMode("login");
      setPassword("");
      setPassword2("");
    } catch (err: any) {
      setError(err?.message || "Erreur. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      {/* background premium */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,70,120,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(80,220,255,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />
        <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[22px] border border-white/10 bg-white/5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <ShieldCheck className="h-6 w-6 text-white/85" />
            </div>
            <div className="text-xs uppercase tracking-[0.26em] text-white/45">
              Accès privé
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {mode === "login" ? "Connexion" : mode === "register" ? "Inscription" : "Réinitialiser"}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Petit bloc propre, centré. Sécurisé.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
            {/* Mode switch */}
            <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-black/25 p-1">
              <button
                onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                className={cx(
                  "rounded-xl px-3 py-2 text-sm font-black transition",
                  mode === "login" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                )}
              >
                Login
              </button>
              <button
                onClick={() => { setMode("register"); setError(""); setInfo(""); }}
                className={cx(
                  "rounded-xl px-3 py-2 text-sm font-black transition",
                  mode === "register" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                )}
              >
                Register
              </button>
              <button
                onClick={() => { setMode("reset"); setError(""); setInfo(""); }}
                className={cx(
                  "rounded-xl px-3 py-2 text-sm font-black transition",
                  mode === "reset" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                )}
              >
                Reset
              </button>
            </div>

            {/* Cooldown */}
            {disabledByCooldown ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <div className="flex items-center gap-2 font-black">
                  <Timer className="h-4 w-4" />
                  Cooldown : {cooldownSeconds}s
                </div>
                <div className="mt-1 text-xs text-white/55">
                  Trop d’essais. Patiente un peu et réessaie.
                </div>
              </div>
            ) : null}

            {/* Alerts */}
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-center gap-2 font-black">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            ) : null}
            {info ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {info}
              </div>
            ) : null}

            {/* honeypot hidden */}
            <input
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="mt-5 space-y-4">
              {mode === "register" ? (
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    Pseudo
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      placeholder="Ton pseudo"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-rose-400/35"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    inputMode="email"
                    autoComplete="email"
                    placeholder="email@domaine.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-rose-400/35"
                  />
                </div>
              </div>

              {mode !== "reset" ? (
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPw ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "login" ? "••••••••" : "Min 10 caractères"}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white outline-none transition focus:border-rose-400/35"
                      onKeyDown={(e) => setCapsLock(e.getModifierState?.("CapsLock") || false)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {capsLock ? (
                    <div className="mt-2 text-xs text-amber-100/90">
                      CapsLock activé.
                    </div>
                  ) : null}

                  {mode === "register" ? (
                    <>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-white/50">Force :</span>
                        <span
                          className={cx(
                            "font-black",
                            pwScore <= 1 && "text-red-200",
                            pwScore === 2 && "text-amber-200",
                            pwScore === 3 && "text-cyan-200",
                            pwScore >= 4 && "text-emerald-200"
                          )}
                        >
                          {pwLabel}
                        </span>
                      </div>

                      <div className="mt-3">
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/45">
                          Confirmer
                        </label>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <input
                            value={password2}
                            onChange={(e) => setPassword2(e.target.value)}
                            type={showPw2 ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Confirme ton mot de passe"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white outline-none transition focus:border-rose-400/35"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw2((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                            aria-label="Toggle confirm password visibility"
                          >
                            {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <button
                onClick={onSubmit}
                disabled={loading || disabledByCooldown}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-3 text-sm font-black text-black shadow-[0_18px_55px_rgba(0,0,0,0.35)] transition hover:opacity-95 disabled:opacity-70"
              >
                {mode === "login" ? "Se connecter" : mode === "register" ? "Créer le compte" : "Envoyer le lien"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>

              <div className="pt-2 text-center text-[11px] text-white/35">
                EtherCristal • privé • premium
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[11px] text-white/30">
            Connexion → Dashboard. Register activé. Anti-spam actif.
          </div>
        </div>
      </div>
    </div>
  );
}
