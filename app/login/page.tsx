// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = requireSupabaseBrowserClient();
      const resp = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (resp.error) {
        setError(resp.error.message);
        setLoading(false);
        return;
      }

      // Optionnel : ensure profile exists (upsert) — simple call
      try {
        await supabase.from("profiles").upsert(
          {
            id: resp.data.user?.id,
            username: resp.data.user?.user_metadata?.username || email.split("@")[0],
          },
          { onConflict: "id" }
        );
      } catch (e) {
        // ne bloque pas la connexion si l'upsert échoue — log
        // console.warn("profile upsert error", e);
      }

      // redirection vers dashboard
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <form onSubmit={handleSignIn} className="w-full max-w-md bg-zinc-900/80 border border-zinc-700 rounded-2xl p-8 backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="text-4xl">💎</div>
          <h1 className="text-3xl font-bold mt-2">EtherCristal</h1>
          <p className="text-sm text-zinc-400 mt-1">Accès privé — 18+</p>
        </div>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        <label className="block mb-3">
          <span className="text-zinc-300">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-md bg-black/30 border border-zinc-700 px-3 py-2"
            placeholder="you@example.com"
          />
        </label>

        <label className="block mb-4">
          <span className="text-zinc-300">Mot de passe</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="mt-1 w-full rounded-md bg-black/30 border border-zinc-700 px-3 py-2"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:brightness-110"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>

        <div className="mt-4 text-center text-sm text-zinc-500">
          Pas encore membre ?{" "}
          <a href="/register" className="text-red-400 underline">
            Inscription
          </a>
        </div>
      </form>
    </div>
  );
}
