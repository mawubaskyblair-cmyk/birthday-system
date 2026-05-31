import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import Layout from '../components/layout/Layout'
import { 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  FileSpreadsheet, FileText, RefreshCw, 
  Activity, Users, LayoutGrid, Layers,
  Clock, Filter, Calendar as CalendarIcon,
  TrendingUp, UserCheck, Eye
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

// Helper function to format time to Uganda/East Africa timezone
function formatLocalTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export default function AuditLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const actionOptions = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
    'CREATE_EMPLOYEE', 'EDIT_EMPLOYEE', 'DELETE_EMPLOYEE',
    'CREATE_USER', 'UPDATE_USER_STATUS', 'UPDATE_USER_ROLE',
    'CREATE_ROLE', 'EDIT_ROLE', 'DELETE_ROLE',
    'SEND_BIRTHDAY_EMAILS', 'UPDATE_PROFILE', 'UPDATE_SETTINGS'
  ]

  useEffect(() => {
    loadPermissions()
  }, [])

  useEffect(() => {
    if (userPermissions.includes('View Audit Logs')) {
      fetchLogs()
    }
  }, [search, actionFilter, selectedDate, currentPage, pageSize, userPermissions])

  useEffect(() => {
    if (!userPermissions.includes('View Audit Logs')) return
    const interval = setInterval(() => refreshLogs(), 30000)
    return () => clearInterval(interval)
  }, [userPermissions])

  async function loadPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  async function refreshLogs() {
    if (refreshing) return
    setRefreshing(true)
    await fetchLogs()
    setRefreshing(false)
    setLastUpdated(new Date())
  }

  async function fetchLogs() {
    try {
      setLoading(true)
      
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`user_email.ilike.%${search}%,description.ilike.%${search}%,action.ilike.%${search}%`)
      }
      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }
      if (selectedDate) {
        query = query.gte('created_at', `${selectedDate} 00:00:00`).lte('created_at', `${selectedDate} 23:59:59`)
      }

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) throw error

      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  function exportToExcel() {
    const exportData = logs.map(log => ({
      'Timestamp': formatLocalTime(log.created_at),
      'User': log.user_email || 'System',
      'Action': log.action,
      'Description': log.description
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs')
    XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Exported to Excel')
  }

  function exportToPDF() {
    const doc = new jsPDF('landscape')
    doc.setFontSize(16)
    doc.setTextColor(245, 158, 11)
    doc.text('Audit Logs Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${formatLocalTime(new Date().toISOString())}`, 14, 22)
    
    const tableData = logs.map(log => [
      formatLocalTime(log.created_at),
      log.user_email || 'System',
      log.action,
      log.description
    ])

    autoTable(doc, {
      head: [['Timestamp', 'User', 'Action', 'Description']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    })
    doc.save(`audit_logs_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('Exported to PDF')
  }

  function getActionColor(action) {
    if (!action) return { bg: '#f1f5f9', text: '#475569', icon: '📋' }
    if (action.includes('LOGIN_SUCCESS')) return { bg: '#dcfce7', text: '#166534', icon: '✅' }
    if (action.includes('LOGIN_FAILED')) return { bg: '#fee2e2', text: '#991b1b', icon: '❌' }
    if (action.includes('LOGOUT')) return { bg: '#e2e8f0', text: '#475569', icon: '🚪' }
    if (action.includes('CREATE')) return { bg: '#d1fae5', text: '#065f46', icon: '➕' }
    if (action.includes('EDIT') || action.includes('UPDATE')) return { bg: '#fef3c7', text: '#92400e', icon: '✏️' }
    if (action.includes('DELETE')) return { bg: '#fecaca', text: '#991b1b', icon: '🗑️' }
    if (action.includes('SEND')) return { bg: '#fce7f3', text: '#9d174d', icon: '📧' }
    return { bg: '#f1f5f9', text: '#475569', icon: '📋' }
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const uniqueUsers = new Set(logs.map(l => l.user_email)).size

  if (!userPermissions.includes('View Audit Logs') && userPermissions.length > 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <Eye size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-500 mt-2">No permission to view audit logs</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-5">
        
        {/* Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl p-5 mb-2"
          style={{
            background: 'linear-gradient(135deg, #f59e0b15 0%, #d9770615 100%)',
            border: '1px solid #f59e0b30'
          }}
        >
          <div className="relative z-10 flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Activity size={24} className="text-amber-500" />
                  Audit Logs
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={12} className="text-amber-500" />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Last updated: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Live Monitoring</span>
              </div>
              <button
                onClick={refreshLogs}
                disabled={refreshing}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)` }}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.3)'
            }}
          >
            <div className="absolute top-2 right-2 opacity-20">
              <Activity size={48} className="text-white" />
            </div>
            <p className="text-white/80 text-xs uppercase tracking-wider mb-1">Total Events</p>
            <p className="text-white text-3xl font-bold">{totalCount}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={12} className="text-white/70" />
              <span className="text-white/70 text-xs">All time</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.3)'
            }}
          >
            <div className="absolute top-2 right-2 opacity-20">
              <Users size={48} className="text-white" />
            </div>
            <p className="text-white/80 text-xs uppercase tracking-wider mb-1">Active Users</p>
            <p className="text-white text-3xl font-bold">{uniqueUsers}</p>
            <div className="flex items-center gap-1 mt-2">
              <UserCheck size={12} className="text-white/70" />
              <span className="text-white/70 text-xs">Last 30 days</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.3)'
            }}
          >
            <div className="absolute top-2 right-2 opacity-20">
              <LayoutGrid size={48} className="text-white" />
            </div>
            <p className="text-white/80 text-xs uppercase tracking-wider mb-1">Per Page</p>
            <p className="text-white text-3xl font-bold">{pageSize}</p>
            <div className="flex items-center gap-1 mt-2">
              <Layers size={12} className="text-white/70" />
              <span className="text-white/70 text-xs">Records shown</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)'
            }}
          >
            <div className="absolute top-2 right-2 opacity-20">
              <Layers size={48} className="text-white" />
            </div>
            <p className="text-white/80 text-xs uppercase tracking-wider mb-1">Total Pages</p>
            <p className="text-white text-3xl font-bold">{totalPages}</p>
            <div className="flex items-center gap-1 mt-2">
              <ChevronRight size={12} className="text-white/70" />
              <span className="text-white/70 text-xs">Available</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)` }}
        >
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
            <input 
              type="text" 
              placeholder="Search by user, action, or description..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm transition-all focus:ring-2 focus:ring-amber-500/20"
              style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)} 
              className="pl-10 pr-8 py-2.5 rounded-xl text-sm appearance-none"
              style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
            >
              <option value="">All Actions</option>
              {actionOptions.map(action => <option key={action}>{action}</option>)}
            </select>
          </div>

          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="pl-10 pr-3 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
            />
          </div>

          <select 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))} 
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

          <button onClick={exportToExcel} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          
          <button onClick={exportToPDF} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)' }}>
            <FileText size={16} /> PDF
          </button>
        </div>

        {/* Table - Fixed timezone */}
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading audit logs...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>User</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Activity size={32} className="text-gray-400" />
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No audit logs found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const colors = getActionColor(log.action)
                      return (
                        <tr key={log.id} className="border-t transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50" style={{ borderColor: 'var(--border)' }}>
                          {/* FIXED: Time now shows correct Uganda/East Africa time */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                              {formatLocalTime(log.created_at)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                                {log.user_email?.charAt(0).toUpperCase() || 'S'}
                              </div>
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {log.user_email?.split('@')[0] || 'System'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full"
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              <span>{colors.icon}</span>
                              {log.action?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {log.description?.substring(0, 80)}{log.description?.length > 80 ? '...' : ''}
                            </p>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modern Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Showing <span className="font-semibold text-amber-500">{logs.length}</span> of <span className="font-semibold">{totalCount}</span> records
                </p>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(p-1,1))} 
                    disabled={currentPage === 1} 
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const pages = []
                      const maxVisible = 5
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisible - 1)
                      
                      if (endPage - startPage + 1 < maxVisible) {
                        startPage = Math.max(1, endPage - maxVisible + 1)
                      }
                      
                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className="w-8 h-8 rounded-lg text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            1
                          </button>
                        )
                        if (startPage > 2) {
                          pages.push(<span key="dots1" className="px-1 text-gray-400">...</span>)
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                              currentPage === i 
                                ? 'bg-amber-500 text-white shadow-md' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            style={currentPage === i ? {} : { color: 'var(--text-primary)' }}
                          >
                            {i}
                          </button>
                        )
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(<span key="dots2" className="px-1 text-gray-400">...</span>)
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="w-8 h-8 rounded-lg text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {totalPages}
                          </button>
                        )
                      }
                      
                      return pages
                    })()}
                  </div>
                  
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} 
                    disabled={currentPage === totalPages} 
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}