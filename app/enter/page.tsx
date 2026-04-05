"use client";

import { useMemo, useState } from "react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

const supabase = requireSupabaseBrowserClient();

type Mode = "login" | "register";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function EnterPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pseudo, setPseudo] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cleanEmail = email.trim().toLowerCase();
  const cleanPseudo = pseudo.trim();

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return "faible";
    if (score <= 3) return "moyen";
    return "fort";
  }, [password]);

  function switchMode(next: Mode) {
    if (loading) return;
    setMode(next);
    setError("");
    setMessage("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!cleanEmail) {
        throw new Error("L’email est requis.");
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error("Entre une adresse email valide.");
      }

      if (!password) {
        throw new Error("Le mot de passe est requis.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      window.location.href = "/dashboard";
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!ageConfirmed) {
        throw new Error("Tu dois confirmer que tu as 18 ans ou plus.");
      }

      if (!cleanPseudo) {
        throw new Error("Le pseudo est requis.");
      }

      if (cleanPseudo.length < 3) {
        throw new Error("Le pseudo doit contenir au moins 3 caractères.");
      }

      if (cleanPseudo.length > 24) {
        throw new Error("Le pseudo est trop long.");
      }

      if (!cleanEmail) {
        throw new Error("L’email est requis.");
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error("Entre une adresse email valide.");
      }

      if (password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
      }

      if (password !== confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined,
          data: {
            pseudo: cleanPseudo,
            is_18_plus: true,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          pseudo: cleanPseudo,
          email: cleanEmail,
          credits: 0,
          is_vip: false,
          is_admin: false,
          role: "member",
        });

        if (profileError) {
          throw new Error(profileError.message);
        }
      }

      setMessage(
        "Compte créé. Vérifie ton email si la confirmation est activée, puis connecte-toi."
      );

      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setAgeConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,0,30,0.35),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(255,180,70,0.15),transparent_24%),linear-gradient(to_bottom,#040404,#07070b_40%,#020202)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.22)_55%,rgba(0,0,0,.72)_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-amber-300/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/80 backdrop-blur">
              Accès privé réservé aux adultes
            </div>

            <div className="mt-8">
              <div className="mb-4 text-6xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-rose-500 via-amber-300 to-white bg-clip-text text-transparent">
                  EtherCristal
                </span>
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[1.02] text-white">
                Une entrée plus élégante. Plus mature. Plus nette.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/68">
                Un seul portail, une seule identité visuelle, et un accès direct à ton univers
                privé après authentification.
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Accès</p>
                <p className="mt-3 text-base font-bold text-white/92">Connexion requise</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Cadre</p>
                <p className="mt-3 text-base font-bold text-white/92">Privé • 18+ • Premium</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Après</p>
                <p className="mt-3 text-base font-bold text-white/92">Dashboard</p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="mx-auto w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,20,.94),rgba(8,8,12,.98))] p-5 shadow-[0_25px_80px_rgba(0,0,0,.65)] backdrop-blur-2xl sm:p-7">
            <div className="mb-6 lg:hidden">
              <div className="text-center">
                <div className="text-4xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-rose-500 via-amber-300 to-white bg-clip-text text-transparent">
                    EtherCristal
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  Accès privé • 18+ • réservé aux membres
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                disabled={loading}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  mode === "login"
                    ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                    : "text-white/70 hover:bg-white/5"
                } ${loading ? "opacity-70" : ""}`}
              >
                Connexion
              </button>

              <button
                type="button"
                onClick={() => switchMode("register")}
                disabled={loading}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  mode === "register"
                    ? "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 text-black"
                    : "text-white/70 hover:bg-white/5"
                } ${loading ? "opacity-70" : ""}`}
              >
                Inscription
              </button>
            </div>

            <div className="mt-6">
              <h2 className="text-3xl font-black">
                {mode === "login" ? "Entrer dans l’espace privé" : "Créer un accès membre"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/58">
                {mode === "login"
                  ? "Connecte-toi pour accéder directement au dashboard."
                  : "Crée ton accès en quelques secondes puis entre dans l’univers EtherCristal."}
              </p>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <form
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="mt-6 space-y-4"
            >
              {mode === "register" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/75">Pseudo</label>
                  <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => {
                      setPseudo(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Ton nom privé"
                    required={mode === "register"}
                    minLength={3}
                    maxLength={24}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-amber-300/35 focus:bg-black/55"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-white/75">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="toi@exemple.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-amber-300/35 focus:bg-black/55"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/75">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-amber-300/35 focus:bg-black/55"
                />
                {mode === "register" ? (
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      passwordStrength === "fort"
                        ? "text-emerald-300"
                        : passwordStrength === "moyen"
                        ? "text-amber-300"
                        : "text-red-300"
                    }`}
                  >
                    Force du mot de passe : {passwordStrength}
                  </p>
                ) : null}
              </div>

              {mode === "register" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/75">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required={mode === "register"}
                      minLength={8}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-amber-300/35 focus:bg-black/55"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => {
                        setAgeConfirmed(e.target.checked);
                        if (error) setError("");
                      }}
                      className="mt-1"
                      required={mode === "register"}
                    />
                    <span>
                      Je confirme avoir 18 ans ou plus et accéder à un espace privé réservé aux
                      adultes.
                    </span>
                  </label>
                </>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 px-5 py-3.5 text-sm font-black text-black shadow-[0_10px_35px_rgba(255,0,90,.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? "Traitement..."
                  : mode === "login"
                  ? "Se connecter"
                  : "Créer mon compte"}
              </button>
            </form>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/38">Accès</p>
                <p className="mt-2 text-xs font-bold text-white/88">Privé</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/38">Style</p>
                <p className="mt-2 text-xs font-bold text-white/88">Nocturne</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/38">Sortie</p>
                <p className="mt-2 text-xs font-bold text-white/88">Dashboard</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
