import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check screen size on mount and resize
  useEffect(() => {
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  function checkScreenSize() {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)
    
    // Close mobile menu when switching to desktop
    if (!mobile && mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
  }

  const handleSidebarCollapse = (collapsed) => {
    setSidebarCollapsed(collapsed)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Calculate sidebar width for desktop
  const desktopSidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Container */}
      <div 
        className={`
          fixed left-0 top-0 h-full transition-all duration-300 z-50
          ${isMobile 
            ? `${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
            : desktopSidebarWidth
          }
        `}
      >
        <Sidebar 
          onCollapseChange={handleSidebarCollapse}
          isMobile={isMobile}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Overlay for mobile - closes sidebar when clicked */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-all duration-300 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div 
        className={`
          transition-all duration-300
          ${!isMobile 
            ? (sidebarCollapsed ? 'ml-20' : 'ml-64')
            : 'ml-0'
          }
        `}
      >
        <Header 
          onMenuClick={toggleMobileMenu} 
          sidebarOpen={mobileMenuOpen}
          isMobile={isMobile}
        />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}