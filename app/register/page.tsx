// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPwd) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const supabase = requireSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // upsert profile
      try {
        const userId = data.user?.id;
        if (userId) {
          await supabase.from("profiles").upsert(
            {
              id: userId,
              username: email.split("@")[0],
              ether_balance: 100,
              vip_level: "Standard",
            },
            { onConflict: "id" }
          );
        }
      } catch (e) {
        // ne bloque pas l'inscription
      }

      // connect immediately (signInWithPassword) OR rely on magic link flow depending on your Supabase settings
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        // si pas possible, on redirige vers login avec message
        setError(signInErr.message || null);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-zinc-900/80 border border-zinc-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">Créer un compte</h2>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        <label className="block mb-3">
          <span className="text-zinc-300">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-md bg-black/30 border border-zinc-700 px-3 py-2" />
        </label>

        <label className="block mb-3">
          <span className="text-zinc-300">Mot de passe</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-md bg-black/30 border border-zinc-700 px-3 py-2" />
        </label>

        <label className="block mb-4">
          <span className="text-zinc-300">Confirmer mot de passe</span>
          <input value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} type="password" required className="mt-1 w-full rounded-md bg-black/30 border border-zinc-700 px-3 py-2" />
        </label>

        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600">
          {loading ? "Inscription…" : "S'inscrire"}
        </button>

        <div className="mt-4 text-center text-sm text-zinc-500">
          Déjà membre ? <a href="/login" className="text-red-400 underline">Connexion</a>
        </div>
      </form>
    </div>
  );
}
