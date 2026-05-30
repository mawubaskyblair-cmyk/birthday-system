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

import { supabase } from '../../lib/supabase'
import { getCurrentUserPermissions } from '../../lib/permissions'

export default function Sidebar({ onCollapseChange }) {
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
      const { role, permissions } =
        await getCurrentUserPermissions()

      setUserRole(role || 'Employee')
      setUserPermissions(permissions || [])
    } catch (error) {
      console.error(
        'Failed to load permissions:',
        error
      )
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const toggleCollapse = () => {
    const newState = !collapsed

    setCollapsed(newState)

    if (onCollapseChange) {
      onCollapseChange(newState)
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
          permission: 'View Employee'
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
        if (!item.permission) return true

        return userPermissions.includes(
          item.permission
        )
      })
    }))
    .filter(section => section.items.length > 0)

  return (
    <aside
      className={`h-full flex flex-col shadow-xl transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)'
      }}
    >
      {/* Logo Section */}
      <div
        className={`p-4 border-b ${
          collapsed ? 'text-center' : ''
        }`}
        style={{
          borderBottomColor: 'var(--border)'
        }}
      >
        <div
          className={`flex items-center ${
            collapsed
              ? 'justify-center'
              : 'gap-2'
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
            <span className="text-white text-sm">
              🎂
            </span>
          </div>

          {!collapsed && (
            <span
              className="font-bold text-lg"
              style={{
                color: 'var(--text-primary)'
              }}
            >
              BirthdayTracker
            </span>
          )}
        </div>

        {!collapsed && (
          <p
            className="text-xs mt-1"
            style={{
              color: 'var(--text-secondary)'
            }}
          >
            {userRole} System
          </p>
        )}
      </div>

      {/* Collapse Button */}
      <div className="px-3 pt-3">
        <button
          onClick={toggleCollapse}
          className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{
            color: 'var(--text-secondary)'
          }}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}

          {!collapsed && (
            <span>Collapse menu</span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {filteredMenuItems.map(section => (
          <div key={section.group}>
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 mb-2">
                <section.icon
                  size={14}
                  style={{
                    color: '#b45309'
                  }}
                />

                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    color: '#b45309'
                  }}
                >
                  {section.group}
                </p>
              </div>
            )}

            <div className="space-y-1">
              {section.items.map(item => {
                const isActive =
                  location.pathname === item.path

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={
                      collapsed
                        ? item.label
                        : ''
                    }
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-500 border-l-2 border-amber-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    } ${
                      collapsed
                        ? 'justify-center'
                        : ''
                    }`}
                    style={{
                      color: isActive
                        ? undefined
                        : 'var(--text-secondary)'
                    }}
                  >
                    <item.icon size={18} />

                    {!collapsed && (
                      <span>{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div
        className="p-3 border-t"
        style={{
          borderTopColor: 'var(--border)'
        }}
      >
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : ''}
          className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            collapsed
              ? 'justify-center'
              : ''
          }`}
          style={{
            background:
              'linear-gradient(135deg, rgb(228,54,54) 0%, rgb(196,136,33) 100%)',
            color: 'white'
          }}
        >
          <LogOut size={18} />

          {!collapsed && <span>Logout</span>}
        </button>

        {!collapsed && (
          <p
            className="text-[10px] text-center mt-3"
            style={{
              color: 'var(--text-secondary)'
            }}
          >
            v2.0
          </p>
        )}
      </div>
    </aside>
  )
}