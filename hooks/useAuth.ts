"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type AuthUser = {
  id: string
  email?: string | null
} | null

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser()

      if (!mounted) return

      if (error || !data.user) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
      })
      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email,
      })
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}
