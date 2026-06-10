export const TASK_CATEGORIES = {
  chores: { label: 'Chores', emoji: '🧹', color: '#16a34a' },
  homework: { label: 'Homework', emoji: '📚', color: '#2563eb' },
  kindness: { label: 'Kindness', emoji: '💝', color: '#db2777' },
  learning: { label: 'Learning', emoji: '🧠', color: '#7c3aed' },
  exercise: { label: 'Exercise', emoji: '🏃', color: '#ea580c' },
  other: { label: 'Other', emoji: '✨', color: '#0891b2' },
}

export const REWARD_CATEGORIES = {
  screen_time: { label: 'Screen Time', emoji: '📱', color: '#2563eb' },
  experiences: { label: 'Experiences', emoji: '🎉', color: '#db2777' },
  activities: { label: 'Activities', emoji: '⚽', color: '#ea580c' },
  treats: { label: 'Treats', emoji: '🍦', color: '#d97706' },
  privileges: { label: 'Privileges', emoji: '👑', color: '#7c3aed' },
  toys: { label: 'Toys', emoji: '🧸', color: '#16a34a' },
  other: { label: 'Other', emoji: '🎁', color: '#0891b2' },
}

export const AVATAR_EMOJIS = [
  '🚀', '🦄', '🐬', '🦊', '🐼', '🐶', '🐱', '🦁', '🐯', '🐸',
  '🐙', '🦋', '🌟', '🌈', '⚡', '🔥', '🍀', '🌸', '🎈', '🎨',
  '⚽', '🏀', '🎸', '🎮', '👑', '🦖', '🐉', '🦅', '🐢', '🐝',
]

export const AVATAR_COLORS = [
  '#bfdbfe', '#f5d0fe', '#a7f3d0', '#fde68a', '#fecaca',
  '#c7d2fe', '#fbcfe8', '#bbf7d0', '#fed7aa', '#ddd6fe',
]

export const REWARD_EMOJIS = [
  '📱', '🎮', '🍕', '🍦', '🍪', '🎉', '🎬', '🎡', '🧸', '⚽',
  '🚲', '🎨', '📚', '🍿', '🏊', '🎁', '💰', '👑', '🌟', '🛹',
]

export const SEED_NAME_OPTIONS = ['Seeds', 'Coins', 'Stars', 'Gems', 'Points', 'Sprouts']

export const LEVEL_THRESHOLDS = (() => {
  // Total XP required to reach each level. Index 0 => Level 1.
  const thresholds = [0, 100, 250, 500, 1000]
  let gap = 500 // gap between L4 and L5
  for (let lvl = 6; lvl <= 40; lvl++) {
    gap = Math.round(gap * 1.5)
    thresholds.push(thresholds[thresholds.length - 1] + gap)
  }
  return thresholds
})()
