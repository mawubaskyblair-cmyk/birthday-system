import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Bell, Menu, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Header({ onMenuClick, sidebarOpen }) {
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [time, setTime] = useState(new Date())
  const [userName, setUserName] = useState('User')
  const [role, setRole] = useState('User')
  const [notifOpen, setNotifOpen] = useState(false)

  const roleMap = {
    1: 'Super Administrator',
    2: 'HR Admin',
    3: 'Employee'
  }

  useEffect(() => {
    loadTheme()
    loadUser()

    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  function loadTheme() {
    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme === 'dark'
    setDark(isDark)
    
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    const newTheme = !dark
    setDark(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('username, role_id')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserName(userData.username || user.email.split('@')[0])
      setRole(roleMap[userData.role_id] || 'User')
    } else {
      setUserName(user.email.split('@')[0])
      setRole('Employee')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header 
      className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 border-b shadow-sm"
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderBottomColor: 'var(--border)',
        color: 'var(--text-primary)'
      }}
    >
      
      {/* LEFT SIDE - Menu Button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          style={{ color: 'var(--text-primary)' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div>
          <h1 className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
            Control Center
          </h1>
          <p className="text-xs hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
            {time.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* DATE - Hidden on mobile */}
        <span className="hidden md:block text-xs" style={{ color: 'var(--text-secondary)' }}>
          {time.toLocaleDateString()}
        </span>

        {/* TIME - Visible on mobile */}
        <span className="block md:hidden text-xs" style={{ color: 'var(--text-secondary)' }}>
          {time.toLocaleTimeString()}
        </span>

        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          style={{ color: 'var(--text-primary)' }}
        >
          {dark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
        </button>

        {/* NOTIFICATIONS */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative"
            style={{ color: 'var(--text-primary)' }}
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          </button>

          {notifOpen && (
            <div 
              className="absolute right-0 mt-2 w-72 rounded-xl border shadow-xl z-50"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <div className="p-3 border-b" style={{ borderBottomColor: 'var(--border)' }}>
                <span className="font-semibold">Notifications</span>
              </div>
              <div className="p-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* ROLE BADGE */}
        <span className="hidden sm:inline-block px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
          {role}
        </span>

        {/* USER AVATAR */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden md:block text-sm" style={{ color: 'var(--text-primary)' }}>
            {userName}
          </span>
        </button>
      </div>
    </header>
  )
}