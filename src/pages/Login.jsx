import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  
  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(0)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState('')
  const [captchaVerified, setCaptchaVerified] = useState(false)

  // Write to audit log - NO manual created_at (let database handle it)
  async function writeToAuditLog(userId, userEmail, action, description) {
    try {
      const { error } = await supabase.from('audit_logs').insert([{
        user_id: userId || null,
        user_email: userEmail || email,
        action: action,
        description: description,
        user_agent: navigator.userAgent
        // created_at is omitted - Supabase will use DEFAULT now()
      }])
      if (error) console.error('Audit log error:', error)
    } catch (err) {
      console.error('Failed to write audit log:', err)
    }
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    generateNewCaptcha()
  }, [])

  useEffect(() => {
    if (password.length > 0) {
      setShowCaptcha(true)
    } else {
      setShowCaptcha(false)
    }
  }, [password])

  const generateNewCaptcha = () => {
    const newNum1 = Math.floor(Math.random() * 10) + 1
    const newNum2 = Math.floor(Math.random() * 10) + 1
    setNum1(newNum1)
    setNum2(newNum2)
    setCaptchaAnswer('')
    setCaptchaVerified(false)
    setCaptchaError('')
  }

  const verifyCaptcha = () => {
    const expectedAnswer = num1 + num2
    const userAnswer = parseInt(captchaAnswer)
    
    if (isNaN(userAnswer)) {
      setCaptchaError('Enter correct answer')
      setCaptchaVerified(false)
      return
    }
    
    if (userAnswer === expectedAnswer) {
      setCaptchaVerified(true)
      setCaptchaError('')
    } else {
      setCaptchaError('Wrong answer. Try again.')
      setCaptchaVerified(false)
      generateNewCaptcha()
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!captchaVerified) {
      setError('Solve math problem first')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await writeToAuditLog(null, email, 'LOGIN_FAILED', `Failed login attempt: ${error.message}`)
      setError(error.message)
      generateNewCaptcha()
      setCaptchaVerified(false)
    } else if (data?.user) {
      await writeToAuditLog(data.user.id, data.user.email, 'LOGIN_SUCCESS', 'User logged in successfully')
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden 
    bg-gradient-to-br from-stone-900 via-zinc-800 to-stone-700 
    flex items-center justify-center p-4">
    
      <div className="absolute inset-0 
      bg-[radial-gradient(ellipse_at_50%_50%,_rgba(251,191,36,0.12)_0%,_rgba(0,0,0,0)_70%)]"></div>
      <div className="relative z-10 w-full max-w-sm">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-white/5">
          
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>

          <div className="pt-6 pb-3 text-center">
            <div className="mb-3 flex justify-center">
              <div className="bg-slate-100 rounded-xl p-2">
                <img
                  src="/birthday-photo.jpg"
                  alt="Logo"
                  className="h-14 w-14 rounded-lg object-cover"
                  style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              BirthdayTracker
            </h1>
            <p className="text-xs font-medium text-emerald-600 mt-1">Celebrate your team the smart way</p>
          </div>

          <form onSubmit={handleLogin} className="px-6 pb-6">

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">EMAIL ADDRESS</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">PASSWORD</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
                  style={{ accentColor: '#10b981' }}
                />
                <span className="text-xs font-semibold text-slate-700">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold text-amber-400 hover:text-amber-500 transition">
                Forgot password?
              </Link>
            </div>

            {showCaptcha && (
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">{num1} + {num2} = </span>
                  <input
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-center font-medium focus:border-emerald-400 focus:outline-none"
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={verifyCaptcha}
                    className="px-4 py-1.5 text-sm font-bold rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition"
                  >
                    Verify
                  </button>
                </div>
                {captchaError && <p className="text-xs font-medium text-red-500 mt-2">{captchaError}</p>}
                {captchaVerified && <p className="text-xs font-bold text-emerald-600 mt-2">✓ Verified</p>}
              </div>
            )}

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-center text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!captchaVerified || loading}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'SIGN IN'}
            </button>
          </form>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-2.5 text-center">
            <p className="text-[11px] font-medium text-slate-400">🔒 A Secure platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}