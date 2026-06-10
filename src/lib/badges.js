/**
 * Badge definitions + earning logic. Each badge has a `check(ctx)` that returns
 * true when the badge is earned. ctx is computed from the child's stats.
 */

export const BADGE_DEFS = [
  {
    badge_type: 'first_task',
    title: 'First Seed',
    description: 'Completed your very first task',
    icon_emoji: '🌱',
    check: (c) => c.tasksCompleted >= 1,
  },
  {
    badge_type: 'streak_3',
    title: 'Streak Starter',
    description: 'Reached a 3-day streak',
    icon_emoji: '🔥',
    check: (c) => c.streakBest >= 3,
  },
  {
    badge_type: 'streak_7',
    title: 'Week Warrior',
    description: 'Reached a 7-day streak',
    icon_emoji: '🔥',
    check: (c) => c.streakBest >= 7,
    bonusSeeds: 5,
  },
  {
    badge_type: 'streak_30',
    title: 'Month Master',
    description: 'Reached a 30-day streak',
    icon_emoji: '🏆',
    check: (c) => c.streakBest >= 30,
    bonusSeeds: 25,
  },
  {
    badge_type: 'seeds_100',
    title: 'Century Club',
    description: 'Earned 100 seeds in total',
    icon_emoji: '💯',
    check: (c) => c.totalSeedsEarned >= 100,
  },
  {
    badge_type: 'seeds_500',
    title: 'Seed Tycoon',
    description: 'Earned 500 seeds in total',
    icon_emoji: '🌳',
    check: (c) => c.totalSeedsEarned >= 500,
  },
  {
    badge_type: 'task_master',
    title: 'Task Master',
    description: 'Completed 50 tasks',
    icon_emoji: '🎯',
    check: (c) => c.tasksCompleted >= 50,
  },
  {
    badge_type: 'team_player',
    title: 'Team Player',
    description: 'Completed 5 tasks assigned to all children',
    icon_emoji: '🤝',
    check: (c) => c.allChildrenTasks >= 5,
  },
  {
    badge_type: 'kind_heart',
    title: 'Kind Heart',
    description: 'Completed 5 kindness tasks',
    icon_emoji: '💝',
    check: (c) => (c.byCategory.kindness || 0) >= 5,
  },
  {
    badge_type: 'scholar',
    title: 'Scholar',
    description: 'Completed 5 homework tasks',
    icon_emoji: '📚',
    check: (c) => (c.byCategory.homework || 0) >= 5,
  },
  {
    badge_type: 'fitness_fan',
    title: 'Fitness Fan',
    description: 'Completed 5 exercise tasks',
    icon_emoji: '🏃',
    check: (c) => (c.byCategory.exercise || 0) >= 5,
  },
  {
    badge_type: 'all_rounder',
    title: 'All-Rounder',
    description: 'Completed a task in every category',
    icon_emoji: '⭐',
    check: (c) =>
      ['chores', 'homework', 'kindness', 'learning', 'exercise', 'other'].every(
        (cat) => (c.byCategory[cat] || 0) >= 1
      ),
  },
]

export function getBadgeDef(type) {
  return BADGE_DEFS.find((b) => b.badge_type === type)
}
