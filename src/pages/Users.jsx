import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Plus, Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [softLoading, setSoftLoading] = useState(false) // Optional: small indicator only

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    role_id: '',
    status: 'active'
  })

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Initialize: load permissions and roles
  useEffect(() => {
    async function initialize() {
      try {
        await Promise.all([
          loadUserPermissions(),
          fetchRoles()
        ])
      } catch (error) {
        console.error('Initialization error:', error)
        toast.error('Failed to initialize page')
      }
    }
    initialize()
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, roleFilter, statusFilter])

  // Fetch users - NON-BLOCKING, NO LOADING SCREEN
  useEffect(() => {
    if (userPermissions.includes('Manage Users')) {
      fetchUsers()
    }
  }, [debouncedSearch, roleFilter, statusFilter, currentPage, pageSize, userPermissions])

  async function loadUserPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  async function fetchRoles() {
    const { data, error } = await supabase.from('roles').select('*').order('id')
    if (error) {
      console.error('Error fetching roles:', error)
      toast.error('Failed to load roles')
    }
    if (data) setRoles(data)
  }

  // NON-BLOCKING fetch - table stays visible
  async function fetchUsers() {
    try {
      setSoftLoading(true) // Optional small indicator

      let query = supabase
        .from('users')
        .select(
          `
          id,
          username,
          email,
          role_id,
          status,
          created_at,
          roles(id, role_name)
        `,
          { count: 'exact' }
        )

      if (debouncedSearch) {
        query = query.or(
          `username.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        )
      }

      if (roleFilter) {
        query = query.eq('role_id', roleFilter)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      setUsers(data || [])
      setTotalCount(count || 0)

    } catch (error) {
      console.error('Fetch users error:', error)
      toast.error('Failed to load users')
    } finally {
      setSoftLoading(false)
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { username: formData.username } }
    })

    if (authError) {
      toast.error(authError.message)
      return
    }

    if (!authData.user) {
      toast.error('User creation failed')
      return
    }

    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        username: formData.username,
        email: formData.email,
        role_id: parseInt(formData.role_id),
        status: formData.status
      }])

    if (userError) {
      toast.error(userError.message)
    } else {
      toast.success('User created successfully')
      await addAuditLog('CREATE_USER', `Created user: ${formData.username} (${formData.email})`)
      setShowForm(false)
      setFormData({ email: '', password: '', username: '', role_id: '', status: 'active' })
      fetchUsers() // Silent refresh
    }
  }

  async function handleUpdateStatus(userId, currentStatus, username) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', userId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      await addAuditLog('UPDATE_USER_STATUS', `${newStatus === 'active' ? 'Activated' : 'Deactivated'} user: ${username}`)
      fetchUsers() // Silent refresh
    }
  }

  async function handleUpdateRole(userId, newRoleId, username) {
    const { error } = await supabase
      .from('users')
      .update({ role_id: parseInt(newRoleId) })
      .eq('id', userId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Role updated successfully')
      await addAuditLog('UPDATE_USER_ROLE', `Changed role for user: ${username}`)
      fetchUsers() // Silent refresh
    }
  }

  function exportToExcel() {
    const exportData = users.map(user => ({
      'Username': user.username,
      'Email': user.email,
      'Role': user.roles?.role_name || '',
      'Status': user.status,
      'Created At': user.created_at ? new Date(user.created_at).toLocaleDateString() : ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, `users_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel file downloaded')
  }

  function exportToPDF() {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(16)
    doc.text('User List', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
    
    const tableData = users.map(user => [
      user.username,
      user.email,
      user.roles?.role_name || '',
      user.status,
      user.created_at ? new Date(user.created_at).toLocaleDateString() : ''
    ])

    autoTable(doc, {
      head: [['Username', 'Email', 'Role', 'Status', 'Created']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 10, right: 10 }
    })

    doc.save(`users_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF file downloaded')
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  // Permission check
  if (!userPermissions.includes('Manage Users') && userPermissions.length > 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-500 mt-2">No permission to manage users</p>
        </div>
      </Layout>
    )
  }

  // TABLE ALWAYS RENDERS - NO BLOCKING LOADING SCREEN
  return (
    <Layout>
      <div className="space-y-5">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition" 
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>👤 User Management</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage system users and roles</p>
          </div>
        </div>

        {/* Optional Soft Loading Indicator - NON BLOCKING */}
        {softLoading && (
          <div className="text-xs text-amber-500 mb-2 flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
            Updating users...
          </div>
        )}

        {/* Search, Filters, Export Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          <input 
            type="text" 
            placeholder="Search by username or email..." 
            value={search} 
            autoComplete="off"
            onChange={(e) => setSearch(e.target.value)} 
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm" 
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
          />
          
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            className="px-3 py-2 rounded-lg text-sm" 
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value="">All Roles</option>
            {roles.map(role => <option key={role.id} value={role.id}>{role.role_name}</option>)}
          </select>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="px-3 py-2 rounded-lg text-sm" 
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))} 
            className="px-3 py-2 rounded-lg text-sm" 
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: '#10b981', border: 'none', color: 'white' }}
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>

          <button
            onClick={exportToPDF}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: '#ef4444', border: 'none', color: 'white' }}
          >
            <FileText size={16} />
            PDF
          </button>

          <button 
            onClick={() => setShowForm(true)} 
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Add User
          </button>
        </div>

        {/* Users Table - ALWAYS RENDERED, NEVER HIDDEN */}
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Username</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Email</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Role</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Created</th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{user.username}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td className="py-2 px-3">
                      <select 
                        value={user.role_id || ''} 
                        onChange={(e) => handleUpdateRole(user.id, e.target.value, user.username)} 
                        className="px-2 py-1 rounded text-sm" 
                        style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => <option key={role.id} value={role.id}>{role.role_name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button 
                        onClick={() => handleUpdateStatus(user.id, user.status, user.username)} 
                        className={`px-2 py-1 text-xs rounded-md ${user.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total: {totalCount} users</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1} 
                className="p-2 rounded-md border disabled:opacity-50" 
                style={{ borderColor: 'var(--border)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="p-2 rounded-md border disabled:opacity-50" 
                style={{ borderColor: 'var(--border)' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg text-sm" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
                  required 
                />
                <input 
                  type="password" 
                  placeholder="Password *" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg text-sm" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Username *" 
                  value={formData.username} 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg text-sm" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
                  required 
                />
                <select 
                  value={formData.role_id} 
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg text-sm" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} 
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.role_name}</option>)}
                </select>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                  className="w-full px-3 py-2 rounded-lg text-sm" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg transition">Create User</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg transition" style={{ border: `1px solid var(--border)`, color: 'var(--text-primary)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}