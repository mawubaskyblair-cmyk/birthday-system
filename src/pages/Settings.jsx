import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import './Settings.css'
import { addAuditLog } from '../lib/auditLog'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [companyName, setCompanyName] = useState('')
  const [emailSender, setEmailSender] = useState('')
  const [defaultMessage, setDefaultMessage] = useState('')
  const [personalizedMessage, setPersonalizedMessage] = useState('')
  const [debug, setDebug] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Load dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
    }
  }, [])
  
  // ADD THIS EFFECT
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // ... other effects

  // ========== FUNCTIONS ==========
  // ADD THIS FUNCTION
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Load user permissions
  useEffect(() => {
    async function loadPermissions() {
      const { permissions } = await getCurrentUserPermissions()
      setUserPermissions(permissions || [])
    }
    loadPermissions()
  }, [])

  // Load settings from database
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setDebug('Loading settings...')
    
    try {
      // Get all settings at once
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
      
    
      setDebug(JSON.stringify(data, null, 2))
      
      if (error) {
        console.error('Error:', error)
        setDebug('Error: ' + error.message)
      } else if (data && data.length > 0) {
        // Loop through data and set values
        data.forEach(item => {
          if (item.key === 'company_name') {
            setCompanyName(item.value || '')
          }
          if (item.key === 'email_sender_name') {
            setEmailSender(item.value || '')
          }
          if (item.key === 'default_birthday_message') {
            setDefaultMessage(item.value || '')
          }
          if (item.key === 'personalized_birthday_message') {
            setPersonalizedMessage(item.value || '')
          }
        })
      } else {
        setDebug('No data found in company_settings table')
        // Set default values
        setDefaultMessage('Happy Birthday [First Name]! Wishing you a great day from [Company Name].')
        setPersonalizedMessage('Dear [Full Name], Happy Birthday! We appreciate you at [Company Name].')
      }
    } catch (err) {
      console.error('Catch error:', err)
      setDebug('Catch error: ' + err.message)
    }
    
    setLoading(false)
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSaving(true)
    setDebug('Saving settings...')

    try {
      // Save company name
      await supabase
        .from('company_settings')
        .upsert({ key: 'company_name', value: companyName }, { onConflict: 'key' })

      // Save email sender
      await supabase
        .from('company_settings')
        .upsert({ key: 'email_sender_name', value: emailSender }, { onConflict: 'key' })

      // Save default message
      await supabase
        .from('company_settings')
        .upsert({ key: 'default_birthday_message', value: defaultMessage }, { onConflict: 'key' })

      // Save personalized message
      await supabase
        .from('company_settings')
        .upsert({ key: 'personalized_birthday_message', value: personalizedMessage }, { onConflict: 'key' })


      setDebug('Settings saved successfully!')
      await addAuditLog('UPDATE_SETTINGS', 'Updated company settings')
      alert('Settings saved successfully!')
    } catch (err) {
      setDebug('Save error: ' + err.message)
      alert('Error saving: ' + err.message)
    }
    
    
    setSaving(false)
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
      <div className={darkMode ? 'settings-container-dark' : 'settings-container-light'}>
        <div className="settings-box" style={{ textAlign: 'center', padding: 50 }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to manage system settings.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={darkMode ? 'settings-container-dark' : 'settings-container-light'}>
        <div className="settings-box" style={{ textAlign: 'center', padding: 50 }}>
          Loading settings...
          <pre style={{ marginTop: 20, fontSize: 12 }}>{debug}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className={darkMode ? 'settings-container-dark' : 'settings-container-light'}>
      <div className="settings-box">
        <div className="settings-header">
          <div>
            <h1>⚙️ Company Settings</h1>
            <p>Configure company information and birthday message templates</p>
          </div>
        </div>

        {/* Debug info */}
        {/*<div style={{ background: '#f0f0f0', padding: 10, marginBottom: 20, borderRadius: 8, fontSize: 12 }}>*/}
         {/* <strong>Debug:</strong>
          <pre style={{ marginTop: 5, overflow: 'auto' }}>{debug}</pre>
        </div>*/}{/* Stats Cards - Colorful */}
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon">⚙️</div>
    <div className="stat-info">
      <h4>Company Settings</h4>
      <div className="stat-number">4</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">📧</div>
    <div className="stat-info">
      <h4>Email Templates</h4>
      <div className="stat-number">2</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">🔖</div>
    <div className="stat-info">
      <h4>Placeholders</h4>
      <div className="stat-number">3</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">✅</div>
    <div className="stat-info">
      <h4>Active</h4>
      <div className="stat-number">✓</div>
    </div>
  </div>
</div>

{/* Time Card */}
<div className="time-card-container">
  <div className="time-card">
    <div className="time-icon"></div>
    <div className="time-text">
      <div className="time-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div className="time-clock">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    </div>
  </div>
</div>

        <form onSubmit={handleSaveSettings}>
          {/* Basic Information */}
          <div className="settings-section">
            <h2>Basic Information</h2>
            <div className="settings-form-group">
              <label>Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="settings-input"
              />
              <small>Current value: "{companyName}"</small>
            </div>

            <div className="settings-form-group">
              <label>Email Sender Name</label>
              <input
                type="text"
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                placeholder="e.g., HR Department"
                className="settings-input"
              />
              <small>Current value: "{emailSender}"</small>
            </div>
          </div>

          {/* Email Templates */}
          <div className="settings-section">
            <h2>Birthday Email Templates</h2>
            
            <div className="settings-form-group">
              <label>Default Birthday Message</label>
              <textarea
                value={defaultMessage}
                onChange={(e) => setDefaultMessage(e.target.value)}
                rows="5"
                className="settings-textarea"
              />
            </div>

            <div className="settings-form-group">
              <label>Personalized Birthday Message</label>
              <textarea
                value={personalizedMessage}
                onChange={(e) => setPersonalizedMessage(e.target.value)}
                rows="5"
                className="settings-textarea"
              />
            </div>
          </div>

          {/* Preview Section */}
          <div className="settings-section">
            <h2>Preview</h2>
            <div className="preview-box">
              <p><strong>Default Message Preview:</strong></p>
              <p className="preview-text">
                {cleanPreviewText(defaultMessage, companyName)}
              </p>
            </div>
            <div className="preview-box">
              <p><strong>Personalized Message Preview:</strong></p>
              <p className="preview-text">
                {cleanPreviewText(personalizedMessage, companyName)}
              </p>
            </div>
          </div>

          <div className="settings-actions">
            <button type="submit" className="save-settings-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}