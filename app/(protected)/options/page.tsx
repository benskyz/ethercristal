import PushSettings from "./push-settings";

export default function OptionsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                EtherCristal
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">
                Options du compte
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70">
                Gère les préférences essentielles de ton expérience membre, dont
                les notifications push pour les messages et alertes importantes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
              Configuration privée du compte
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-6">
            <PushSettings />

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <h2 className="text-xl font-bold text-white">Préférences générales</h2>
              <p className="mt-2 text-sm text-white/70">
                Garde cette section pour tes futurs réglages : thème, audio,
                confidentialité, affichage, etc.
              </p>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <h2 className="text-lg font-bold text-white">État du système push</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  Service worker branché sur <span className="font-semibold text-white">/sw.js</span>
                </li>
                <li className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  Fonction serveur : <span className="font-semibold text-white">send-push</span>
                </li>
                <li className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  VAPID configuré côté Supabase
                </li>
                <li className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  JWT activé pour la version prod
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
