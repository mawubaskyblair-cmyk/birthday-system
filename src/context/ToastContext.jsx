import toast from 'react-hot-toast'

export const showSuccess = (message) => {
  toast.success(message, {
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 20px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
  })
}

export const showError = (message) => {
  toast.error(message, {
    position: 'top-right',
    duration: 4000,
    style: {
      background: '#ef4444',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 20px',
    },
  })
}

export const showInfo = (message) => {
  toast(message, {
    position: 'top-right',
    duration: 3000,
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 20px',
    },
  })
}

export const showWarning = (message) => {
  toast(message, {
    position: 'top-right',
    duration: 3000,
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 20px',
    },
  })
}