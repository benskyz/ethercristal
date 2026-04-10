"use client";

import { useState } from "react";
import { registerPush, sendPush } from "@/lib/push";

const VAPID_PUBLIC_KEY =
  "BBVgfYkDoBBWrhRwz34WFKtITr7Fxl93zhcO5UOvZjwIiLcYY1SGiMr40or6o_0ceofyggw6alzLOuRVuV4ZZTQ";

export default function PushTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>(
    "Aucun résultat pour le moment."
  );

  async function handlePushTest() {
    try {
      setLoading(true);
      setResult("Préparation du test push...");

      const subscription = await registerPush(VAPID_PUBLIC_KEY);

      setResult("Subscription créée. Envoi de la notification...");

      const response = await sendPush(subscription, {
        title: "Test EtherCristal",
        body: "Le système de notifications push fonctionne.",
        url: "/dashboard",
        tag: "ethercristal-test",
      });

      setResult(`Succès ✅\n\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";

      setResult(`Erreur ❌\n\n${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Test Push</h1>
          <p className="mt-2 text-sm text-white/70">
            Cette page supprime les anciens service workers, enregistre le
            nouveau, crée une subscription push et appelle la fonction
            <span className="mx-1 font-semibold text-white">send-push</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePushTest}
            disabled={loading}
            className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Tester les notifications push"}
          </button>
        </div>

        <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-green-300">
          {result}
        </pre>
      </div>
    </main>
  );
}
