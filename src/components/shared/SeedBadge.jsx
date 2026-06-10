import { cn } from '@/lib/utils'
import { seedLabel } from '@/lib/domain'

export default function SeedBadge({ amount, className, showLabel = true, size = 'sm' }) {
  const label = seedLabel()
  const sizes = { sm: 'text-xs px-2.5 py-0.5', md: 'text-sm px-3 py-1' }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-seed-100 font-semibold text-seed-700 dark:bg-seed-900/40 dark:text-seed-300',
        sizes[size],
        className
      )}
    >
      🌱 {amount}
      {showLabel && <span className="font-medium">{amount === 1 ? label.replace(/s$/, '') : label}</span>}
    </span>
  )
}
