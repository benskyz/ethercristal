"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/lib/push";
import { requireSupabaseBrowserClient } from "@/lib/supabase";

export default function PushSettings() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
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
          setResult("Session active. Tu peux activer les notifications push.");
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
      setResult("Activation des notifications push...");

      const subscription = await savePushSubscription();

      setResult(
        `Notifications activées ✅\n\n${JSON.stringify(subscription, null, 2)}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setResult(`Erreur ❌\n\n${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    try {
      setLoading(true);
      setResult("Désactivation des notifications push...");

      await removePushSubscription();

      setResult("Notifications désactivées ✅");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setResult(`Erreur ❌\n\n${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Notifications push</h2>
        <p className="mt-2 text-sm text-white/70">
          Active ou désactive les notifications pour les messages et alertes du site.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleEnable}
          disabled={loading || checking || !ready}
          className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Chargement..." : "Activer"}
        </button>

        <button
          onClick={handleDisable}
          disabled={loading || checking || !ready}
          className="rounded-2xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Désactiver
        </button>
      </div>

      <pre className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-green-300">
        {checking ? "Vérification de la session..." : result}
      </pre>
    </section>
  );
}
