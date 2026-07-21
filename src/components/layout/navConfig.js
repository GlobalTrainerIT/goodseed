import {
  LayoutDashboard,
  ListChecks,
  Gift,
  Rocket,
  Users,
  BarChart3,
  Store,
  Settings,
  Home,
  User,
  Trophy,
  ClipboardList,
  Megaphone,
  Wrench,
  CalendarDays,
} from 'lucide-react'

export const PARENT_NAV = [
  { label: 'Dashboard', to: '/Dashboard', icon: LayoutDashboard },
  { label: 'Tasks', to: '/Tasks', icon: ListChecks },
  { label: 'Rewards', to: '/Rewards', icon: Gift },
  { label: 'Calendar', to: '/Calendar', icon: CalendarDays },
  { label: 'Missions', to: '/Missions', icon: Rocket },
  { label: 'Family', to: '/Family', icon: Users },
  { label: 'Reports', to: '/Reports', icon: BarChart3 },
  { label: 'Trading Post', to: '/TradingPost', icon: Store },
  { label: 'Settings', to: '/Settings', icon: Settings },
]

export const PARENT_TABS = [
  { label: 'Home', to: '/Dashboard', icon: Home },
  { label: 'Tasks', to: '/Tasks', icon: ListChecks },
  { label: 'Rewards', to: '/Rewards', icon: Gift },
  { label: 'Trade', to: '/TradingPost', icon: Store },
  { label: 'Family', to: '/Family', icon: Users },
]

// Coach/teacher view for classroom & team groups: roster-first, no
// family-specific surfaces (Missions, Trading Post).
export const GROUP_NAV = [
  { label: 'Roster', to: '/Roster', icon: ClipboardList },
  { label: 'Leaderboard', to: '/Leaderboard', icon: Trophy },
  { label: 'Board', to: '/Board', icon: Megaphone },
  { label: 'Toolkit', to: '/Toolkit', icon: Wrench },
  { label: 'Tasks', to: '/Tasks', icon: ListChecks },
  { label: 'Rewards', to: '/Rewards', icon: Gift },
  { label: 'Reports', to: '/Reports', icon: BarChart3 },
  { label: 'Settings', to: '/Settings', icon: Settings },
]

export const GROUP_TABS = [
  { label: 'Roster', to: '/Roster', icon: ClipboardList },
  { label: 'Toolkit', to: '/Toolkit', icon: Wrench },
  { label: 'Board', to: '/Board', icon: Megaphone },
  { label: 'Leaders', to: '/Leaderboard', icon: Trophy },
  { label: 'Settings', to: '/Settings', icon: Settings },
]

export const CHILD_TABS = [
  { label: 'Home', to: '/Dashboard', icon: Home },
  { label: 'Tasks', to: '/Tasks', icon: ListChecks },
  { label: 'Shop', to: '/Rewards', icon: Gift },
  { label: 'Trade', to: '/TradingPost', icon: Store },
  { label: 'Profile', to: '/Settings', icon: User },
]
