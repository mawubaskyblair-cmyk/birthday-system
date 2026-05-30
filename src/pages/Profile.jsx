import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('username, phone, role_id')
        .eq('id', user.id)
        .single()
      
      let roleName = 'Employee'
      if (data?.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', data.role_id)
          .single()
        roleName = roleData?.role_name || 'Employee'
      }
      
      setFormData({
        username: data?.username || user.email.split('@')[0],
        email: user.email || '',
        phone: data?.phone || '',
        role: roleName
      })
    }
    setLoading(false)
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setSaving(true)
    
    const oldUsername = formData.username
    const newUsername = formData.username
    
    const { error } = await supabase
      .from('users')
      .update({ 
        username: formData.username,
        phone: formData.phone 
      })
      .eq('id', user?.id)
    
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      // ADD AUDIT LOG FOR PROFILE UPDATE
      await addAuditLog('UPDATE_PROFILE', `Updated profile: username changed to ${formData.username}`)
      toast.success('Profile updated successfully')
      setEditing(false)
      loadProfile()
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    const newPassword = prompt('Enter new password (min 8 characters):')
    if (!newPassword) return
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      // ADD AUDIT LOG FOR PASSWORD CHANGE
      await addAuditLog('CHANGE_PASSWORD', 'Password changed')
      toast.success('Password changed successfully')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 mb-4 text-gray-600 hover:text-gray-800 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-lg shadow border p-6">
          
          <div className="flex justify-between items-center mb-5 pb-2 border-b">
            <h1 className="text-xl font-semibold text-gray-800">My Profile</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-amber-500 hover:text-amber-600 text-sm"
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdateProfile}>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="mb-5">
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <input
                  type="text"
                  value={formData.role}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-amber-600 font-medium cursor-not-allowed"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50"
                >
                  <Save size={14} className="inline mr-1" /> Save
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditing(false)} 
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  <X size={14} className="inline mr-1" /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="mb-4 pb-2">
                <p className="text-xs text-gray-400">Username</p>
                <p className="text-base font-medium text-gray-800">{formData.username}</p>
              </div>
              
              <div className="mb-4 pb-2">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-base text-gray-700">{formData.email}</p>
              </div>
              
              {formData.phone && (
                <div className="mb-4 pb-2">
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="text-base text-gray-700">{formData.phone}</p>
                </div>
              )}
              
              <div className="mb-5 pb-2">
                <p className="text-xs text-gray-400">Role</p>
                <p className="text-base font-medium text-amber-600">{formData.role}</p>
              </div>
              
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="text-amber-500 hover:text-amber-600 text-sm font-medium"
              >
                Change Password →
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}