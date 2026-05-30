import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarCollapse = (collapsed) => {
    setSidebarCollapsed(collapsed)
  }

  const sidebarWidth = sidebarOpen ? (sidebarCollapsed ? 'w-20' : 'w-64') : 'w-0'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className={`fixed left-0 top-0 h-full transition-all duration-300 z-50 ${sidebarWidth}`}>
        <Sidebar onCollapseChange={handleSidebarCollapse} />
      </div>

      <div className={`transition-all duration-300 ${sidebarOpen ? (sidebarCollapsed ? 'ml-20' : 'ml-64') : 'ml-0'}`}>
        <Header onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}