import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'

import slide1 from '../assets/slide1.jpg'
import slide2 from '../assets/slide2.jpg'
import slide3 from '../assets/slide3.jpg'

const slides = [slide1, slide2, slide3]

export default function Dashboard() {
  const [userName, setUserName] = useState('User')
  const [userRole, setUserRole] = useState('Employee')
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    loadUser()

    const sliderInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(sliderInterval)
  }, [])

  async function loadUser() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('username, role_id')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('User load error:', error)
        return
      }

      setUserName(
        data?.username ||
        user.email?.split('@')[0] ||
        'User'
      )

      setUserRole(
        data?.role_id
          ? `Role ${data.role_id}`
          : 'Employee'
      )

    } catch (error) {
      console.error('Dashboard error:', error)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* HERO SECTION - IMAGE WITH SOFT OVERLAY TO MATCH APP THEME */}
        <div className="relative h-[50vh] overflow-hidden rounded-2xl shadow-xl">

          <img
            src={slides[currentSlide]}
            alt="Dashboard Banner"
            loading="lazy"
            decoding="async"
            className="absolute h-full w-full object-cover transition-all duration-700"
          />

          {/* SUBTLE OVERLAY TO BLEND WITH APP BACKGROUND - NOT BLOCKING IMAGE */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)'
            }}
          />

          {/* TEXT CONTENT */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="space-y-3">
              <h1 
                className="text-3xl font-bold"
                style={{ 
                  color: 'white',
                  textShadow: '2px 2px 8px rgba(0,0,0,0.5)'
                }}
              >
                Welcome back, {userName} 👋
              </h1>

              <p 
                className="text-white/90"
                style={{ 
                  textShadow: '1px 1px 4px rgba(0,0,0,0.5)'
                }}
              >
                {userRole} • Let's make someone's day special 🎉
              </p>

              <button 
                className="rounded-lg px-4 py-2 font-medium transition hover:scale-105 hover:opacity-90"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: `1px solid var(--border)`,
                  color: 'var(--text-primary)'
                }}
              >
                🎂 Birthday Engine
              </button>
            </div>
          </div>
        </div>

        {/* STATS SECTION */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* TODAY BIRTHDAYS */}
          <div
            className="rounded-xl p-5 shadow"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            <h2
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              🎂 Today's Birthdays
            </h2>

            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              No birthdays today.
            </p>
          </div>

          {/* UPCOMING BIRTHDAYS */}
          <div
            className="rounded-xl p-5 shadow"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            <h2
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              📅 Upcoming Birthdays
            </h2>

            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              3 birthdays coming this week.
            </p>
          </div>

        </div>

      </div>
    </Layout>
  )
}