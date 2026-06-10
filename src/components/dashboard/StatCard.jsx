import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TONES = {
  green: 'bg-seed-100 text-seed-700 dark:bg-seed-900/40 dark:text-seed-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

export default function StatCard({ label, value, icon: Icon, tone = 'green', to, highlight }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => to && navigate(to)}
      className={cn(
        'flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition dark:border-gray-800 dark:bg-gray-900',
        to && 'hover:border-seed-300 hover:shadow-md',
        highlight && 'ring-2 ring-orange-300'
      )}
    >
      <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none text-gray-900 dark:text-gray-100">{value}</p>
        <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </button>
  )
}
