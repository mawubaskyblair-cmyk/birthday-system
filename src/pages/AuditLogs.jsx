import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import './AuditLogs.css'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Search and filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

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

  // Load user permissions
  useEffect(() => {
    async function loadPermissions() {
      const { permissions } = await getCurrentUserPermissions()
      setUserPermissions(permissions || [])
    }
    loadPermissions()
  }, [])

  // Load audit logs
  useEffect(() => {
    if (userPermissions.includes('View Audit Logs')) {
      fetchLogs()
    }
  }, [search, actionFilter, dateFrom, dateTo, currentPage, pageSize, userPermissions])

  async function fetchLogs() {
    setLoading(true)
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Search by user email or action
    if (search) {
      query = query.or(`user_email.ilike.%${search}%,description.ilike.%${search}%,action.ilike.%${search}%`)
    }

    // Filter by action
    if (actionFilter) {
      query = query.eq('action', actionFilter)
    }

    // Filter by date range
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo} 23:59:59`)
    }

    // Pagination
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

  // Get unique actions for filter dropdown
  const uniqueActions = [...new Set(logs.map(log => log.action))]

  // Check permission
  if (!userPermissions.includes('View Audit Logs') && userPermissions.length > 0) {
    return (
      <div className={darkMode ? 'audit-container-dark' : 'audit-container-light'}>
        <div className="audit-box" style={{ textAlign: 'center', padding: 50 }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view audit logs.</p>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className={darkMode ? 'audit-container-dark' : 'audit-container-light'}>
      <div className="audit-box">
        <div className="audit-header">
          <div>
            <h1>📋 Audit Logs</h1>
            <p>Track all system activities and user actions</p>
          </div>
        </div>
        {/* Stats Cards - Colorful */}
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon">📊</div>
    <div className="stat-info">
      <h4>Total Logs</h4>
      <div className="stat-number">{totalCount}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">👥</div>
    <div className="stat-info">
      <h4>Unique Users</h4>
      <div className="stat-number">{new Set(logs.map(l => l.user_email)).size}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">📅</div>
    <div className="stat-info">
      <h4>Today's Logs</h4>
      <div className="stat-number">
        {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
      </div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">📈</div>
    <div className="stat-info">
      <h4>This Week</h4>
      <div className="stat-number">
        {logs.filter(l => {
          const logDate = new Date(l.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return logDate >= weekAgo
        }).length}
      </div>
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

        {/* Search and Filters */}
        <div className="audit-filters">
          <input
            type="text"
            placeholder="Search by user, action, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="audit-search"
          />
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="audit-filter"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATE_EMPLOYEE">Create Employee</option>
            <option value="EDIT_EMPLOYEE">Edit Employee</option>
            <option value="DELETE_EMPLOYEE">Delete Employee</option>
            <option value="CREATE_USER">Create User</option>
            <option value="UPDATE_USER_STATUS">Update User Status</option>
            <option value="UPDATE_USER_ROLE">Update User Role</option>
            <option value="CREATE_ROLE">Create Role</option>
            <option value="EDIT_ROLE">Edit Role</option>
            <option value="DELETE_ROLE">Delete Role</option>
            <option value="UPDATE_PERMISSIONS">Update Permissions</option>
            <option value="UPDATE_SETTINGS">Update Settings</option>
            <option value="SEND_BIRTHDAY_EMAILS">Send Birthday Emails</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="audit-date"
            placeholder="From Date"
          />
          
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="audit-date"
            placeholder="To Date"
          />

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="audit-page-size"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>Loading audit logs...</div>
        ) : (
          <>
            <div className="audit-table-responsive">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: 40 }}>
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.user_email || 'System'}</td>
                        <td>
                          <span className={`action-badge action-${log.action?.toLowerCase()}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="audit-pagination">
              <div>Total: {totalCount} records</div>
              <div className="audit-pagination-buttons">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}