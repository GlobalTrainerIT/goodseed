import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useCollection } from '@/lib/hooks'
import { useCurrentUser } from '@/lib/hooks'

export default function NotificationBell() {
  const user = useCurrentUser()
  const notifications = useCollection('notifications')
  const unread = notifications.filter((n) => n.user_id === user?.id && !n.is_read).length

  return (
    <Link
      to="/NotificationCenter"
      className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
