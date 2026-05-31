import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Bell, Menu, X, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import useTheme from '../../hooks/useTheme'
import Notifications from '../Notifications'

export default function Header({ onMenuClick, sidebarOpen, isMobile = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { dark, toggleTheme, toggleWithAnimation, systemPreference } = useTheme()
  const [time, setTime] = useState(new Date())
  const [userName, setUserName] = useState('User')
  const [role, setRole] = useState('User')
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const roleMap = {
    1: 'Super Administrator',
    2: 'HR Admin',
    3: 'Employee'
  }

  useEffect(() => {
    loadUser()
    loadUnreadCount()

    const timeInterval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    const notifInterval = setInterval(() => {
      if (!notifOpen) {
        loadUnreadCount()
      }
    }, 30000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(notifInterval)
    }
  }, [notifOpen, user])

  async function loadUser() {
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

  async function loadUnreadCount() {
    if (!user) return
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (!error) {
      setUnreadCount(count || 0)
    }
  }

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formattedDate = time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <header 
      className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 border-b shadow-sm"
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderBottomColor: 'var(--border)',
        color: 'var(--text-primary)'
      }}
    >
      
      {/* LEFT SIDE */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg transition-all hover:scale-105 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)'
            }}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        
        <div className="hidden sm:block">
          <h1 className="font-semibold text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
            Control Center
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formattedTime}
            </p>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>•</span>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formattedDate}
            </p>
          </div>
        </div>

        <div className="block sm:hidden">
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {formattedTime}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2 md:gap-3">
        
        {/* THEME TOGGLE BUTTON */}
        <button
          onClick={toggleWithAnimation}
          className="p-2 rounded-lg transition-all hover:scale-105 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)'
          }}
          aria-label={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {dark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
        </button>

        {/* System preference indicator */}
        {systemPreference !== null && (
          <div className="hidden lg:block text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            {systemPreference ? '🌙 System Dark' : '☀️ System Light'}
          </div>
        )}

        {/* NOTIFICATIONS */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg transition-all hover:scale-105 relative hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)'
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <Notifications 
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
            onMarkRead={() => loadUnreadCount()}
          />
        </div>

        {/* ROLE BADGE */}
        <span 
          className="hidden sm:inline-block px-2.5 py-1 text-xs font-medium rounded-full"
          style={{ backgroundColor: '#10b981', color: 'white' }}
        >
          {role}
        </span>

        {/* USER MENU - Only Profile, NO Settings, NO Logout */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 transition-all hover:scale-105"
            aria-label="User menu"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {userName}
            </span>
          </button>

          {/* User Dropdown Menu - Only Profile, NO Settings, NO Logout */}
          {userMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-48 rounded-xl border shadow-xl z-50 overflow-hidden fade-in"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderBottomColor: 'var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{role}</p>
              </div>
              <button
                onClick={() => { 
                  setUserMenuOpen(false)
                  navigate('/profile')
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                style={{ color: 'var(--text-primary)' }}
              >
                <User size={16} /> Profile
              </button>
              {/* NO Settings button */}
              {/* NO Logout button */}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}