import { Link } from 'react-router-dom'

export default function CheckEmail() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-stone-900 via-zinc-800 to-stone-700 flex items-center justify-center p-4">
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_rgba(251,191,36,0.12)_0%,_rgba(0,0,0,0)_70%)]"></div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-white/20">
          
          <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>

          <div className="pt-8 pb-6 text-center px-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 mb-2">
              Check Your Email
            </h1>
            
            <p className="text-sm text-slate-600 mb-6">
              We have sent a password reset link to your email address.
              Please check your inbox and click the link to create a new password.
            </p>

            <Link
              to="/login"
              className="inline-block w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-lg transition-all duration-200 text-sm text-center"
            >
              BACK TO LOGIN
            </Link>

            <p className="text-xs text-slate-400 mt-4">
              Didn't receive the email? Check your spam folder or{' '}
              <Link to="/forgot-password" className="text-amber-600 hover:text-amber-700 font-medium">
                try again
              </Link>
            </p>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-2.5 text-center">
            <p className="text-[11px] font-medium text-slate-400">🔒 A Secure platform </p>
          </div>
        </div>
      </div>
    </div>
  )
}