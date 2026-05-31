const LOGIN_SECURITY_KEY = 'birthday_login_security'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

function readLoginSecurity() {
  try {
    const raw = sessionStorage.getItem(LOGIN_SECURITY_KEY)
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 }
  } catch {
    return { attempts: 0, lockedUntil: 0 }
  }
}

function writeLoginSecurity(data) {
  sessionStorage.setItem(LOGIN_SECURITY_KEY, JSON.stringify(data))
}

export function getLoginLockStatus() {
  const data = readLoginSecurity()
  const now = Date.now()

  if (data.lockedUntil > now) {
    const minutesLeft = Math.ceil((data.lockedUntil - now) / 60000)
    return {
      locked: true,
      message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`,
    }
  }

  if (data.lockedUntil && data.lockedUntil <= now) {
    writeLoginSecurity({ attempts: 0, lockedUntil: 0 })
  }

  return { locked: false, message: '' }
}

export function recordFailedLogin() {
  const data = readLoginSecurity()
  const attempts = data.attempts + 1

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    writeLoginSecurity({
      attempts,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    })
    return
  }

  writeLoginSecurity({ attempts, lockedUntil: 0 })
}

export function clearLoginAttempts() {
  sessionStorage.removeItem(LOGIN_SECURITY_KEY)
}

export function sanitizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Avoid leaking whether email exists — use one message for auth failures. */
export function getSafeAuthErrorMessage(err) {
  const msg = err?.message ?? ''

  if (msg === 'Failed to fetch' || err?.name === 'AuthRetryableFetchError') {
    return 'Cannot reach the server. Check your connection and try again.'
  }

  return 'Invalid email or password. Please try again.'
}

export function assertSecureSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (import.meta.env.DEV) return

  if (!url?.startsWith('https://') || !key || key.includes('service_role')) {
    console.error('Insecure Supabase configuration detected.')
  }
}
