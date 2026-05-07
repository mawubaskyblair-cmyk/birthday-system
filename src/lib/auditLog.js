import { supabase } from './supabase'

export async function addAuditLog(action, description) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return
    }

    await supabase
      .from('audit_logs')
      .insert([{
        user_id: user.id,
        user_email: user.email,
        action: action,
        description: description,
        ip_address: 'web'
      }])
  } catch (err) {
    // Silent fail - don't break the app for audit logs
  }
}