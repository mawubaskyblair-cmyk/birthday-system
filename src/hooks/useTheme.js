import { useEffect, useState } from 'react'

export default function useTheme() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [systemPreference, setSystemPreference] = useState(null)

  // Check system preference (OS level)
  const getSystemPreference = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // Get saved theme or fallback to system preference
  const getInitialTheme = () => {
    // Check if theme was saved before
    const saved = localStorage.getItem('theme')
    
    if (saved === 'dark') return true
    if (saved === 'light') return false
    
    // Fallback to system preference
    return getSystemPreference()
  }

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      setSystemPreference(e.matches)
      
      // Only auto-switch if user hasn't manually set a preference
      const userPreference = localStorage.getItem('theme')
      if (!userPreference) {
        setDark(e.matches)
        if (e.matches) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Initialize theme on mount
  useEffect(() => {
    const isDark = getInitialTheme()
    setDark(isDark)
    setSystemPreference(getSystemPreference())
    
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    setMounted(true)
  }, [])

  // Smooth transition when theme changes
  const toggleTheme = () => {
    const newTheme = !dark
    setDark(newTheme)

    // Add smooth transition class
    document.documentElement.classList.add('theme-transition')
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 300)
  }

  // Apply theme to body as well (for better compatibility)
  useEffect(() => {
    if (mounted) {
      // Also set data-theme attribute for CSS compatibility
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      document.body.style.backgroundColor = dark ? '#1c1917' : '#fef9f1'
    }
  }, [dark, mounted])

  // Expose additional utilities
  const setLightMode = () => {
    if (dark) toggleTheme()
  }

  const setDarkMode = () => {
    if (!dark) toggleTheme()
  }

  const toggleWithAnimation = () => {
    // Create ripple effect on theme toggle
    const ripple = document.createElement('div')
    ripple.className = 'theme-ripple'
    document.body.appendChild(ripple)
    
    setTimeout(() => ripple.remove(), 500)
    toggleTheme()
  }

  return { 
    dark, 
    toggleTheme,
    setLightMode,
    setDarkMode,
    toggleWithAnimation,
    systemPreference,
    mounted
  }
}