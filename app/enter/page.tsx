"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
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
  if (s.length >= 8) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[a-z]/.test(s)) score++;
  if (/[0-9]/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  return Math.min(score, 5);
}

export default function EnterPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // si déjà connecté → dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) router.replace("/dashboard");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pwScore = useMemo(() => passwordScore(password), [password]);

  const pwLabel = useMemo(() => {
    if (!password.trim()) return "—";
    if (pwScore <= 1) return "Faible";
    if (pwScore === 2) return "Moyen";
    if (pwScore === 3) return "Bon";
    if (pwScore === 4) return "Très bon";
    return "Fort";
  }, [pwScore, password]);

  const emailRedirectTo = useMemo(() => {
    // prod fixe
    const prod = "https://www.ethercristal.site";
    // local OK si tu testes
    const origin = typeof window !== "undefined" ? window.location.origin : prod;
    const base = origin.includes("localhost") || origin.includes("127.0.0.1") ? origin : prod;
    return `${base}/login?confirm=1&next=/dashboard`;
  }, []);

  async function onSubmit() {
    setError("");
    setInfo("");

    const e = email.trim();
    const p = password;

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
      if (p.trim().length < 8) {
        setError("Mot de passe trop court (min 8).");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: e,
          password: p,
        });
        if (signInErr) throw signInErr;

        router.replace("/dashboard");
        return;
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: e,
        password: p,
        options: {
          emailRedirectTo,
          data: {
            pseudo: pseudo.trim(),
            is_18_plus: true,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      // Upsert profile (si RLS bloque, ça n’empêche pas le signup)
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
            <h1 className="mt-2 text-3xl font-black tracking-tight">Connexion</h1>
            <p className="mt-2 text-sm text-white/60">
              Petit login propre, centré, premium.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
            {/* Mode switch */}
            <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1">
              <button
                onClick={() => setMode("login")}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-black transition",
                  mode === "login" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                )}
              >
                Connexion
              </button>
              <button
                onClick={() => setMode("register")}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-black transition",
                  mode === "register" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                )}
              >
                Inscription
              </button>
            </div>

            {/* Alerts */}
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {info}
              </div>
            ) : null}

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
                    placeholder={mode === "login" ? "••••••••" : "Min 8 caractères"}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white outline-none transition focus:border-rose-400/35"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSubmit();
                    }}
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

                {mode === "register" ? (
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
                ) : null}
              </div>

              <button
                onClick={onSubmit}
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-4 py-3 text-sm font-black text-black shadow-[0_18px_55px_rgba(0,0,0,0.35)] transition hover:opacity-95 disabled:opacity-70"
              >
                {mode === "login" ? "Se connecter" : "Créer le compte"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>

              <div className="pt-2 text-center text-[11px] text-white/35">
                EtherCristal • privé • premium
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[11px] text-white/30">
            Connexion → Dashboard. Rien d’autre.
          </div>
        </div>
      </div>
    </div>
  );
}
