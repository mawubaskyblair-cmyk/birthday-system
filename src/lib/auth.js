import { supabase } from './supabase'

export function isNetworkAuthError(err) {
  const msg = err?.message ?? String(err ?? '')
  return (
    msg === 'Failed to fetch' ||
    err?.name === 'AuthRetryableFetchError' ||
    err?.name === 'TypeError'
  )
}

export async function clearLocalAuth() {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // ignore — local clear only
  }
}

/** Reads session from storage; does not call getUser() (no extra server round-trip). */
export async function safeGetSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  } catch (err) {
    if (isNetworkAuthError(err)) {
      await clearLocalAuth()
    }
    return null
  }
}

export async function getSessionUser() {
  const session = await safeGetSession()
  return session?.user ?? null
}
