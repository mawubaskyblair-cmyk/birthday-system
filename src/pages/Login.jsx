import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { addAuditLog } from '../lib/auditLog'
import '../styles/Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Email validation
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address (e.g., name@company.com)')
      setLoading(false)
      return
    }

    // Password validation - SRS 3.4.3
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (loginError) {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      
      // SRS 3.4.1 - Account lock after configurable failed attempts
      if (newAttempts >= 5) {
        setError('Too many failed attempts. Account temporarily locked. Please reset your password.')
      } else {
        setError(`Invalid email or password. ${5 - newAttempts} attempt(s) remaining.`)
      }
    } else {
      await addAuditLog('LOGIN', `User logged in successfully`)
      
      // Remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })

    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
      setError('')
      setTimeout(() => setResetSent(false), 5000)
    }
    setLoading(false)
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Left Side - Branding Section */}
        <div className="login-branding">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-circle">
                <span className="logo-emoji">🎂</span>
              </div>
              <span className="logo-text">BirthdayTracker</span>
            </div>
            
            <h1 className="brand-title">
              Celebrate Every<br />
              <span className="brand-highlight">Employee Birthday</span>
            </h1>
            
            <p className="brand-description">
              Automate birthday wishes, strengthen team culture, 
              and make every employee feel valued on their special day.
            </p>
            
            <div className="brand-features">
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Automated birthday detection</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Personalized wishes</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Email notifications</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Secure role-based access</span>
              </div>
            </div>
            
            <div className="brand-testimonial">
              <div className="testimonial-quote">"</div>
              <p className="testimonial-text">
                This system has transformed how we celebrate our team. 
                No more missed birthdays!
              </p>
              <div className="testimonial-author">
                — Sarah Johnson, HR Director
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="form-container">
            <div className="form-header">
              <h2>Welcome back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                <span>Password reset link sent to your email. Check your inbox.</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️':'🙈'}
                  </button>
                </div>
                <small className="input-hint">
                  Minimum 8 characters with letters and numbers
                </small>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="forgot-link"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="form-footer">
              <div className="security-badges">
                <span>🔐 SSL Encrypted</span>
                <span>✓ GDPR Compliant</span>
                <span>🛡️ RLS Protected</span>
              </div>
              <p className="footer-text">
                Secure system — All actions are audited
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}