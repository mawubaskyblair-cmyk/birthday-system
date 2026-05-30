import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Save, Building, Mail, MessageSquare, Bell, Moon, Sun } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [darkMode, setDarkMode] = useState(false)
  
  const [settings, setSettings] = useState({
    company_name: '',
    email_sender: '',
    default_message: '',
    personalized_message: '',
    notifications_enabled: true
  })

  useEffect(() => {
    loadPermissions()
    loadSettings()
    loadTheme()
  }, [])

  async function loadPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  function loadTheme() {
    const saved = localStorage.getItem('theme')
    setDarkMode(saved === 'dark')
  }

  async function loadSettings() {
    setLoading(true)
    
    const { data } = await supabase
      .from('company_settings')
      .select('*')
    
    if (data) {
      const settingsMap = {}
      data.forEach(item => {
        settingsMap[item.key] = item.value
      })
      setSettings({
        company_name: settingsMap.company_name || '',
        email_sender: settingsMap.email_sender_name || '',
        default_message: settingsMap.default_birthday_message || 'Happy Birthday [First Name]! Wishing you a great day from [Company Name].',
        personalized_message: settingsMap.personalized_birthday_message || 'Dear [Full Name], Happy Birthday! We appreciate you at [Company Name].',
        notifications_enabled: true
      })
    }
    setLoading(false)
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSaving(true)
    
    const updates = [
      { key: 'company_name', value: settings.company_name },
      { key: 'email_sender_name', value: settings.email_sender },
      { key: 'default_birthday_message', value: settings.default_message },
      { key: 'personalized_birthday_message', value: settings.personalized_message }
    ]
    
    let hasError = false
    for (const update of updates) {
      const { error } = await supabase
        .from('company_settings')
        .upsert({ key: update.key, value: update.value }, { onConflict: 'key' })
      
      if (error) {
        alert('Error saving: ' + error.message)
        hasError = true
        break
      }
    }
    
    if (!hasError) {
      await addAuditLog('UPDATE_SETTINGS', 'Updated company settings')
      alert('Settings saved successfully')
    }
    setSaving(false)
  }

  function toggleTheme() {
    const newTheme = !darkMode
    setDarkMode(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  function cleanPreviewText(message, company) {
    if (!message) return ''
    let cleaned = message.replace(/[\[\]"]/g, '')
    cleaned = cleaned.replace('[First Name]', 'John')
    cleaned = cleaned.replace('[Full Name]', 'John Doe')
    cleaned = cleaned.replace('[Company Name]', company || 'My Company')
    return cleaned
  }

  // Check permission
  if (!userPermissions.includes('Manage System Settings') && userPermissions.length > 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-500 mt-2">No permission to manage settings</p>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-5">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              border: `1px solid var(--border)`,
              color: 'var(--text-primary)'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>⚙️ Settings</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure your system preferences</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          
          {/* Appearance Section */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-4">
              {darkMode ? <Moon size={18} style={{ color: 'var(--text-primary)' }} /> : <Sun size={18} style={{ color: 'var(--text-primary)' }} />}
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Dark Mode</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Switch between light and dark theme</p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ backgroundColor: darkMode ? '#f59e0b' : '#cbd5e1' }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Company Information Section */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Building size={18} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Company Information</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Company Name</label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: `1px solid var(--border)`,
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Email Sender Name</label>
                <input
                  type="text"
                  value={settings.email_sender}
                  onChange={(e) => setSettings({ ...settings, email_sender: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: `1px solid var(--border)`,
                    color: 'var(--text-primary)'
                  }}
                  placeholder="e.g., HR Department"
                />
              </div>
            </div>
          </div>

          {/* Email Templates Section */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Mail size={18} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Birthday Email Templates</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Default Birthday Message</label>
                <textarea
                  value={settings.default_message}
                  onChange={(e) => setSettings({ ...settings, default_message: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: `1px solid var(--border)`,
                    color: 'var(--text-primary)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Use [First Name], [Full Name], [Company Name] as placeholders
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Personalized Birthday Message</label>
                <textarea
                  value={settings.personalized_message}
                  onChange={(e) => setSettings({ ...settings, personalized_message: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: `1px solid var(--border)`,
                    color: 'var(--text-primary)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Use [First Name], [Full Name], [Company Name] as placeholders
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Preview</h2>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Default Message Preview:</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {cleanPreviewText(settings.default_message, settings.company_name)}
                </p>
              </div>
              
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Personalized Message Preview:</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {cleanPreviewText(settings.personalized_message, settings.company_name)}
                </p>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enable Email Notifications</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Receive email alerts for birthdays and updates</p>
              </div>
              <label className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications_enabled}
                  onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-6 w-11 rounded-full transition-colors ${
                    settings.notifications_enabled ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-1 ${
                      settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}