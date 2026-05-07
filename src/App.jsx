import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { clearPermissionCache } from './lib/permissions'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Users from './pages/Users'
import Roles from './pages/Roles'
import Settings from './pages/Settings'
import BirthdayEngine from './pages/BirthdayEngine'
import AuditLogs from './pages/AuditLogs'
import GDPRBanner from './components/GDPRBanner'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        clearPermissionCache()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f7fa',
        color: '#1f2937'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={session ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/employees" 
          element={session ? <Employees /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/users" 
          element={session ? <Users /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/roles" 
          element={session ? <Roles /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={session ? <Settings /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/birthday-engine" 
          element={session ? <BirthdayEngine /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/audit-logs" 
          element={session ? <AuditLogs /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={session ? "/dashboard" : "/login"} />} 
        />
      </Routes>
      <GDPRBanner />
    </BrowserRouter>
  )
}

export default App