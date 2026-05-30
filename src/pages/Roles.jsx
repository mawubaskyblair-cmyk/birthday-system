import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Plus, Edit2, Trash2, KeyRound } from 'lucide-react'

export default function Roles() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [formData, setFormData] = useState({ role_name: '' })
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRoleName, setSelectedRoleName] = useState('')
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])

  useEffect(() => {
    loadUserPermissions()
    fetchAllData()
  }, [])

  async function loadUserPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  async function fetchAllData() {
    setLoading(true)
    
    // Fetch roles
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .order('id')
    setRoles(rolesData || [])
    
    // Fetch permissions
    const { data: permissionsData } = await supabase
      .from('permissions')
      .select('*')
      .order('id')
    setPermissions(permissionsData || [])
    
    // Fetch role_permissions
    const { data: rolePermData } = await supabase
      .from('role_permissions')
      .select('*')
    
    const mapping = {}
    if (rolePermData) {
      rolePermData.forEach(rp => {
        if (!mapping[rp.role_id]) mapping[rp.role_id] = []
        mapping[rp.role_id].push(rp.permission_id)
      })
    }
    setRolePermissions(mapping)
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
      await addAuditLog('EDIT_ROLE', `Updated role: ${formData.role_name.trim()}`)
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
    
    if (window.confirm(`Delete role "${roleName}"?`)) {
      setSaving(true)
      await supabase.from('role_permissions').delete().eq('role_id', roleId)
      const { error } = await supabase.from('roles').delete().eq('id', roleId)
      
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
      await supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', permissionId)
    } else {
      await supabase.from('role_permissions').insert([{ role_id: roleId, permission_id: permissionId }])
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

  if (!userPermissions.includes('Manage Roles') && userPermissions.length > 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-500 mt-2">No permission to manage roles</p>
        </div>
      </Layout>
    )
  }

  if (loading && roles.length === 0) {
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
        <div className="flex flex-wrap justify-between items-center gap-3">
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
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🔑 Role & Permission Management</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Create, edit, and manage roles and permissions</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingRole(null)
              setFormData({ role_name: '' })
              setShowForm(true)
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Create New Role
          </button>
        </div>

        {/* Roles Table */}
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Role Name</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Permissions</th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {role.role_name}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => openPermissionModal(role.id, role.role_name)}
                      className="px-3 py-1 text-xs rounded-md transition"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        border: `1px solid var(--border)`,
                        color: 'var(--text-primary)'
                      }}
                    >
                      Manage ({rolePermissions[role.id]?.length || 0})
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRole(role)
                          setFormData({ role_name: role.role_name })
                          setShowForm(true)
                        }}
                        className="text-blue-500 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id, role.role_name)}
                        disabled={role.role_name === 'Super Administrator'}
                        className={`text-red-500 hover:text-red-600 ${role.role_name === 'Super Administrator' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permission Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Manage Permissions: {selectedRoleName}</h2>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {permissions.map((perm) => {
                  const hasPermission = rolePermissions[selectedRoleId]?.includes(perm.id) || false
                  return (
                    <label
                      key={perm.id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={hasPermission}
                        onChange={() => togglePermission(perm.id, selectedRoleId, hasPermission)}
                        disabled={saving}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm">{perm.permission_name}</span>
                    </label>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: `1px solid var(--border)`,
                    color: 'var(--text-primary)'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Role Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl w-full max-w-md p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole}>
                <input
                  type="text"
                  placeholder="Role Name (e.g., Department Manager)"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm mb-4"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: `1px solid var(--border)`,
                    color: 'var(--text-primary)'
                  }}
                  required
                  disabled={saving}
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition"
                    style={{ 
                      border: `1px solid var(--border)`,
                      color: 'var(--text-primary)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}