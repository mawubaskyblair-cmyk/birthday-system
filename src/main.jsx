import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { assertSecureSupabaseConfig } from './lib/security.js'

assertSecureSupabaseConfig()

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
