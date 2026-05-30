import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Users from './pages/Users'
import Roles from './pages/Roles'
import BirthdayEngine from './pages/BirthdayEngine'
import AuditLogs from './pages/AuditLogs'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import ForgotPassword from './pages/ForgotPassword'
import CheckEmail from './pages/CheckEmail'
import ResetPassword from './pages/ResetPassword'
import { Toaster } from 'react-hot-toast'


function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-zinc-800 to-stone-700 flex items-center justify-center">
        <div className="text-amber-400 text-lg animate-pulse">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>

      {/* Toast system (GLOBAL) */}
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>

        {/* AUTH ROUTES */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" />}
        />

        <Route
          path="/forgot-password"
          element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />}
        />

        <Route
          path="/check-email"
          element={!session ? <CheckEmail /> : <Navigate to="/dashboard" />}
        />

        <Route
          path="/reset-password"
          element={!session ? <ResetPassword /> : <Navigate to="/dashboard" />}
        />

        {/* PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" />}
        />

        {/* DEFAULT ROUTE */}
        <Route
          path="/"
          element={<Navigate to={session ? "/dashboard" : "/login"} />}
        />
         
         <Route path="/employees" element={session ? <Employees /> : <Navigate to="/login" />} />
         <Route path="/roles" element={session ? <Roles /> : <Navigate to="/login" />} />
         <Route path="/birthday-engine" element={session ? <BirthdayEngine /> : <Navigate to="/login" />} />
         <Route path="/audit-logs" element={session ? <AuditLogs /> : <Navigate to="/login" />} />

        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/settings" element={session ? <Settings /> : <Navigate to="/login" />} />

        <Route path="/users" element={session ? <Users /> : <Navigate to="/login" />} />


      </Routes>
      
    </BrowserRouter>
  )
}

export default App