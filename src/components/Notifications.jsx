import { useState, useEffect } from 'react'
import { Bell, Gift, UserPlus, Settings, Shield, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Notifications({ isOpen, onClose, onMarkRead }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, user])

  async function loadNotifications() {
    setLoading(true)

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

    if (error) {
      console.error('Error loading notifications:', error)
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }

  async function markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      if (onMarkRead) onMarkRead()
      toast.success('Marked as read')
    }
  }

  async function markAllAsRead() {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!error) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      toast.success('All notifications marked as read')
      if (onMarkRead) onMarkRead()
    }
  }

  async function deleteNotification(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success('Notification deleted')
    }
  }

  function getNotificationIcon(type) {
    switch(type) {
      case 'birthday':
        return <Gift size={16} className="text-pink-500" />
      case 'user_created':
        return <UserPlus size={16} className="text-emerald-500" />
      case 'role_changed':
        return <Shield size={16} className="text-amber-500" />
      case 'settings':
        return <Settings size={16} className="text-purple-500" />
      case 'success':
        return <CheckCircle size={16} className="text-emerald-500" />
      case 'error':
        return <XCircle size={16} className="text-red-500" />
      default:
        return <Bell size={16} className="text-emerald-500" />
    }
  }

  function getTimeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!isOpen) return null

  return (
    <div 
      className="absolute right-0 mt-2 w-96 rounded-xl border shadow-xl z-50 overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderColor: 'var(--border)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderBottomColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Bell size={18} style={{ color: '#10b981' }} />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs hover:text-emerald-500 transition"
              style={{ color: 'var(--text-secondary)' }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b" style={{ borderBottomColor: 'var(--border)' }}>
        {['all', 'unread', 'read'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              filter === tab 
                ? 'border-b-2 border-emerald-500 text-emerald-500' 
                : ''
            }`}
            style={filter === tab ? {} : { color: 'var(--text-secondary)' }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List - FIXED: No button inside button */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer ${
                !notification.is_read ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''
              }`}
              style={{ borderBottomColor: 'var(--border)' }}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {notification.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                      className="hover:text-red-500 transition shrink-0"
                    >
                      <Trash2 size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={10} style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {getTimeAgo(notification.created_at)}
                    </span>
                  </div>
                </div>
                
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t text-center" style={{ borderTopColor: 'var(--border)' }}>
        <button
          onClick={onClose}
          className="text-xs hover:text-emerald-500 transition"
          style={{ color: 'var(--text-secondary)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}