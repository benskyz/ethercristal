'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AgePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = () => {
    try {
      setLoading(true);
      localStorage.setItem('ageGateAccepted', 'true');
      router.replace('/login');
    } catch {
      setError("Impossible d'enregistrer la validation d'âge.");
      setLoading(false);
    }
  };

  const handleDecline = () => {
    setError('Accès réservé aux adultes de 18 ans et plus.');
    setTimeout(() => {
      window.location.href = 'https://google.com';
    }, 2000);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,0,85,0.22),transparent_24%),radial-gradient(circle_at_15%_80%,rgba(220,38,38,0.14),transparent_22%),linear-gradient(180deg,#040405_0%,#120008_55%,#040405_100%)]" />
      <div className="absolute top-10 left-[10%] h-64 w-64 rounded-full bg-red-600/20 blur-[100px]" />
      <div className="absolute bottom-10 right-[12%] h-72 w-72 rounded-full bg-pink-600/20 blur-[110px]" />

      <section className="relative z-10 w-full max-w-lg">
        <div className="rounded-[30px] border border-red-500/20 bg-zinc-950/85 p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/25 bg-gradient-to-br from-red-700 to-pink-600 shadow-[0_0_40px_rgba(255,0,72,0.28)]">
            <span className="text-4xl">🔞</span>
          </div>

          <div
            className="text-5xl font-black text-red-500"
            style={{
              textShadow:
                '0 0 8px rgba(255,0,0,0.85), 0 0 20px rgba(255,0,72,0.72), 0 0 40px rgba(255,0,98,0.45)',
            }}
          >
            18+
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-500 to-fuchsia-500">
            EtherCristal
          </h1>

          <p className="mt-6 text-zinc-300 leading-7">
            Cette plateforme est réservée aux{' '}
            <span className="font-bold text-white">adultes de 18 ans et plus</span>.
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-pink-600 px-6 py-4 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-70"
            >
              {loading ? 'Entrée...' : "J'ai 18 ans ou plus"}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/90 px-6 py-4 text-base font-semibold text-white transition hover:bg-zinc-800"
            >
              Je refuse
            </button>
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Québec • 18+ • Privé
          </p>
        </div>
      </section>
    </main>
  );
}
