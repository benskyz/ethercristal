"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { ensureProfileRecord } from "@/lib/profileCompat";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  User,
} from "lucide-react";

type Mode = "login" | "register";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 2) return "faible";
  if (score <= 4) return "moyen";
  return "fort";
}

export default function EnterClient() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [checkingSession, setCheckingSession] = useState(true);

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [agree18, setAgree18] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const supabase = requireSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user) {
          router.replace("/dashboard");
          return;
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Erreur lors de la vérification de session.");
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin() {
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError("Entre une adresse courriel valide.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      const supabase = requireSupabaseBrowserClient();

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) throw loginError;
      if (!data.user) throw new Error("Connexion impossible.");

      await ensureProfileRecord(data.user);

      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Échec de la connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError("");
    setSuccess("");

    const cleanPseudo = pseudo.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanPseudo.length < 3) {
      setError("Le pseudo doit contenir au moins 3 caractères.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Entre une adresse courriel valide.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!agree18) {
      setError("Tu dois confirmer l’accès réservé aux adultes.");
      return;
    }

    setLoading(true);

    try {
      const supabase = requireSupabaseBrowserClient();

      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            pseudo: cleanPseudo,
            is_18_plus: true,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Inscription impossible.");

      await ensureProfileRecord(data.user, cleanPseudo);

      setSuccess(
        "Compte créé. Vérifie ton courriel si une confirmation est demandée, puis reconnecte-toi."
      );

      setMode("login");
      setPassword("");
    } catch (err: any) {
      setError(err?.message || "Échec de l’inscription.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    if (mode === "login") {
      await handleLogin();
      return;
    }

    await handleRegister();
  }

  if (checkingSession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,20,20,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,0,90,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,120,255,0.08),transparent_24%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-red-500/16 bg-[#0b0b10]/95 p-10 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[24px] border border-red-500/16 bg-gradient-to-br from-red-700/20 via-black/10 to-fuchsia-700/10">
            <RefreshCw className="h-10 w-10 animate-spin text-red-200" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-red-100/45">
            EtherCristal
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,20,20,0.22),transparent_35%),radial-gradient(circle_at_85%_25%,rgba(170,50,170,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.10),transparent_40%)]" />
      <div className="absolute left-[-120px] top-[10%] h-[360px] w-[360px] rounded-full bg-red-700/10 blur-[120px]" />
      <div className="absolute right-[-80px] top-[22%] h-[320px] w-[320px] rounded-full bg-fuchsia-700/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-[34px] border border-red-500/14 bg-[#0d0d12]/90 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.35)] lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/14 bg-red-950/14 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-100/75">
              <Shield className="h-3.5 w-3.5" />
              accès privé 18+
            </div>

            <h1 className="mt-6 max-w-xl text-6xl font-black leading-none tracking-[-0.05em] text-white">
              EtherCristal
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              Entrée propre, sombre et premium. Connexion rapide, inscription claire,
              sécurité simple, et redirection directe vers ton dashboard.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-red-500/14 bg-black/20 p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/36">
                  thème
                </div>
                <div className="mt-3 text-lg font-black text-white">
                  obsidienne / rouge
                </div>
              </div>

              <div className="rounded-[24px] border border-red-500/14 bg-black/20 p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/36">
                  accès
                </div>
                <div className="mt-3 text-lg font-black text-white">
                  compte membre
                </div>
              </div>

              <div className="rounded-[24px] border border-red-500/14 bg-black/20 p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/36">
                  sortie
                </div>
                <div className="mt-3 text-lg font-black text-white">
                  /dashboard
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-red-500/14 bg-[#0d0d12]/95 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="mb-6 flex rounded-[20px] border border-white/8 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className={cx(
                  "flex-1 rounded-[16px] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                  mode === "login"
                    ? "bg-red-500/14 text-white"
                    : "text-white/56 hover:text-white"
                )}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccess("");
                }}
                className={cx(
                  "flex-1 rounded-[16px] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition",
                  mode === "register"
                    ? "bg-red-500/14 text-white"
                    : "text-white/56 hover:text-white"
                )}
              >
                Inscription
              </button>
            </div>

            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
                entrée sécurisée
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-white">
                {mode === "login" ? "Reconnexion" : "Créer un compte"}
              </h2>
              <p className="mt-2 text-sm text-white/56">
                {mode === "login"
                  ? "Entre tes accès pour revenir directement sur ton espace."
                  : "Crée ton compte membre avec un pseudo propre et un mot de passe solide."}
              </p>
            </div>

            {error ? (
              <div className="mb-4 flex items-start gap-3 rounded-[18px] border border-red-400/18 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {success ? (
              <div className="mb-4 flex items-start gap-3 rounded-[18px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" ? (
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.20em] text-white/34">
                    Pseudo
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      placeholder="Ton pseudo"
                      autoComplete="nickname"
                      className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.20em] text-white/34">
                  Courriel
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@courriel.com"
                    autoComplete="email"
                    inputMode="email"
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.20em] text-white/34">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-[18px] border border-red-500/12 bg-black/20 px-12 py-4 pr-14 text-sm text-white outline-none placeholder:text-white/28"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {mode === "register" ? (
                  <div className="mt-2 text-xs text-white/42">
                    Force du mot de passe :{" "}
                    <span className="font-black text-white">{passwordStrength}</span>
                  </div>
                ) : null}
              </div>

              {mode === "register" ? (
                <label className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={agree18}
                    onChange={(e) => setAgree18(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-black/20"
                  />
                  <span>
                    Je confirme être majeur et accepter l’accès réservé aux adultes.
                  </span>
                </label>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/18 bg-red-500/12 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-red-500/18 disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {mode === "login" ? "Entrer dans le dashboard" : "Créer le compte"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
