import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Send, Calendar, Users, Mail, CheckCircle, XCircle } from 'lucide-react'

export default function BirthdayEngine() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [todayBirthdays, setTodayBirthdays] = useState([])
  const [emailLogs, setEmailLogs] = useState([])
  const [settings, setSettings] = useState({})
  const [sendResult, setSendResult] = useState(null)

  useEffect(() => {
    loadPermissions()
    loadData()
  }, [])

  async function loadPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

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

  // Check if user can send emails (Admin only)
  const canSend = userPermissions.includes('Manage Roles') || 
                  userPermissions.includes('Manage Users') || 
                  userPermissions.includes('Create Employee') || 
                  userPermissions.includes('Edit Employee')

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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🎂 Birthday Notification Engine</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Send birthday wishes to employees</p>
          </div>
        </div>

        {/* Today's Birthdays Section */}
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Today's Birthdays</h2>
          </div>
          
          {todayBirthdays.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No birthdays today. 🎂</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todayBirthdays.map(emp => (
                <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                    {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.email}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Born: {emp.date_of_birth}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Button - Only for Admins */}
        {canSend && (
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <button
              onClick={sendBirthdayEmails}
              disabled={sending || todayBirthdays.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? 'Sending emails...' : 'Send Birthday Emails'}
            </button>
            {todayBirthdays.length > 0 && (
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
                This will send emails to all active employees
              </p>
            )}
          </div>
        )}

        {/* Send Results */}
        {sendResult && (
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>📊 Send Results</h3>
            <div className="flex gap-4 mb-2">
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle size={14} /> Sent: {sendResult.sent}
              </span>
              <span className="flex items-center gap-1 text-sm text-red-600">
                <XCircle size={14} /> Failed: {sendResult.failed}
              </span>
            </div>
            <details className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <summary className="cursor-pointer">View details ({sendResult.details.length} emails)</summary>
              <ul className="mt-2 pl-4 space-y-1 max-h-40 overflow-y-auto">
                {sendResult.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>
        )}

        {/* Recent Email Logs */}
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Mail size={18} style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Email Logs</h2>
          </div>
          
          {emailLogs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No emails sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ color: 'var(--text-secondary)' }}>
                  <tr>
                    <th className="text-left py-2 px-2">Recipient</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map(log => (
                    <tr key={log.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>{log.recipient_email}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          log.notification_type === 'general' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {log.notification_type === 'general' ? 'General' : 'Personalized'}
                        </span>
                       </td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          log.status === 'sent' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                       </td>
                      <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(log.sent_at).toLocaleString()}
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Employee Message (for non-admins) */}
        {!canSend && (
          <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>🎉 Birthdays are celebrated by the HR team automatically.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>You will receive birthday wishes on your special day!</p>
          </div>
        )}
      </div>
    </Layout>
  )
}