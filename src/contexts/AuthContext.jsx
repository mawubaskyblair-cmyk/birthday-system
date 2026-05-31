import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearLocalAuth, isNetworkAuthError } from '../lib/auth'
import { clearLoginAttempts } from '../lib/security'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return undefined

    let idleTimer

    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(async () => {
        clearLoginAttempts()
        await clearLocalAuth()
        setSession(null)
      }, IDLE_TIMEOUT_MS)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetIdleTimer, { passive: true }))
    resetIdleTimer()

    return () => {
      clearTimeout(idleTimer)
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer))
    }
  }, [session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signOut() {
        clearLoginAttempts()
        try {
          await supabase.auth.signOut()
        } catch (err) {
          if (isNetworkAuthError(err)) {
            await clearLocalAuth()
          } else {
            throw err
          }
        }
      },
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
