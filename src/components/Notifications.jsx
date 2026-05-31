import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const typeIcons = {
  birthday: '🎂',
  user_created: '✅',
  role_changed: '🔄',
  success: '📧',
  default: '🔔',
}

export default function Notifications({ isOpen, onClose, onMarkRead }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  async function loadNotifications() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error) {
      setItems(data || [])
    }
    setLoading(false)
  }

  async function markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      onMarkRead?.()
    }
  }

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!error) {
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      onMarkRead?.()
    }
  }

  function handleClick(notification) {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      onClose?.()
      navigate(notification.link)
    }
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <>
      <div className="fixed inset-0 z-40 md:hidden" onClick={onClose} aria-hidden="true" />

      <div
        className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-50 overflow-hidden fade-in"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderBottomColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: '#10b981' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                title="Mark all as read"
                style={{ color: 'var(--text-secondary)' }}
              >
                <CheckCheck size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Loading...
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              No notifications yet
            </p>
          ) : (
            items.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                  !notification.is_read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                }`}
                style={{ borderBottomColor: 'var(--border)' }}
              >
                <div className="flex gap-3">
                  <span className="text-lg shrink-0">
                    {typeIcons[notification.type] || typeIcons.default}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium truncate ${!notification.is_read ? '' : 'opacity-80'}`}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {notification.message}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/30 shrink-0"
                      title="Mark as read"
                    >
                      <Check size={14} style={{ color: '#10b981' }} />
                    </button>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
