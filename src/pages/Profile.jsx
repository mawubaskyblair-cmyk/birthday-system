import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Edit2, Save, X, Camera, Mail, Phone, Briefcase, User, Lock, Shield, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: ''
  })

  useEffect(() => {
    loadProfile()
  }, [authUser])

  async function loadProfile() {
    setLoading(true)
    setUser(authUser)

    if (authUser) {
      // Get user profile data
      const { data } = await supabase
        .from('users')
        .select('username, phone, role_id, avatar_url')
        .eq('id', authUser.id)
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
        username: data?.username || authUser.email?.split('@')[0] || '',
        email: authUser.email || '',
        phone: data?.phone || '',
        role: roleName
      })
      
      setAvatarUrl(data?.avatar_url || null)
    }
    setLoading(false)
  }

  // Upload avatar image
  async function uploadAvatar(event) {
    try {
      setUploading(true)
      const file = event.target.files[0]
      
      if (!file) return
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed')
        return
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', authUser.id)
      
      if (updateError) throw updateError
      
      setAvatarUrl(publicUrl)
      await addAuditLog('UPDATE_PROFILE', `Updated profile picture`)
      toast.success('Profile picture updated!')
      
    } catch (error) {
      toast.error('Error uploading image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }
  
  // Delete avatar image
  async function deleteAvatar() {
    if (!avatarUrl) return
    
    const confirm = window.confirm('Are you sure you want to remove your profile picture?')
    if (!confirm) return
    
    try {
      setUploading(true)
      
      // Extract file path from URL
      const urlParts = avatarUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `avatars/${fileName}`
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath])
      
      if (deleteError) console.error('Storage delete error:', deleteError)
      
      // Update user profile - remove avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', authUser.id)
      
      if (updateError) throw updateError
      
      setAvatarUrl(null)
      await addAuditLog('UPDATE_PROFILE', `Removed profile picture`)
      toast.success('Profile picture removed!')
      
    } catch (error) {
      toast.error('Error removing image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setSaving(true)
    
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
      await addAuditLog('CHANGE_PASSWORD', 'Password changed')
      toast.success('Password changed successfully')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading profile...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 mb-6"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            border: `1px solid var(--border)`,
            color: 'var(--text-primary)'
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile Card */}
        <div 
          className="rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)'
          }}
        >
          
          {/* Cover/Banner Area */}
          <div 
            className="relative h-32"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
          >
            {/* Avatar - Centered on banner */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover shadow-xl border-4"
                    style={{ borderColor: 'var(--bg-secondary)' }}
                  />
                ) : (
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-xl border-4"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      borderColor: 'var(--bg-secondary)'
                    }}
                  >
                    {formData.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                
                {/* Upload Button */}
                <label 
                  className="absolute bottom-0 right-0 p-1.5 rounded-full shadow-md transition-all hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  title="Upload profile picture"
                >
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                
                {/* Delete Button - Only shows if avatar exists */}
                {avatarUrl && (
                  <button
                    onClick={deleteAvatar}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full shadow-md transition-all hover:scale-110 bg-red-500 text-white"
                    title="Remove profile picture"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 pb-8 px-6">
            
            {/* Upload Status */}
            {uploading && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  <div className="w-3 h-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                  Uploading...
                </div>
              </div>
            )}
            
            {/* Edit Button */}
            <div className="flex justify-end mb-4">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)'
                  }}
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
              )}
            </div>

            {/* Username Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formData.username}
              </h1>
              <span 
                className="inline-block px-3 py-1 text-xs font-medium rounded-full mt-2"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981'
                }}
              >
                {formData.role}
              </span>
            </div>

            {/* Edit Form */}
            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                {/* Username Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <User size={14} /> Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                </div>
                
                {/* Email Field (Read Only) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <Mail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl text-sm opacity-70 cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)'
                    }}
                  />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email cannot be changed</p>
                </div>
                
                {/* Phone Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <Phone size={14} /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="Enter your phone number"
                  />
                </div>
                
                {/* Role Field (Read Only) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <Briefcase size={14} /> Role
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium opacity-70 cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: '#10b981'
                    }}
                  />
                </div>
                
                {/* Form Buttons */}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white'
                    }}
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditing(false)} 
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode */
              <div className="space-y-5">
                {/* Email */}
                <div className="flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                    <Mail size={18} style={{ color: '#10b981' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email Address</p>
                    <p className="text-base font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{formData.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                    <Phone size={18} style={{ color: '#10b981' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Phone Number</p>
                    <p className="text-base font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {formData.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                    <Shield size={18} style={{ color: '#10b981' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Role</p>
                    <p className="text-base font-medium mt-0.5" style={{ color: '#10b981' }}>{formData.role}</p>
                  </div>
                </div>

                {/* Change Password Link */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="flex items-center gap-2 text-sm font-medium transition-all hover:gap-3"
                    style={{ color: '#10b981' }}
                  >
                    <Lock size={16} />
                    Change Password
                    <span className="text-xs opacity-70">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            🔒 Your information is securely stored and encrypted
          </p>
        </div>
      </div>
    </Layout>
  )
}