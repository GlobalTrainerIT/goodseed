import { Sprout } from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useTheme, toggleTheme } from '@/lib/theme'
import { Moon, Sun } from 'lucide-react'

export default function MobileHeader() {
  const theme = useTheme()
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-seed-600 text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">GoodSeed</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationBell />
      </div>
    </header>
  )
}
