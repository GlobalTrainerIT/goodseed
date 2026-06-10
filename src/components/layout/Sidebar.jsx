import { NavLink, useNavigate } from 'react-router-dom'
import { Sprout, LogOut, Moon, Sun } from 'lucide-react'
import { PARENT_NAV } from './navConfig'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser } from '@/lib/hooks'
import { logout } from '@/lib/auth'
import { useTheme, toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const user = useCurrentUser()
  const theme = useTheme()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/Welcome')
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seed-600 text-white">
          <Sprout className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-extrabold leading-tight text-gray-900 dark:text-gray-100">GoodSeed</p>
          <p className="text-xs text-gray-400">Family Rewards</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {PARENT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-seed-100 text-seed-700 dark:bg-seed-900/40 dark:text-seed-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-3 dark:border-gray-800">
        <button
          onClick={toggleTheme}
          className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <Avatar user={user} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.full_name}</p>
            <p className="truncate text-xs capitalize text-gray-400">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-700" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
