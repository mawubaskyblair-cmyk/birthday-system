import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import './Dashboard.css'
import { addAuditLog } from '../lib/auditLog'


export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userPermissions, setUserPermissions] = useState(null)
  const [userRole, setUserRole] = useState(null)
  
  // Stats state for real data
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [birthdaysToday, setBirthdaysToday] = useState(0)
  const [emailsSent, setEmailsSent] = useState(0)
  const [systemUsers, setSystemUsers] = useState(0)

  useEffect(() => {
    async function getPermissions() {
      const { role, permissions } = await getCurrentUserPermissions()
      setUserRole(role)
      setUserPermissions(permissions)
    }
    getPermissions()
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
  
  // Theme - YOUR CODE
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.body.classList.add('dark-mode')
    }
  }, [])

  // Apply dark mode class when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Get current user and fetch stats
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      await fetchStats()
      setLoading(false)
    }
    getUser()
  }, [])

  // Fetch real stats from database
  async function fetchStats() {
    // Total employees count
    const { count: empCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
    setTotalEmployees(empCount || 0)

    // System users count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    setSystemUsers(userCount || 0)

    // Birthdays today
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    
    const { data: bdayData } = await supabase
      .from('employees')
      .select('date_of_birth')
      .eq('status', 'active')
    
    if (bdayData) {
      let count = 0
      bdayData.forEach(emp => {
        if (emp.date_of_birth) {
          const dob = new Date(emp.date_of_birth)
          const dobMonth = dob.getMonth() + 1
          const dobDay = dob.getDate()
          if (dobMonth === month && dobDay === day) {
            count++
          }
        }
      })
      setBirthdaysToday(count)
    }

    // Emails sent today
    const todayStart = new Date().toISOString().split('T')[0]
    const { count: emailCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', todayStart)
    setEmailsSent(emailCount || 0)
  }

  function toggleMode() {
    setDarkMode(!darkMode)
  }

  async function handleLogout() {
    await addAuditLog('LOGOUT', `User logged out`)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div className={darkMode ? 'dashboard-dark' : 'dashboard-light'}>
      <div className="dashboard-box">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}> Employee Birthday System</h1>
            <p>Welcome, {user?.email || 'User'}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={toggleMode} className="mode-btn">
              {darkMode ? ' Light Mode' : ' Dark Mode'}
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
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

                 {/* Stats - Role Based Visibility */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, marginBottom: 30 }}>
          
          {/* Total Employees - Only Admins see this */}
          {userPermissions && (userPermissions.includes('Manage Users') || userPermissions.includes('Manage Roles')) && (
            <div className="stat-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: 28 }}>👥</div>
              <div>
                <h3 style={{ fontSize: 12 }}>Total Employees</h3>
                <p style={{ fontSize: 20, fontWeight: 'bold' }}>{totalEmployees}</p>
              </div>
            </div>
          )}

          {/* Birthdays Today - EVERYONE sees this */}
          <div className="stat-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: 28 }}>🎂</div>
            <div>
              <h3 style={{ fontSize: 12 }}>Birthdays Today</h3>
              <p style={{ fontSize: 20, fontWeight: 'bold' }}>{birthdaysToday}</p>
            </div>
          </div>

          {/* Emails Sent - Only Admins see this */}
          {userPermissions && (userPermissions.includes('Manage Users') || userPermissions.includes('Manage Roles')) && (
            <div className="stat-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: 28 }}></div>
              <div>
                <h3 style={{ fontSize: 12 }}>Emails Sent</h3>
                <p style={{ fontSize: 20, fontWeight: 'bold' }}>{emailsSent}</p>
              </div>
            </div>
          )}

          {/* System Users - Only Admins see this */}
          {userPermissions && (userPermissions.includes('Manage Users') || userPermissions.includes('Manage Roles')) && (
            <div className="stat-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: 28 }}>👤</div>
              <div>
                <h3 style={{ fontSize: 12 }}>System Users</h3>
                <p style={{ fontSize: 20, fontWeight: 'bold' }}>{systemUsers}</p>
              </div>
            </div>
          )}

        </div>

        {/* Menu - PERMISSION BASED but FULL MENU FOR NOW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
        {userPermissions?.includes('View Employee') && (
          <div className="menu-card" onClick={() => window.location.href = '/employees'}>👥 Employees</div>
        )}
            {userPermissions?.includes('Manage Users') && (
          <div className="menu-card" onClick={() => window.location.href = '/users'}>👤 Users</div>
            )}
            {userPermissions?.includes('Manage Roles') && (
          <div className="menu-card" onClick={() => window.location.href = '/roles'}> Roles</div>
            )}
             {userPermissions?.includes('Manage System Settings') && (
          <div className="menu-card" onClick={() => window.location.href = '/settings'}>⚙️ Settings</div>
             )}
             {userPermissions?.includes('View Audit Logs') && (
          <div className="menu-card" onClick={() => window.location.href = '/audit-logs'}> Audit Logs</div>
             )}
             
          <div className="menu-card" onClick={() => window.location.href = '/birthday-engine'}>🎂 Birthday Engine</div>
        </div>
        
        {/* Footer - Pushed to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '40px' }}></div>
        <div className="coming-soon">
          <p className="coming-soon-title">🎂 Happy Birthday Management System</p>
          <p className="coming-soon-text">
            Employee management, birthday notifications, and audit logs ready soon
          </p>
        </div>
      </div>
    </div>
  )
}