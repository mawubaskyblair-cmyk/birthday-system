import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'
import { ChevronLeft, ChevronRight, Cake, Calendar, Gift, Sparkles, Heart, Star, PartyPopper } from 'lucide-react'

import slide1 from '../assets/slide1.jpg'
import slide2 from '../assets/slide2.jpg'
import slide3 from '../assets/slide3.jpg'

const slides = [slide1, slide2, slide3]

export default function Dashboard() {
  const { user } = useAuth()
  const [userName, setUserName] = useState('User')
  const [userRole, setUserRole] = useState('Employee')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [todayBirthdays, setTodayBirthdays] = useState([])
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([])
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    loadUser()
    loadBirthdays()

    const sliderInterval = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(sliderInterval)
  }, [user])

  async function loadUser() {
    try {
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

      setUserName(data?.username || user.email?.split('@')[0] || 'User')
      setUserRole(data?.role_id ? `Role ${data.role_id}` : 'Employee')
    } catch (error) {
      console.error('Dashboard error:', error)
    }
  }

  async function loadBirthdays() {
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()

    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')

    if (employees) {
      const todayBday = employees.filter(emp => {
        if (emp.date_of_birth) {
          const dob = new Date(emp.date_of_birth)
          return dob.getMonth() + 1 === month && dob.getDate() === day
        }
        return false
      })
      setTodayBirthdays(todayBday)

      const upcoming = employees.filter(emp => {
        if (emp.date_of_birth && !todayBday.includes(emp)) {
          const dob = new Date(emp.date_of_birth)
          const dobThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
          const diffDays = Math.ceil((dobThisYear - today) / (1000 * 60 * 60 * 24))
          return diffDays > 0 && diffDays <= 7
        }
        return false
      }).slice(0, 5)
      setUpcomingBirthdays(upcoming)
    }
  }

  const nextSlide = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
      setIsTransitioning(false)
    }, 300)
  }

  const prevSlide = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
      setIsTransitioning(false)
    }, 300)
  }

  const goToSlide = (index) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlide(index)
      setIsTransitioning(false)
    }, 300)
  }

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* HERO SECTION - Professional Slideshow */}
        <div className="relative group">
          <div className="relative h-[50vh] md:h-[55vh] overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={slides[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              className={`absolute h-full w-full object-cover transition-all duration-700 ease-in-out ${
                isTransitioning ? 'scale-105 opacity-90' : 'scale-100 opacity-100'
              }`}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    currentSlide === idx
                      ? 'w-8 h-2 bg-amber-500'
                      : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-sm mb-3">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Welcome Back</span>
                </div>
                <h1 
                  className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2"
                  style={{ 
                    color: 'white',
                    textShadow: '2px 2px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  Welcome back, {userName} 👋
                </h1>
                <p 
                  className="text-sm md:text-base text-white/90 mb-3 md:mb-4"
                  style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.3)' }}
                >
                  {userRole} • Let's make someone's day special 🎉
                </p>
                <button 
                  className="inline-flex items-center gap-2 rounded-xl px-4 md:px-5 py-2 md:py-2.5 text-sm md:text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{ 
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <Gift size={16} />
                  Birthday Engine
                  <Sparkles size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TWO BEAUTIFUL CARDS - NO BLUE, ONLY WARM COLORS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          {/* TODAY'S BIRTHDAYS CARD - Pink/Rose Gradient (NO BLUE) */}
          <div className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              boxShadow: '0 20px 35px -10px rgba(244, 63, 94, 0.4)'
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -ml-8 -mb-8"></div>
            
            <div className="relative p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <Cake size={20} className="text-white" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white">Today's Birthdays</h2>
                </div>
                <div className="text-right">
                  <div className="text-3xl md:text-4xl font-bold text-white">{todayBirthdays.length}</div>
                  <p className="text-xs text-white/70">Celebrating</p>
                </div>
              </div>

              {todayBirthdays.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
                    <Cake size={28} className="text-white/50" />
                  </div>
                  <p className="text-white/70 text-sm">No birthdays today</p>
                  <p className="text-white/40 text-xs mt-1">Check back tomorrow!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayBirthdays.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                        {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-white/60 text-xs">{emp.email}</p>
                      </div>
                      <div className="text-2xl">🎂</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs">🎉 Spread joy today</span>
                  <span className="text-white/60 text-xs">✨ Special day</span>
                </div>
              </div>
            </div>
          </div>

          {/* UPCOMING BIRTHDAYS CARD - Amber/Orange Gradient (NO BLUE) */}
          <div className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              boxShadow: '0 20px 35px -10px rgba(245, 158, 11, 0.4)'
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -ml-8 -mb-8"></div>
            
            <div className="relative p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <Calendar size={20} className="text-white" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white">Upcoming Birthdays</h2>
                </div>
                <div className="text-right">
                  <div className="text-3xl md:text-4xl font-bold text-white">{upcomingBirthdays.length}</div>
                  <p className="text-xs text-white/70">Next 7 days</p>
                </div>
              </div>

              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
                    <Calendar size={28} className="text-white/50" />
                  </div>
                  <p className="text-white/70 text-sm">No upcoming birthdays</p>
                  <p className="text-white/40 text-xs mt-1">Celebrations coming soon!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                        {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-white/60 text-xs">
                          {emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Date not set'}
                        </p>
                      </div>
                      <div className="text-xl">🎁</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs">📅 Mark your calendar</span>
                  <span className="text-white/60 text-xs">✨ Get ready to celebrate</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INSPIRATIONAL QUOTE SECTION */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20">
            <Heart size={14} className="text-amber-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400">Every birthday is a celebration of life</p>
            <Star size={14} className="text-amber-500" />
          </div>
        </div>
      </div>
    </Layout>
  )
}