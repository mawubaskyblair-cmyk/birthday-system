import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
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
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="text-amber-500 text-lg animate-pulse"
          style={{ color: 'var(--accent)' }}
        >
          Loading...
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          },
          success: {
            iconTheme: {
              primary: '#f59e0b',
              secondary: 'var(--bg-secondary)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'var(--bg-secondary)',
            },
          },
        }}
      />

      <Routes>
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
          path="/birthday-engine"
          element={session ? <BirthdayEngine /> : <Navigate to="/login" />}
        />

        <Route
          path="/audit-logs"
          element={session ? <AuditLogs /> : <Navigate to="/login" />}
        />

        <Route
          path="/profile"
          element={session ? <Profile /> : <Navigate to="/login" />}
        />

        <Route
          path="/settings"
          element={session ? <Settings /> : <Navigate to="/login" />}
        />

        <Route
          path="/"
          element={<Navigate to={session ? '/dashboard' : '/login'} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
