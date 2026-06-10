import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function BottomTabBar({ tabs }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-seed-600 dark:text-seed-400' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-seed-100 dark:bg-seed-900/40'
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                </span>
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
