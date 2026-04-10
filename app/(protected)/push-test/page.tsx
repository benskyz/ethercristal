"use client";

import { useState } from "react";
import { registerPush, sendPush } from "@/lib/push";

const VAPID_PUBLIC_KEY =
  "BMR5tUZr4xwpYAc0PdusjEGWpUlW2QbM_kSRoIs2Ven4HDCa0jx_y5ZgowpHugQ-gopk0sJXovVKhPujeiylYuY";

export default function PushTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handlePushTest() {
    try {
      setLoading(true);
      setResult("Préparation...");

      const subscription = await registerPush(VAPID_PUBLIC_KEY);

      const data = await sendPush(subscription, {
        title: "Test EtherCristal",
        body: "Le système de notifications push fonctionne.",
        url: "/dashboard",
        tag: "ethercristal-test",
      });

      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setResult(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <h1 className="mb-3 text-2xl font-bold">Test Push</h1>

        <p className="mb-6 text-sm text-white/70">
          Cette page supprime les anciens service workers, enregistre le nouveau,
          crée une subscription push et appelle la fonction send-push.
        </p>

        <button
          onClick={handlePushTest}
          disabled={loading}
          className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Tester les notifications push"}
        </button>

        <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-green-300 whitespace-pre-wrap">
          {result || "Aucun résultat pour le moment."}
        </pre>
      </div>
    </main>
  );
}
