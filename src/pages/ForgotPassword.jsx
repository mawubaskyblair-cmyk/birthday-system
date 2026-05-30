import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/check-email'
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-stone-900 via-zinc-800 to-stone-700 flex items-center justify-center p-4">
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_rgba(251,191,36,0.12)_0%,_rgba(0,0,0,0)_70%)]"></div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-white/20">
          
          <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>

          <div className="pt-6 pb-3 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Reset Password
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={handleReset} className="px-6 pb-6">

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">EMAIL ADDRESS</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-2 text-center text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            {/* ONLY THIS BUTTON CHANGED TO GREEN */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'SEND RESET LINK'}
            </button>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition">
                ← Back to Login
              </Link>
            </div>
          </form>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-2.5 text-center">
            <p className="text-[11px] font-medium text-slate-400">🔒 A Secure platform </p>
          </div>
        </div>
      </div>
    </div>
  )
}