import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import './Roles.css'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [formData, setFormData] = useState({ role_name: '' })
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRoleName, setSelectedRoleName] = useState('')
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())
  // Load dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
    }
    loadPermissions()
    fetchAllData()
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


async function loadPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  // Load all data on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
  
    
    // Fetch roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('id')
    
    if (rolesError) {
      console.error('Roles error:', rolesError)
    } else {
      setRoles(rolesData || [])
    }
    
    // Fetch permissions
    const { data: permissionsData, error: permError } = await supabase
      .from('permissions')
      .select('*')
      .order('id')
    
    if (permError) {
      console.error('Permissions error:', permError)
    } else {
      setPermissions(permissionsData || [])
    }
    
    // Fetch role_permissions
    const { data: rolePermData, error: rpError } = await supabase
      .from('role_permissions')
      .select('*')
    
    if (rpError) {
      console.error('Role permissions error:', rpError)
    } else {
      const mapping = {}
      if (rolePermData) {
        rolePermData.forEach(rp => {
          if (!mapping[rp.role_id]) mapping[rp.role_id] = []
          mapping[rp.role_id].push(rp.permission_id)
        })
      }
      setRolePermissions(mapping)
    }
    
    setLoading(false)
  }

  async function handleCreateRole(e) {
    e.preventDefault()
    if (!formData.role_name.trim()) {
      alert('Please enter a role name')
      return
    }
    
    setSaving(true)
    
    const { error } = await supabase
      .from('roles')
      .insert([{ role_name: formData.role_name.trim() }])
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Role created successfully')
      await addAuditLog('CREATE_ROLE', `Created role: ${formData.role_name.trim()}`)
      setShowForm(false)
      setFormData({ role_name: '' })
      fetchAllData()
    }
    setSaving(false)
  }

  async function handleUpdateRole(e) {
    e.preventDefault()
    if (!formData.role_name.trim()) {
      alert('Please enter a role name')
      return
    }
    
    setSaving(true)
    
    const { error } = await supabase
      .from('roles')
      .update({ role_name: formData.role_name.trim() })
      .eq('id', editingRole.id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Role updated successfully')
      await addAuditLog('CREATE_ROLE', `Created role: ${formData.role_name.trim()}`)
      setShowForm(false)
      setEditingRole(null)
      setFormData({ role_name: '' })
      fetchAllData()
    }
    setSaving(false)
  }

  async function handleDeleteRole(roleId, roleName) {
    if (roleName === 'Super Administrator') {
      alert('Cannot delete Super Administrator role')
      return
    }
    
    if (window.confirm(`Delete role "${roleName}"? This will affect users with this role.`)) {
      setSaving(true)
      
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
      
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)
      
      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Role deleted successfully')
        await addAuditLog('DELETE_ROLE', `Deleted role: ${roleName}`)
        fetchAllData()
      }
      setSaving(false)
    }
  }

  async function togglePermission(permissionId, roleId, currentlyHas) {
    setSaving(true)
    
    if (currentlyHas) {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)
      
      if (error) {
        alert('Error removing permission: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{ role_id: roleId, permission_id: permissionId }])
      
      if (error) {
        alert('Error adding permission: ' + error.message)
      }
    }
    await addAuditLog('UPDATE_PERMISSIONS', `Updated permissions for role: ${roles.find(r => r.id === roleId)?.role_name}`)
    await fetchAllData()
    setSaving(false)
  }

  function openPermissionModal(roleId, roleName) {
    setSelectedRoleId(roleId)
    setSelectedRoleName(roleName)
    setShowPermissionModal(true)
  }

  if (loading && roles.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
        fontSize: '18px'
      }}>
        Loading Role Management...
      </div>
    )
  }


  return (
    <div className={darkMode ? 'roles-container-dark' : 'roles-container-light'}>
      <div className="roles-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>🔑 Role & Permission Management</h1>
            <p>Create, edit, and manage roles and their permissions</p>
          </div>
          <button 
            onClick={() => {
              setEditingRole(null)
              setFormData({ role_name: '' })
              setShowForm(true)
            }}
            className="add-role-btn"
            disabled={saving}
          >
            + Create New Role
          </button>
        </div>

        <div style={{ fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
          Permissions loaded: {permissions.length} | Roles loaded: {roles.length}
        </div>

        {/* Stats Cards - Colorful */}
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon">🔑</div>
    <div className="stat-info">
      <h4>Total Roles</h4>
      <div className="stat-number">{roles.length}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">📋</div>
    <div className="stat-info">
      <h4>Permissions</h4>
      <div className="stat-number">{permissions.length}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">✅</div>
    <div className="stat-info">
      <h4>Active Roles</h4>
      <div className="stat-number">{roles.length}</div>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon">👥</div>
    <div className="stat-info">
      <h4>Users Assigned</h4>
      <div className="stat-number">-</div>
    </div>
  </div>
</div>

{/* Time Card */}
<div className="time-card-container">
  <div className="time-card">
    <div className="time-icon">🕐</div>
    <div className="time-text">
      <div className="time-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div className="time-clock">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    </div>
  </div>
</div>

        <div className="roles-table-responsive">
          <table className="roles-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td style={{ fontWeight: 600 }}>{role.role_name}</td>
                  <td>
                    <button 
                      onClick={() => openPermissionModal(role.id, role.role_name)}
                      className="manage-perm-btn"
                    >
                      Manage Permissions ({rolePermissions[role.id]?.length || 0})
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => {
                        setEditingRole(role)
                        setFormData({ role_name: role.role_name })
                        setShowForm(true)
                      }}
                      className="edit-role-btn"
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteRole(role.id, role.role_name)}
                      className="delete-role-btn"
                      disabled={role.role_name === 'Super Administrator' || saving}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permission Modal */}
        {showPermissionModal && (
          <div className="perm-modal-overlay" onClick={() => setShowPermissionModal(false)}>
            <div className="perm-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Manage Permissions: {selectedRoleName}</h2>
              
              {permissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
                  No permissions found in database. 
                  <br />
                  <small>Permissions array length: {permissions.length}</small>
                </div>
              ) : (
                <div className="permissions-list">
                  {permissions.map((perm) => {
                    const hasPermission = rolePermissions[selectedRoleId]?.includes(perm.id) || false
                    return (
                      <label key={perm.id} className="permission-item">
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={() => togglePermission(perm.id, selectedRoleId, hasPermission)}
                          disabled={saving}
                        />
                        <span>{perm.permission_name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              
              <button onClick={() => setShowPermissionModal(false)} className="perm-close-btn" disabled={saving}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Role Modal */}
        {showForm && (
          <div className="role-modal-overlay" onClick={() => setShowForm(false)}>
            <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
              <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole}>
                <input
                  type="text"
                  placeholder="Role Name (e.g., Department Manager)"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  required
                  className="role-modal-input"
                  disabled={saving}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" className="role-save-btn" disabled={saving}>
                    {saving ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="role-cancel-btn" disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}