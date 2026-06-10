import { cn } from '@/lib/utils'
import { initials } from '@/lib/utils'

const sizeMap = {
  xs: 'h-7 w-7 text-sm',
  sm: 'h-9 w-9 text-base',
  md: 'h-11 w-11 text-xl',
  lg: 'h-16 w-16 text-3xl',
  xl: 'h-24 w-24 text-5xl',
}

export default function Avatar({ user, size = 'md', className, ring }) {
  const bg = user?.avatar_bg_color || '#dcfce7'
  const emoji = user?.avatar_emoji
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full font-bold text-gray-700 select-none',
        sizeMap[size],
        ring && 'ring-2 ring-white dark:ring-gray-900 ring-offset-2 ring-offset-seed-100',
        className
      )}
      style={{ backgroundColor: bg }}
      title={user?.full_name}
    >
      {emoji || initials(user?.full_name || '?')}
    </div>
  )
}
