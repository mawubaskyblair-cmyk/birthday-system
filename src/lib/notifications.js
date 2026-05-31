import { supabase } from './supabase'

export async function createNotification(userId, type, title, message, link = null) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: type,
        title: title,
        message: message,
        link: link,
        is_read: false,
        created_at: new Date().toISOString()
      }])
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

export async function notifyBirthday(userId, employeeName) {
  return createNotification(
    userId,
    'birthday',
    '🎂 Birthday Today!',
    `${employeeName} is celebrating their birthday today!`,
    '/birthday-engine'
  )
}

export async function notifyUserCreated(adminId, newUserName) {
  return createNotification(
    adminId,
    'user_created',
    '✅ User Created',
    `New user "${newUserName}" has been added to the system`,
    '/users'
  )
}

export async function notifyRoleChanged(userId, userName, newRole) {
  return createNotification(
    userId,
    'role_changed',
    '🔄 Role Updated',
    `Your role has been changed to ${newRole}`,
    '/profile'
  )
}

export async function notifyBirthdayEmailSent(userId, count) {
  return createNotification(
    userId,
    'success',
    '📧 Birthday Emails Sent',
    `${count} birthday ${count === 1 ? 'email was' : 'emails were'} sent successfully`,
    '/birthday-engine'
  )
}