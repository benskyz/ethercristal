"use client";

import { useEffect, useState } from "react";
import { requireSupabaseBrowserClient } from "@/lib/supabase";
import { savePushSubscription, removePushSubscription } from "@/lib/push";

export default function PushTestPage() {
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("Vérification de la session...");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const supabase = requireSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.access_token) {
          setReady(true);
          setResult(
            `Session active ✅

user_id: ${session.user.id}
email: ${session.user.email ?? "inconnu"}

Tu peux maintenant enregistrer ou supprimer la subscription push.`
          );
        } else {
          setReady(false);
          setResult("Session absente. Reconnecte-toi sur ce même domaine.");
        }
      } catch {
        if (!cancelled) {
          setReady(false);
          setResult("Impossible de vérifier la session Supabase.");
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    try {
      setLoading(true);
      setResult("Enregistrement de la subscription push...");

      const subscription = await savePushSubscription();

      setResult(
        `Subscription enregistrée ✅

${JSON.stringify(subscription, null, 2)}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setResult(`Erreur ❌

${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    try {
      setLoading(true);
      setResult("Suppression de la subscription push...");

      await removePushSubscription();

      setResult("Subscription supprimée ✅");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setResult(`Erreur ❌

${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-bold text-white">Gestion Push</h1>
        <p className="mt-2 text-sm text-white/70">
          Cette page sert à enregistrer ou supprimer la subscription push du navigateur.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleEnable}
            disabled={loading || checking || !ready}
            className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Chargement..." : "Enregistrer ma subscription"}
          </button>

          <button
            onClick={handleDisable}
            disabled={loading || checking || !ready}
            className="rounded-2xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Supprimer ma subscription
          </button>
        </div>

        <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-green-300">
          {checking ? "Vérification de la session..." : result}
        </pre>
      </div>
    </main>
  );
}
