'use client'

import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  r: number
  dx: number
  dy: number
  alpha: number
  color: string
}

const COLORS = [
  'rgba(167,139,250,',
  'rgba(99,179,237,',
  'rgba(255,255,255,',
  'rgba(196,181,253,',
]

export function BoutiqueHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.08,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha})`
        ctx.fill()

        p.x += p.dx
        p.y += p.dy

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section className="relative overflow-hidden border-b border-white/[0.04]">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full pointer-events-none"
      />

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(109,40,217,0.22) 0%, transparent 65%)',
            'radial-gradient(ellipse 40% 30% at 20% 80%, rgba(6,182,212,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 30% 25% at 80% 90%, rgba(139,92,246,0.06) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center md:py-40">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-950/30 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Boutique Éther
          </span>
        </div>

        <h1 className="mb-4 font-black leading-[1.05] tracking-tight">
          <span
            className="block text-4xl md:text-6xl lg:text-7xl"
            style={{
              background: 'linear-gradient(135deg, #fff 30%, #c4b5fd 60%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Forge ton
          </span>
          <span
            className="block text-4xl md:text-6xl lg:text-7xl"
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #67e8f9 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Identité Cristal
          </span>
        </h1>

        <p className="mb-12 max-w-lg text-sm leading-relaxed text-white/35 md:text-base">
          Effets de pseudo vivants, badges de prestige, titres de rang — chaque
          acquisition sculpte ton aura dans l&apos;univers EtherCristal.
        </p>

        <dl className="flex flex-wrap justify-center gap-x-10 gap-y-3">
          {[
            { value: '10+', label: 'Effets visuels' },
            { value: '5', label: 'Niveaux de rareté' },
            { value: '∞', label: 'Identités possibles' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-2xl font-black text-white/90">{value}</span>
              <span className="text-[11px] uppercase tracking-widest text-white/25">
                {label}
              </span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
