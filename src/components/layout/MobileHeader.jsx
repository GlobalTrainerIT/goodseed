import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sprout, Moon, Sun, MoreHorizontal, Rocket, BarChart3, Settings as SettingsIcon, User, LogOut, X } from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'
import SyncIndicator from './SyncIndicator'
import { useTheme, toggleTheme } from '@/lib/theme'
import { useCurrentUser } from '@/lib/hooks'
import { logout } from '@/lib/auth'

const PARENT_MORE = [
  { label: 'Missions', to: '/Missions', icon: Rocket },
  { label: 'Reports', to: '/Reports', icon: BarChart3 },
  { label: 'Edit Profile', to: '/ProfileSetup', icon: User },
  { label: 'Settings', to: '/Settings', icon: SettingsIcon },
]
const CHILD_MORE = [
  { label: 'Edit Profile', to: '/ProfileSetup', icon: User },
]

export default function MobileHeader() {
  const theme = useTheme()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const items = user?.role === 'child' ? CHILD_MORE : PARENT_MORE

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function go(to) {
    setOpen(false)
    navigate(to)
  }
  function signOut() {
    setOpen(false)
    logout()
    navigate('/Welcome')
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <Link to="/Dashboard" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-seed-600 text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">GoodSeed</span>
      </Link>
      <div className="flex items-center gap-1">
        <SyncIndicator />
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationBell />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="More menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          </button>
          {open && (
            <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg animate-fade-in dark:border-gray-800 dark:bg-gray-900">
              {items.map((item) => (
                <button
                  key={item.to}
                  onClick={() => go(item.to)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <item.icon className="h-4 w-4 text-gray-400" /> {item.label}
                </button>
              ))}
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
