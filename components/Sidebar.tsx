'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/salons', label: 'Salons', icon: '◉' },
  { href: '/messages', label: 'Messages', icon: '✉' },
  { href: '/boutique', label: 'Boutique', icon: '✦' },
  { href: '/inventaire', label: 'Inventaire', icon: '⬡' },
  { href: '/profile', label: 'Profil', icon: '◎' },
  { href: '/options', label: 'Options', icon: '⚙' },
  { href: '/vip', label: 'VIP', icon: '♦' },
]
export default Sidebar;
export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col items-center border-r border-white/[0.05] bg-[#08080f] py-5 md:w-56 md:items-start md:px-4 sticky top-0">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="mb-8 flex items-center gap-2.5 px-1 md:px-0"
        aria-label="EtherCristal"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-950/50 text-base">
          ⬡
        </div>
        <span
          className="hidden text-base font-black tracking-tight md:block"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, #c4b5fd 70%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EtherCristal
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex w-full flex-col gap-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={[
                'group flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all duration-150 md:px-3',
                active
                  ? 'border border-violet-500/25 bg-violet-600/20 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'border border-transparent text-white/30 hover:bg-white/[0.04] hover:text-white/70',
              ].join(' ')}
            >
              <span className={`shrink-0 text-base transition-all ${active ? 'text-violet-300' : 'text-white/25 group-hover:text-white/50'}`}>
                {icon}
              </span>
              <span className="hidden md:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: logout */}
      <div className="mt-auto w-full">
        <button
          className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 text-sm font-semibold text-white/20 transition-all duration-150 hover:bg-white/[0.04] hover:text-white/50 md:px-3"
          onClick={async () => {
            const { requireSupabaseBrowserClient } = await import('@/lib/supabase')
            const supabase = requireSupabaseBrowserClient()
            await supabase.auth.signOut()
            window.location.href = '/enter'
          }}
          title="Déconnexion"
        >
          <span className="shrink-0 text-base">⏻</span>
          <span className="hidden md:block">Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
