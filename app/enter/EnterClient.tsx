'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireSupabaseBrowserClient } from '@/lib/supabase'

type Mode = 'login' | 'register'

interface LoginFields {
  email: string
  password: string
}

interface RegisterFields {
  pseudo: string
  email: string
  password: string
  confirm: string
  ageConfirmed: boolean
}

function CrystalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    type P = {
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
      'rgba(216,180,254,',
      'rgba(6,182,212,',
    ]

    const pts: P[] = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2,
      dx: (Math.random() - 0.5) * 0.2,
      dy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.45 + 0.05,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    let raf = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of pts) {
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
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-[#06060f]/90 backdrop-blur-sm">
      <div className="relative mb-5 h-10 w-10">
        <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-violet-400" />
        <span className="absolute inset-[5px] animate-spin rounded-full border border-transparent border-t-cyan-400 [animation-duration:1.4s]" />
        <span className="absolute inset-[10px] rounded-full bg-violet-500/20 blur-sm" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{label}</p>
    </div>
  )
}

function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-widest text-white/35"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={[
          'w-full rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3',
          'text-sm text-white placeholder:text-white/20',
          'outline-none transition-all duration-200',
          'focus:border-violet-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]',
        ].join(' ')}
      />
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
      {msg}
    </p>
  )
}

function SuccessMsg({ msg }: { msg: string }) {
  return (
    <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
      {msg}
    </p>
  )
}

export default function EnterPage() {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [login, setLogin] = useState<LoginFields>({
    email: '',
    password: '',
  })

  const [reg, setReg] = useState<RegisterFields>({
    pseudo: '',
    email: '',
    password: '',
    confirm: '',
    ageConfirmed: false,
  })

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    clearMessages()
  }

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const supabase = requireSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (cancelled) return

        if (session) {
          router.replace('/dashboard')
          return
        }
      } catch {
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogin = async () => {
    clearMessages()

    if (!login.email.trim() || !login.password) {
      setError('Remplis tous les champs.')
      return
    }

    setLoading(true)

    try {
      const supabase = requireSupabaseBrowserClient()

      const { error: err } = await supabase.auth.signInWithPassword({
        email: login.email.trim().toLowerCase(),
        password: login.password,
      })

      if (err) {
        setError(
          err.message.includes('Invalid login credentials')
            ? 'Email ou mot de passe incorrect.'
            : err.message
        )
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Une erreur inattendue s’est produite.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    clearMessages()

    const { pseudo, email, password, confirm, ageConfirmed } = reg

    if (!pseudo.trim() || !email.trim() || !password || !confirm) {
      setError('Tous les champs sont requis.')
      return
    }

    if (pseudo.trim().length < 3) {
      setError('Ton pseudo doit faire au moins 3 caractères.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse email invalide.')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (!ageConfirmed) {
      setError('Tu dois confirmer avoir 18 ans ou plus pour accéder à EtherCristal.')
      return
    }

    setLoading(true)

    try {
      const supabase = requireSupabaseBrowserClient()

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            pseudo: pseudo.trim(),
            is_18_plus: true,
          },
        },
      })

      if (signUpErr) {
        setError(
          signUpErr.message.includes('already registered')
            ? 'Cet email est déjà utilisé.'
            : signUpErr.message
        )
        return
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          pseudo: pseudo.trim(),
        })
      }

      setSuccess(
        data.session
          ? 'Compte créé. Bienvenue dans EtherCristal.'
          : 'Compte créé. Vérifie ta boîte mail pour confirmer ton accès.'
      )

      if (data.session) {
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    } catch {
      setError('Une erreur inattendue s’est produite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#06060f]">
      <CrystalCanvas />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 65% 50% at 50% -5%, rgba(109,40,217,0.2) 0%, transparent 60%)',
            'radial-gradient(ellipse 35% 25% at 15% 85%, rgba(6,182,212,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 30% 20% at 85% 80%, rgba(139,92,246,0.06) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-950/40 backdrop-blur-sm">
            <span className="text-xl">⬡</span>
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

          <p className="text-[11px] uppercase tracking-[0.22em] text-white/25">
            Espace privé — Accès réservé
          </p>
        </div>

        <div className="relative w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0b18]/90 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div
              aria-hidden
              className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
            />

            {(loading || checkingSession) && (
              <LoadingOverlay
                label={
                  checkingSession
                    ? 'Vérification de la session…'
                    : mode === 'login'
                    ? 'Connexion en cours…'
                    : 'Création du compte…'
                }
              />
            )}

            <div className="px-7 pb-8 pt-7">
              <div className="mb-7 flex rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
                {(['login', 'register'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={[
                      'flex-1 rounded-lg py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200',
                      mode === m
                        ? 'border border-violet-500/30 bg-violet-600/30 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                        : 'text-white/30 hover:text-white/55',
                    ].join(' ')}
                  >
                    {m === 'login' ? 'Connexion' : 'Inscription'}
                  </button>
                ))}
              </div>

              {mode === 'login' && (
                <div className="flex flex-col gap-4">
                  <Field
                    label="Email"
                    id="login-email"
                    type="email"
                    value={login.email}
                    onChange={(v) => setLogin((p) => ({ ...p, email: v }))}
                    placeholder="ton@email.com"
                    autoComplete="email"
                  />

                  <Field
                    label="Mot de passe"
                    id="login-password"
                    type="password"
                    value={login.password}
                    onChange={(v) => setLogin((p) => ({ ...p, password: v }))}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                  />

                  {error && <ErrorMsg msg={error} />}
                  {success && <SuccessMsg msg={success} />}

                  <button
                    onClick={handleLogin}
                    disabled={loading || checkingSession}
                    className={[
                      'mt-1 w-full rounded-xl border py-3.5 text-sm font-bold uppercase tracking-widest transition-all duration-200',
                      'border-violet-500/40 bg-violet-600/20 text-violet-200',
                      'hover:border-violet-500/60 hover:bg-violet-600/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]',
                      'disabled:pointer-events-none disabled:opacity-40',
                    ].join(' ')}
                  >
                    Entrer
                  </button>

                  <p className="pt-1 text-center text-[11px] text-white/20">
                    Pas encore de compte ?{' '}
                    <button
                      onClick={() => switchMode('register')}
                      className="text-violet-400/70 underline-offset-2 hover:text-violet-300 hover:underline"
                    >
                      Rejoindre EtherCristal
                    </button>
                  </p>
                </div>
              )}

              {mode === 'register' && (
                <div className="flex flex-col gap-4">
                  <Field
                    label="Pseudo"
                    id="reg-pseudo"
                    value={reg.pseudo}
                    onChange={(v) => setReg((p) => ({ ...p, pseudo: v }))}
                    placeholder="TonNomCristal"
                    autoComplete="username"
                  />

                  <Field
                    label="Email"
                    id="reg-email"
                    type="email"
                    value={reg.email}
                    onChange={(v) => setReg((p) => ({ ...p, email: v }))}
                    placeholder="ton@email.com"
                    autoComplete="email"
                  />

                  <Field
                    label="Mot de passe"
                    id="reg-password"
                    type="password"
                    value={reg.password}
                    onChange={(v) => setReg((p) => ({ ...p, password: v }))}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                  />

                  <Field
                    label="Confirmer le mot de passe"
                    id="reg-confirm"
                    type="password"
                    value={reg.confirm}
                    onChange={(v) => setReg((p) => ({ ...p, confirm: v }))}
                    placeholder="••••••••••"
                    autoComplete="new-password"
                  />

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition-colors hover:border-violet-500/20">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={reg.ageConfirmed}
                        onChange={(e) =>
                          setReg((p) => ({ ...p, ageConfirmed: e.target.checked }))
                        }
                        className="peer sr-only"
                      />
                      <div
                        className={[
                          'flex h-4.5 w-4.5 items-center justify-center rounded border transition-all duration-200',
                          reg.ageConfirmed
                            ? 'border-violet-500/60 bg-violet-500/30'
                            : 'border-white/15 bg-white/[0.04]',
                        ].join(' ')}
                      >
                        {reg.ageConfirmed && (
                          <svg
                            className="h-2.5 w-2.5 text-violet-300"
                            fill="none"
                            viewBox="0 0 12 12"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] leading-relaxed text-white/35">
                      Je confirme avoir{' '}
                      <span className="font-bold text-white/55">18 ans ou plus</span> et accepter
                      l&apos;accès à un espace adulte réservé.
                    </span>
                  </label>

                  {error && <ErrorMsg msg={error} />}
                  {success && <SuccessMsg msg={success} />}

                  <button
                    onClick={handleRegister}
                    disabled={loading || checkingSession}
                    className={[
                      'mt-1 w-full rounded-xl border py-3.5 text-sm font-bold uppercase tracking-widest transition-all duration-200',
                      'border-violet-500/40 bg-violet-600/20 text-violet-200',
                      'hover:border-violet-500/60 hover:bg-violet-600/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]',
                      'disabled:pointer-events-none disabled:opacity-40',
                    ].join(' ')}
                  >
                    Rejoindre
                  </button>

                  <p className="pt-1 text-center text-[11px] text-white/20">
                    Déjà membre ?{' '}
                    <button
                      onClick={() => switchMode('login')}
                      className="text-violet-400/70 underline-offset-2 hover:text-violet-300 hover:underline"
                    >
                      Se connecter
                    </button>
                  </p>
                </div>
              )}
            </div>

            <div
              aria-hidden
              className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
            />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'rgba(109,40,217,0.12)' }}
          />
        </div>

        <p className="relative z-10 mt-10 text-center text-[10px] uppercase tracking-[0.18em] text-white/15">
          EtherCristal — espace privé adulte 18+
        </p>
      </div>
    </div>
  )
}
