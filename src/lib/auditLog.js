import { supabase } from './supabase'

export async function addAuditLog(action, description) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('No user logged in')
      return
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: user.id,
        user_email: user.email,
        action: action,
        description: description,
        ip_address: 'web'
      }])

    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (err) {
    console.error('Failed to add audit log:', err)
  }
}