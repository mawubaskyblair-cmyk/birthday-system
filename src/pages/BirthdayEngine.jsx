import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { 
  ArrowLeft, Send, Calendar, Users, Mail, CheckCircle, XCircle, 
  Gift, Sparkles, PartyPopper, Cake, Heart, Clock, Star
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function BirthdayEngine() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [userRoleId, setUserRoleId] = useState(null)
  const [todayBirthdays, setTodayBirthdays] = useState([])
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([])
  const [emailLogs, setEmailLogs] = useState([])
  const [settings, setSettings] = useState({})
  const [sendResult, setSendResult] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    loadPermissions()
    loadData()
  }, [])

  async function loadPermissions() {
    const { permissions, role } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
    
    // Get role ID for Super Admin detection
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', role)
      .single()
    
    if (roleData) {
      setUserRoleId(roleData.id)
    }
  }

  async function loadData() {
    setLoading(true)
    await Promise.all([
      fetchTodayBirthdays(),
      fetchUpcomingBirthdays(),
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
      
      // Show confetti if there are birthdays today
      if (birthdays.length > 0) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    }
  }

  async function fetchUpcomingBirthdays() {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()
    
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
    
    if (employees) {
      const upcoming = employees.filter(emp => {
        if (emp.date_of_birth) {
          const dob = new Date(emp.date_of_birth)
          const dobMonth = dob.getMonth() + 1
          const dobDay = dob.getDate()
          
          if (dobMonth > currentMonth) return true
          if (dobMonth === currentMonth && dobDay > currentDay) return true
          return false
        }
        return false
      }).slice(0, 10)
      setUpcomingBirthdays(upcoming)
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
      toast.error('No birthdays today!')
      return
    }

    setSending(true)
    setSendResult(null)

    let sentCount = 0
    let failedCount = 0
    const details = []

    for (const birthdayPerson of todayBirthdays) {
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('email, first_name, last_name')
        .eq('status', 'active')

      if (allEmployees) {
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
            details.push(`❌ Failed: Email to ${employee.email}`)
          } else {
            sentCount++
            details.push(`✅ Sent: Email to ${employee.email}`)
          }
        }

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
          details.push(`❌ Failed: Birthday email to ${birthdayPerson.email}`)
        } else {
          sentCount++
          details.push(`🎂 Birthday wishes sent to ${birthdayPerson.first_name}!`)
        }
      }
    }

    await addAuditLog('SEND_BIRTHDAY_EMAILS', `Sent birthday emails for ${todayBirthdays.map(b => b.first_name).join(', ')}`)
    setSendResult({ sent: sentCount, failed: failedCount, details })
    await fetchEmailLogs()
    toast.success(`🎉 ${sentCount} birthday wishes sent! 🎂`)
    setSending(false)
  }

  // ONLY SUPER ADMIN (Role ID = 1) can send emails
  const canSend = userRoleId === 1

  const birthdayMessages = [
    "🎂 Happy Birthday! May your day be as special as you are!",
    "🎉 Wishing you a fantastic birthday filled with joy!",
    "🌸 Happy Birthday! Today is all about celebrating YOU!",
    "🎈 Hope your birthday is as amazing as you are!",
    "⭐ Another year, another beautiful chapter. Happy Birthday!"
  ]
  const randomMessage = birthdayMessages[Math.floor(Math.random() * birthdayMessages.length)]

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading celebrations...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 3 + 's',
                  backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                  width: '8px',
                  height: '8px',
                  top: '-10px'
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
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
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              🎂 Birthday Celebration Engine
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {todayBirthdays.length > 0 
                ? `🎉 ${todayBirthdays.length} team member${todayBirthdays.length !== 1 ? 's are' : ' is'} celebrating today!`
                : 'No birthdays today. Check back tomorrow!'
              }
            </p>
          </div>
        </div>

        {/* Today's Birthdays Section */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-900/30">
              <Cake size={18} className="text-pink-500" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>🎂 Today's Birthday Stars</h2>
            {todayBirthdays.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {todayBirthdays.length} Celebrating
              </span>
            )}
          </div>
          
          {todayBirthdays.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <Cake size={28} className="text-gray-400" />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No birthdays today. 🎂</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Check back tomorrow for celebrations!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayBirthdays.map((emp, idx) => (
                <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-102 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-[10px] text-white font-bold">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles size={10} className="text-pink-500" />
                      <p className="text-xs text-pink-500">Celebrating today!</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition">
                    <Heart size={16} className="text-pink-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Birthdays Preview */}
        {upcomingBirthdays.length > 0 && (
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-amber-500" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>📅 Upcoming Birthdays</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingBirthdays.map(emp => (
                <div key={emp.id} className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  {emp.first_name} {emp.last_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Birthday Message Banner */}
        {todayBirthdays.length > 0 && (
          <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white text-center">
            <div className="absolute inset-0 opacity-10">
              <PartyPopper size={150} className="absolute -right-5 -bottom-5" />
            </div>
            <div className="relative z-10">
              <p className="text-lg font-bold mb-1">🎉 Today's Celebration! 🎉</p>
              <p className="text-sm opacity-95">{randomMessage}</p>
            </div>
          </div>
        )}

        {/* Send Button - ONLY SUPER ADMIN */}
        {canSend && (
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: '#10b981' }}>
            <button
              onClick={sendBirthdayEmails}
              disabled={sending || todayBirthdays.length === 0}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-base transition-all ${
                sending || todayBirthdays.length === 0 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 hover:shadow-xl'
              }`}
              style={{ backgroundColor: '#ffffff', color: '#10b981' }}
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                  Sending Birthday Wishes...
                </>
              ) : (
                <>
                  <PartyPopper size={18} />
                  🎉 Send Birthday Celebrations 🎉
                  <Sparkles size={18} />
                </>
              )}
            </button>
            {todayBirthdays.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Gift size={12} className="text-white/80" />
                <p className="text-xs text-white/80">
                  Sending wishes to {todayBirthdays.length} birthday celebrant{todayBirthdays.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Send Results */}
        {sendResult && (
          <div className="rounded-xl border p-5 animate-fade-in" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Mail size={18} className="text-emerald-500" />
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>📊 Send Results</h3>
            </div>
            <div className="flex gap-4 mb-2">
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle size={14} /> Sent: {sendResult.sent}
              </span>
              <span className="flex items-center gap-1 text-sm text-red-600">
                <XCircle size={14} /> Failed: {sendResult.failed}
              </span>
            </div>
            <details className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <summary className="cursor-pointer text-emerald-500">View details ({sendResult.details.length} emails)</summary>
              <ul className="mt-2 pl-4 space-y-1 max-h-40 overflow-y-auto">
                {sendResult.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>
        )}

        {/* Recent Email Logs */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Mail size={18} className="text-purple-500" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>📧 Recent Email Logs</h2>
          </div>
          
          {emailLogs.length === 0 ? (
            <div className="text-center py-6">
              <Mail size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No emails sent yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Send birthday wishes to see logs here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {emailLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-gray-900/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.notification_type === 'general' 
                        ? 'bg-blue-100 dark:bg-blue-900/30' 
                        : 'bg-gradient-to-br from-pink-400 to-rose-500'
                    }`}>
                      {log.notification_type === 'general' 
                        ? <Mail size={14} className="text-blue-500" />
                        : <Cake size={14} className="text-white" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {log.recipient_email?.split('@')[0]}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {log.notification_type === 'general' ? 'Team Announcement' : '🎂 Birthday Wishes'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      log.status === 'sent' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status === 'sent' ? '✓ Sent' : 'Failed'}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(log.sent_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Employee Message (for non-super admins) */}
        {!canSend && (
          <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
              <PartyPopper size={28} className="text-amber-500" />
            </div>
            <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>🎉 Birthdays are celebrated by the HR team automatically!</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>You will receive birthday wishes on your special day.</p>
            <div className="mt-3 flex items-center justify-center gap-1">
              <Star size={12} className="text-amber-500" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your birthday is always remembered</span>
              <Star size={12} className="text-amber-500" />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}