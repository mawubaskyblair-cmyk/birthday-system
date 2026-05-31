import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env — restart npm run dev after adding them.'
  )
}

const GLOBAL_CLIENT_KEY = '__birthday_system_supabase__'

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: 'birthday-system-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// One client per tab — survives Vite HMR (prevents duplicate GoTrueClient warnings)
export const supabase =
  globalThis[GLOBAL_CLIENT_KEY] ?? (globalThis[GLOBAL_CLIENT_KEY] = createSupabaseClient())

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    // Keep the same client instance when this module hot-reloads
    globalThis[GLOBAL_CLIENT_KEY] = supabase
  })
}
