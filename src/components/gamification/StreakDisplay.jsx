import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StreakDisplay({ current = 0, longest = 0, size = 'md', className }) {
  const big = size === 'lg'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white shadow',
          big ? 'h-14 w-14' : 'h-10 w-10'
        )}
      >
        <Flame className={big ? 'h-7 w-7' : 'h-5 w-5'} />
      </div>
      <div>
        <p className={cn('font-extrabold leading-none text-gray-900 dark:text-gray-100', big ? 'text-2xl' : 'text-lg')}>
          {current} day{current === 1 ? '' : 's'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Best: {longest} days 🔥</p>
      </div>
    </div>
  )
}
