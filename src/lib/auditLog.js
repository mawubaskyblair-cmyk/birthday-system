import { supabase } from './supabase'
import { getSessionUser } from './auth'

export async function addAuditLog(action, description) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return
    }

    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: user.id,
        user_email: user.email,
        action: action,
        description: description,
        ip_address: 'web',
      },
    ])

    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (err) {
    console.error('Failed to add audit log:', err)
  }
}
