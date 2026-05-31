import { supabase } from './supabase'
import { getSessionUser } from './auth'

let cachedUserRole = null
let cachedUserPermissions = null

export function clearPermissionsCache() {
  cachedUserRole = null
  cachedUserPermissions = null
}

export async function getCurrentUserPermissions() {
  if (cachedUserPermissions) {
    return { role: cachedUserRole, permissions: cachedUserPermissions }
  }

  const user = await getSessionUser()

  if (!user) {
    return { role: null, permissions: [] }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', user.id)
    .single()

  if (userData) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', userData.role_id)
      .single()

    cachedUserRole = roleData?.role_name

    const { data: permData } = await supabase
      .from('role_permissions')
      .select('permissions(permission_name)')
      .eq('role_id', userData.role_id)

    if (permData) {
      cachedUserPermissions = permData.map((p) => p.permissions.permission_name)
    } else {
      cachedUserPermissions = []
    }
  }

  return { role: cachedUserRole, permissions: cachedUserPermissions }
}
