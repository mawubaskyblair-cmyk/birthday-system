import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Calendar, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

export default function AuditLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState([])
  
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const actionOptions = [
    'LOGIN', 'LOGOUT',
    'CREATE_EMPLOYEE', 'EDIT_EMPLOYEE', 'DELETE_EMPLOYEE',
    'CREATE_USER', 'UPDATE_USER_STATUS', 'UPDATE_USER_ROLE',
    'CREATE_ROLE', 'EDIT_ROLE', 'DELETE_ROLE', 'UPDATE_PERMISSIONS',
    'UPDATE_SETTINGS', 'SEND_BIRTHDAY_EMAILS',
    'UPDATE_PROFILE', 'CHANGE_PASSWORD'  // ADD THESE TWO LINES
  ]

  useEffect(() => {
    loadPermissions()
  }, [])

  async function loadPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  useEffect(() => {
    if (userPermissions.includes('View Audit Logs')) {
      fetchLogs()
    }
  }, [search, actionFilter, selectedDate, currentPage, pageSize, userPermissions])

  async function fetchLogs() {
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

    if (error) {
      console.error('Error fetching audit logs:', error)
    } else {
      setLogs(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  // Export to Excel
  function exportToExcel() {
    const exportData = logs.map(log => ({
      'Timestamp': new Date(log.created_at).toLocaleString(),
      'User': log.user_email || 'System',
      'Action': log.action,
      'Description': log.description
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs')
    XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel file downloaded')
  }

  // Export to PDF
  function exportToPDF() {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(16)
    doc.text('Audit Logs', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
    
    const tableData = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_email || 'System',
      log.action,
      log.description
    ])

    autoTable(doc, {
      head: [['Timestamp', 'User', 'Action', 'Description']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 10, right: 10 }
    })

    doc.save(`audit_logs_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF file downloaded')
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  if (!userPermissions.includes('View Audit Logs') && userPermissions.length > 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-500 mt-2">No permission to view audit logs</p>
        </div>
      </Layout>
    )
  }

  function getActionColor(action) {
    if (action?.includes('LOGIN')) return 'bg-green-100 text-green-700'
    if (action?.includes('LOGOUT')) return 'bg-gray-100 text-gray-700'
    if (action?.includes('CREATE')) return 'bg-blue-100 text-blue-700'
    if (action?.includes('EDIT')) return 'bg-amber-100 text-amber-700'
    if (action?.includes('DELETE')) return 'bg-red-100 text-red-700'
    if (action?.includes('UPDATE')) return 'bg-purple-100 text-purple-700'
    if (action?.includes('SEND')) return 'bg-pink-100 text-pink-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <Layout>
      <div className="space-y-5">
        
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📋 Audit Logs</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track all system activities</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" placeholder="Search by user, action, or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} />
          </div>
          
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}>
            <option value="">All Actions</option>
            {actionOptions.map(action => <option key={action} value={action}>{action}</option>)}
          </select>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-9 pr-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} />
          </div>

          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

           
           {/* Excel Button - Green */}
<button
  onClick={exportToExcel}
  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition"
  style={{ backgroundColor: '#10b981', border: 'none', color: 'white' }}
>
  <FileSpreadsheet size={16} />
  Excel
</button>

{/* PDF Button - Red */}
<button
  onClick={exportToPDF}
  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition"
  style={{ backgroundColor: '#ef4444', border: 'none', color: 'white' }}
>
  <FileText size={16} />
  PDF
</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div></div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr><th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Timestamp</th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>User</th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Action</th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Description</th>
                   </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>No audit logs found</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{log.user_email || 'System'}</td>
                        <td className="py-2 px-3"><span className={`inline-block px-2 py-1 text-xs rounded-full ${getActionColor(log.action)}`}>{log.action}</span></td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{log.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
               </table>
            </div>

            {totalPages > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total: {totalCount} records</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50" style={{ borderColor: 'var(--border)' }}><ChevronLeft size={16} /></button>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50" style={{ borderColor: 'var(--border)' }}><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}