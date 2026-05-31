import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCog,
  KeyRound,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Gift,
  Shield,
  Briefcase
} from 'lucide-react'

import { addAuditLog } from '../../lib/auditLog'
import { useAuth } from '../../contexts/AuthContext'
import { clearPermissionsCache, getCurrentUserPermissions } from '../../lib/permissions'

export default function Sidebar({ onCollapseChange, isMobile = false, mobileOpen = false, onMobileClose }) {
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [userRole, setUserRole] = useState('Employee')

  useEffect(() => {
    loadUserPermissions()
  }, [])

  async function loadUserPermissions() {
    try {
      const { role, permissions } = await getCurrentUserPermissions()
      setUserRole(role || 'Employee')
      setUserPermissions(permissions || [])
    } catch (error) {
      console.error('Failed to load permissions:', error)
    }
  }

  // Logout function with audit logging (NO user_agent)
  const handleLogout = async () => {
    try {
      await addAuditLog('LOGOUT', 'User logged out successfully')
      clearPermissionsCache()
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
      clearPermissionsCache()
      await signOut()
      navigate('/login')
    }
  }

  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    if (onCollapseChange) {
      onCollapseChange(newState)
    }
  }

  const closeMobileMenu = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  const menuItems = [
    {
      group: 'OVERVIEW',
      icon: LayoutDashboard,
      items: [
        {
          path: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          permission: null
        }
      ]
    },
    {
      group: 'HR MANAGEMENT',
      icon: Briefcase,
      items: [
        {
          path: '/employees',
          label: 'Employees',
          icon: Users,
          permission: 'View Employee'
        },
        {
          path: '/users',
          label: 'System Users',
          icon: UserCog,
          permission: 'Manage Users'
        },
        {
          path: '/roles',
          label: 'Roles & Permissions',
          icon: KeyRound,
          permission: 'Manage Roles'
        }
      ]
    },
    {
      group: 'CELEBRATIONS',
      icon: Gift,
      items: [
        {
          path: '/birthday-engine',
          label: 'Birthday Engine',
          icon: Calendar,
          permission: null  // Everyone can see this
        }
      ]
    },
    {
      group: 'SECURITY & REPORTS',
      icon: Shield,
      items: [
        {
          path: '/audit-logs',
          label: 'Audit Logs',
          icon: FileText,
          permission: 'View Audit Logs'
        },
        {
          path: '/settings',
          label: 'Settings',
          icon: Settings,
          permission: 'Manage System Settings'
        }
      ]
    }
  ]

  const filteredMenuItems = menuItems
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.path === '/dashboard') return true
        if (item.path === '/birthday-engine') return true  // Always show Birthday Engine
        if (!item.permission) return true
        return userPermissions.includes(item.permission)
      })
    }))
    .filter(section => section.items.length > 0)

  return (
    <aside
      className={`h-full flex flex-col shadow-xl transition-all duration-300 ${
        isMobile ? 'w-64' : collapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)'
      }}
    >
      {/* Logo Section */}
      <div
        className={`p-4 border-b ${collapsed && !isMobile ? 'text-center' : ''}`}
        style={{ borderBottomColor: 'var(--border)' }}
      >
        <div
          className={`flex items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-2'}`}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-white text-sm">🎂</span>
          </div>

          {(!collapsed || isMobile) && (
            <span
              className="font-bold text-lg truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              BirthdayTracker
            </span>
          )}
        </div>

        {(!collapsed || isMobile) && (
          <p
            className="text-xs mt-1 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {userRole} System
          </p>
        )}
      </div>

      {/* Collapse Button - Desktop only */}
      {!isMobile && (
        <div className="px-3 pt-3">
          <button
            onClick={toggleCollapse}
            className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            style={{ color: 'var(--text-secondary)' }}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>Collapse menu</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {filteredMenuItems.map(section => (
          <div key={section.group}>
            {(!collapsed || isMobile) && (
              <div className="flex items-center gap-2 px-3 mb-2">
                <section.icon size={14} style={{ color: '#10b981' }} />
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: '#10b981' }}
                >
                  {section.group}
                </p>
              </div>
            )}

            <div className="space-y-1">
              {section.items.map(item => {
                const isActive = location.pathname === item.path

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    title={collapsed && !isMobile ? item.label : ''}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-500 border-l-2 border-emerald-500'
                        : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    } ${collapsed && !isMobile ? 'justify-center' : ''}`}
                    style={{
                      color: isActive ? undefined : 'var(--text-secondary)'
                    }}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    
                    {(!collapsed || isMobile) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div
        className="p-3 border-t"
        style={{ borderTopColor: 'var(--border)' }}
      >
        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? 'Logout' : ''}
          className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
          }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>

        {(!collapsed || isMobile) && (
          <p
            className="text-[10px] text-center mt-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            v2.0
          </p>
        )}
      </div>
    </aside>
  )
}