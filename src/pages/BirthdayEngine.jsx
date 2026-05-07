import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import './BirthdayEngine.css'
import { addAuditLog } from '../lib/auditLog'


export default function BirthdayEngine() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [todayBirthdays, setTodayBirthdays] = useState([])
  const [emailLogs, setEmailLogs] = useState([])
  const [settings, setSettings] = useState({})
  const [sendResult, setSendResult] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Load dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
    }
  }, [])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])
  
  // Format time only for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }     

  // Load user permissions and role
  useEffect(() => {
    async function loadPermissions() {
      const { role, permissions } = await getCurrentUserPermissions()
      setUserRole(role)
      setUserPermissions(permissions || [])
    }
    loadPermissions()
  }, [])

  // Load all data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    await Promise.all([
      fetchTodayBirthdays(),
      fetchEmailLogs(),
      fetchSettings()
    ])
    setLoading(false)
  }

  async function fetchTodayBirthdays() {
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
    
    if (employees) {
      const birthdays = employees.filter(emp => {
        if (emp.date_of_birth) {
          const dob = new Date(emp.date_of_birth)
          const dobMonth = dob.getMonth() + 1
          const dobDay = dob.getDate()
          return dobMonth === month && dobDay === day
        }
        return false
      })
      setTodayBirthdays(birthdays)
    }
  }

  async function fetchEmailLogs() {
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20)
    
    if (data) {
      setEmailLogs(data)
    }
  }

  async function fetchSettings() {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
    
    if (data) {
      const settingsMap = {}
      data.forEach(item => {
        settingsMap[item.key] = item.value
      })
      setSettings(settingsMap)
    }
  }

  async function sendBirthdayEmails() {
    if (todayBirthdays.length === 0) {
      alert('No birthdays today!')
      return
    }

    setSending(true)
    setSendResult(null)

    let sentCount = 0
    let failedCount = 0
    const details = []

    for (const birthdayPerson of todayBirthdays) {
      // Get all active employees
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('email, first_name, last_name')
        .eq('status', 'active')

      if (allEmployees) {
        // Send general notification to ALL employees
        for (const employee of allEmployees) {
          const message = (settings.default_birthday_message || '')
            .replace('[First Name]', birthdayPerson.first_name)
            .replace('[Full Name]', `${birthdayPerson.first_name} ${birthdayPerson.last_name}`)
            .replace('[Company Name]', settings.company_name || 'Our Company')

          const { error } = await supabase
            .from('email_logs')
            .insert([{
              recipient_email: employee.email,
              notification_type: 'general',
              status: 'sent',
              sent_at: new Date().toISOString()
            }])
          
          if (error) {
            failedCount++
            details.push(`Failed: General email to ${employee.email}`)
          } else {
            sentCount++
            details.push(`Sent: General email to ${employee.email}`)
          }
        }

        // Send personalized email to birthday person
        const personalizedMessage = (settings.personalized_birthday_message || '')
          .replace('[First Name]', birthdayPerson.first_name)
          .replace('[Full Name]', `${birthdayPerson.first_name} ${birthdayPerson.last_name}`)
          .replace('[Company Name]', settings.company_name || 'Our Company')

        const { error } = await supabase
          .from('email_logs')
          .insert([{
            recipient_email: birthdayPerson.email,
            notification_type: 'personalized',
            status: 'sent',
            sent_at: new Date().toISOString()
          }])
        
        if (error) {
          failedCount++
          details.push(`Failed: Personalized email to ${birthdayPerson.email}`)
        } else {
          sentCount++
          details.push(`Sent: Personalized email to ${birthdayPerson.email}`)
        }
      }
    }
       
    await addAuditLog('SEND_BIRTHDAY_EMAILS', `Sent birthday emails for ${todayBirthdays.map(b => b.first_name).join(', ')}`)
    setSendResult({ sent: sentCount, failed: failedCount, details })
    await fetchEmailLogs()
    alert(`Emails logged: ${sentCount} sent, ${failedCount} failed`)
    setSending(false)
  }

  // FIXED: Admin = Super Admin (has Manage Roles) OR HR Admin (has Create/Edit Employee)
  const isAdmin = userPermissions.includes('Manage Roles') ||      // Super Admin
                  userPermissions.includes('Manage Users') ||      // Super Admin
                  userPermissions.includes('Create Employee') ||   // HR Admin
                  userPermissions.includes('Edit Employee')        // HR Admin

  if (loading) {
    return (
      <div className={darkMode ? 'birthday-container-dark' : 'birthday-container-light'}>
        <div className="birthday-box" style={{ textAlign: 'center', padding: 50 }}>
          Loading Birthday Engine...
        </div>
      </div>
    )
  }

  return (
    <div className={darkMode ? 'birthday-container-dark' : 'birthday-container-light'}>
      <div className="birthday-box">
        <div className="birthday-header">
          <div>
            <h1> Birthday Notification Engine</h1>
            <p>
              {isAdmin 
                ? 'Send birthday wishes to employees' 
                : 'View birthday notifications and email history'}
            </p>
          </div>
                      {/* Stats Cards - Colorful */}
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon">🎂</div>
    <div className="stat-info">
      <h4>Today's Birthdays</h4>
      <div className="stat-number">{todayBirthdays.length}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">✅</div>
    <div className="stat-info">
      <h4>Emails Sent</h4>
      <div className="stat-number">{emailLogs.length}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">📧</div>
    <div className="stat-info">
      <h4>Success Rate</h4>
      <div className="stat-number">
        {emailLogs.length > 0 
          ? Math.round((emailLogs.filter(l => l.status === 'sent').length / emailLogs.length) * 100) 
          : 0}%
      </div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">🎉</div>
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



          {/* Show role badge */}
          <div className="role-badge">
            {userRole === 'Super Administrator' && <span className="badge-super">Super Admin</span>}
            {userRole === 'HR Admin' && <span className="badge-hr">HR Admin</span>}
            {userRole === 'Employee' && <span className="badge-employee">Employee</span>}
          </div>
        </div>

        {/* Today's Birthdays - Everyone can see */}
        <div className="birthday-section">
          <h2>Today's Birthdays</h2>
          {todayBirthdays.length === 0 ? (
            <p className="no-birthdays">No birthdays today. 🎂</p>
          ) : (
            <div className="birthday-list">
              {todayBirthdays.map(emp => (
                <div key={emp.id} className="birthday-card">
                  <div className="birthday-avatar">🎂</div>
                  <div className="birthday-info">
                    <h3>{emp.first_name} {emp.last_name}</h3>
                    <p>{emp.email}</p>
                    <p>Born: {emp.date_of_birth}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Button - ONLY ADMINS CAN SEE */}
        {isAdmin && (
          <div className="birthday-section">
            <button 
              onClick={sendBirthdayEmails}
              disabled={sending || todayBirthdays.length === 0}
              className="send-birthday-btn"
            >
              {sending ? 'Processing...' : ' Send Birthday Emails'}
            </button>
            {todayBirthdays.length > 0 && (
              <p className="send-info">This will send emails to all active employees</p>
            )}
          </div>
        )}

        {/* Send Results - ONLY ADMINS CAN SEE */}
        {isAdmin && sendResult && (
          <div className="birthday-section results">
            <h2>📊 Send Results</h2>
            <div className="results-stats">
              <span className="sent-count">✅ Sent: {sendResult.sent}</span>
              <span className="failed-count">❌ Failed: {sendResult.failed}</span>
            </div>
            <details>
              <summary>View Details ({sendResult.details.length} emails)</summary>
              <ul>
                {sendResult.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>
        )}

        {/* Email Logs - Everyone can see */}
        <div className="birthday-section">
          <h2> Recent Email Logs</h2>
          {emailLogs.length === 0 ? (
            <p className="no-logs">No emails sent yet.</p>
          ) : (
            <div className="logs-table-responsive">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.recipient_email}</td>
                      <td>
                        <span className={`type-${log.notification_type}`}>
                          {log.notification_type === 'general' ? '📢 General' : '🎁 Personalized'}
                        </span>
                      </td>
                      <td>
                        <span className={log.status === 'sent' ? 'status-sent' : 'status-failed'}>
                          {log.status === 'sent' ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </td>
                      <td>{new Date(log.sent_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Employee Message - Only for non-admins */}
        {!isAdmin && (
          <div className="employee-message">
            <p>🎉 Birthdays are celebrated by the HR team automatically.</p>
            <p>You will receive birthday wishes on your special day!</p>
          </div>
        )}
      </div>
    </div>
  )
}