import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Users.css'
import { addAuditLog } from '../lib/auditLog'
import { getCurrentUserPermissions } from '../lib/permissions'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [roles, setRoles] = useState([])
  const [userPermissions, setUserPermissions] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Form state for new user
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    role_id: '',
    status: 'active'
  })

  // Search, filter, pagination
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Load dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
    }
    loadPermissions()
    fetchRoles()

  }, [])

// Update time every second
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)
  return () => clearInterval(timer)
}, [])

// Format time function
const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}


  async function fetchRoles() {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .order('id')
    
    if (data) {
      setRoles(data)
    }
  }


  async function loadPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }
  useEffect(() => {
    if (userPermissions.includes('Manage Users')) {
      fetchUsers()
    }
  }, [search, roleFilter, statusFilter, currentPage, pageSize, userPermissions])

  // Load roles
  useEffect(() => {
    async function fetchRoles() {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('id')
      
      if (error) {
        console.error('Error fetching roles:', error)
      } else {
        setRoles(data || [])
      }
    }
    
    fetchRoles()
  }, [])

  // Load users
  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter, statusFilter, currentPage, pageSize])

  async function fetchUsers() {
    setLoading(true)
    
    let query = supabase
      .from('users')
      .select('*, roles(id, role_name)', { count: 'exact' })

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (roleFilter) {
      query = query.eq('role_id', roleFilter)
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const from = (currentPage - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  // FIXED: Create user using regular signUp (not admin.createUser)
  async function handleCreateUser(e) {
    e.preventDefault()
    setLoading(true)

    // Step 1: Create Auth user using regular signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username
        }
      }
    })

    if (authError) {
      alert('Auth Error: ' + authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      alert('User creation failed. Please check Supabase settings.')
      setLoading(false)
      return
    }

    // Step 2: Add to users table
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
      alert('User Error: ' + userError.message)
    } else {
      alert('User created successfully!')
      await addAuditLog('CREATE_USER', `Created user: ${formData.username} (${formData.email})`)
      setShowForm(false)
      setFormData({ email: '', password: '', username: '', role_id: '', status: 'active' })
      fetchUsers()
    }
    setLoading(false)
  }

  async function handleUpdateStatus(userId, currentStatus, username) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', userId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      await addAuditLog('UPDATE_USER_STATUS', `${newStatus === 'active' ? 'Activated' : 'Deactivated'} user: ${username}`)
      fetchUsers()
    }
  }

  async function handleUpdateRole(userId, newRoleId, username) {
    const { error } = await supabase
      .from('users')
      .update({ role_id: parseInt(newRoleId) })
      .eq('id', userId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Role updated successfully')
      await addAuditLog('UPDATE_USER_ROLE', `Changed role for user: ${username}`)
      fetchUsers()
    }
  }

  if (!userPermissions.includes('Manage Users') && userPermissions.length > 0) {
    return (
      <div className={darkMode ? 'users-container-dark' : 'users-container-light'}>
        <div className="users-box" style={{ textAlign: 'center', padding: 50 }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to manage users.</p>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className={darkMode ? 'users-container-dark' : 'users-container-light'}>
      <div className="users-box">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>👤 User Management</h1>
            <p>Manage system users and their roles</p>
          </div>
          <button onClick={() => setShowForm(true)} className="add-user-btn">
            + Add User
          </button>
        </div>

        {/* Stats Cards - Colorful */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h4>Total Users</h4>
              <div className="stat-number">{totalCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h4>Active Users</h4>
              <div className="stat-number">{users.filter(u => u.status === 'active').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⛔</div>
            <div className="stat-info">
              <h4>Inactive Users</h4>
              <div className="stat-number">{users.filter(u => u.status === 'inactive').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔑</div>
            <div className="stat-info">
              <h4>Total Roles</h4>
              <div className="stat-number">{roles.length}</div>
            </div>
          </div>
        </div>

        {/* Time Card */}
        <div className="time-card-container">
          <div className="time-card">
            <div className="time-icon"></div>
            <div className="time-text">
              <div className="time-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="time-clock">{formatTime(currentTime)}</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="user-search-input"
            style={{ flex: 2, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="user-filter-select"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.role_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="user-filter-select"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="user-page-select"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>Loading...</div>
        ) : (
          <>
            <div className="user-table-responsive">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role_id || ''}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value, user.username)}
                          className="role-select"
                        >
                          <option value="">Select Role</option>
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.role_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={user.status === 'active' ? 'user-status-active' : 'user-status-inactive'}>
                          {user.status}
                        </span>
                      </td>
                      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                      <td>
                      <button 
                        onClick={() => handleUpdateStatus(user.id, user.status, user.username)}
                        className="toggle-status-btn"
                      >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <div>Total: {totalCount} users</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="user-page-btn"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="user-page-btn"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Form for Adding User */}
      {showForm && (
        <div className="user-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="user-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New System User</h2>
            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gap: 15 }}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="user-modal-input"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password *"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="user-modal-input"
                />
                <input
                  type="text"
                  name="username"
                  placeholder="Username *"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="user-modal-input"
                />
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  required
                  className="user-modal-select"
                >
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.role_name}</option>
                  ))}
                </select>
                <select
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="user-modal-select"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="user-save-btn">Create User</button>
                <button type="button" onClick={() => setShowForm(false)} className="user-cancel-btn">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}