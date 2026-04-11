import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — EtherCristal',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white px-6 py-10 md:px-10 md:py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-950/30 px-3 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Tableau de bord
          </span>
        </div>
        <h1
          className="text-3xl font-black tracking-tight md:text-4xl"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, #c4b5fd 60%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EtherCristal
        </h1>
        <p className="mt-1 text-sm text-white/30">Bienvenue dans ton espace privé.</p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Éclats', value: '4 200', color: 'text-violet-300', border: 'border-violet-500/20', glow: 'rgba(139,92,246,0.08)' },
          { label: 'Articles possédés', value: '3', color: 'text-cyan-300', border: 'border-cyan-500/20', glow: 'rgba(6,182,212,0.08)' },
          { label: 'Effet actif', value: 'Flamme', color: 'text-amber-300', border: 'border-amber-500/20', glow: 'rgba(245,158,11,0.08)' },
          { label: 'Rang', value: 'Éther', color: 'text-rose-300', border: 'border-rose-500/20', glow: 'rgba(244,63,94,0.08)' },
        ].map(({ label, value, color, border, glow }) => (
          <div
            key={label}
            className={`rounded-2xl border ${border} bg-[#0b0b18] px-5 py-5`}
            style={{ boxShadow: `0 0 24px ${glow}` }}
          >
            <p className="mb-1 text-[10px] uppercase tracking-widest text-white/25">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#0b0b18] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
              Activité récente
            </h2>
            <span className="h-px flex-1 mx-4 bg-white/[0.05]" />
          </div>
          <div className="flex flex-col gap-3">
            {[
              { action: 'Effet équipé', detail: 'Flamme Éternelle', time: 'Il y a 2h', dot: 'bg-amber-400' },
              { action: 'Article acheté', detail: 'Nova Starburst', time: 'Il y a 1j', dot: 'bg-violet-400' },
              { action: 'Compte créé', detail: 'Bienvenue dans EtherCristal', time: 'Il y a 3j', dot: 'bg-emerald-400' },
            ].map(({ action, detail, time, dot }) => (
              <div
                key={action + time}
                className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/70 truncate">{action}</p>
                  <p className="text-[11px] text-white/30 truncate">{detail}</p>
                </div>
                <span className="shrink-0 text-[10px] text-white/20">{time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0b0b18] p-6">
          <div className="mb-5 flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
              Accès rapide
            </h2>
            <span className="h-px flex-1 bg-white/[0.05]" />
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Boutique', href: '/boutique', icon: '✦', color: 'text-violet-300', border: 'border-violet-500/20', bg: 'bg-violet-500/8' },
              { label: 'Inventaire', href: '/inventaire', icon: '⬡', color: 'text-cyan-300', border: 'border-cyan-500/20', bg: 'bg-cyan-500/8' },
              { label: 'Salons', href: '/salons', icon: '◈', color: 'text-amber-300', border: 'border-amber-500/20', bg: 'bg-amber-500/8' },
              { label: 'Profil', href: '/profile', icon: '◉', color: 'text-rose-300', border: 'border-rose-500/20', bg: 'bg-rose-500/8' },
            ].map(({ label, href, icon, color, border, bg }) => (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl border ${border} ${bg} px-4 py-3 transition-all duration-150 hover:brightness-125`}
              >
                <span className={`text-base ${color}`}>{icon}</span>
                <span className="text-sm font-semibold text-white/70">{label}</span>
                <span className="ml-auto text-white/20">›</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Ambient bottom glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 h-32 w-1/2 blur-3xl opacity-30"
        style={{ background: 'radial-gradient(ellipse, rgba(109,40,217,0.3) 0%, transparent 70%)' }}
      />
    </div>
  )
}
