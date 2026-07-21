/**
 * Badge definitions + earning logic. Each badge has a `check(ctx)` that returns
 * true when the badge is earned. ctx is computed from the child's stats.
 */

export const BADGE_DEFS = [
  {
    badge_type: 'first_task',
    title: 'First Seed',
    description: 'Earned your very first seed',
    icon_emoji: '🌱',
    // Unlocks on the first seed earned, whether from a task or a parent award.
    check: (c) => c.totalSeedsEarned >= 1 || c.tasksCompleted >= 1,
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

  // ---- Faith & character achievements (each carries a verse) --------------
  {
    badge_type: 'good_samaritan',
    title: 'Good Samaritan',
    description: 'Did 15 acts of kindness — "Love your neighbor as yourself." (Luke 10:27)',
    icon_emoji: '💛',
    check: (c) => (c.byCategory.kindness || 0) >= 15,
    bonusSeeds: 10,
  },
  {
    badge_type: 'faithful_steward',
    title: 'Faithful Steward',
    description: 'Kept a 14-day streak — "Whoever is faithful in little is faithful in much." (Luke 16:10)',
    icon_emoji: '🗝️',
    check: (c) => c.streakBest >= 14,
    bonusSeeds: 10,
  },
  {
    badge_type: 'diligent_worker',
    title: 'Diligent Worker',
    description: 'Completed 100 tasks — "Work at it with all your heart, as working for the Lord." (Colossians 3:23)',
    icon_emoji: '🛠️',
    check: (c) => c.tasksCompleted >= 100,
    bonusSeeds: 15,
  },
  {
    badge_type: 'encourager',
    title: 'Encourager',
    description: 'Gave 3 shout-outs — "Encourage one another and build each other up." (1 Thessalonians 5:11)',
    icon_emoji: '💬',
    check: (c) => c.shoutoutsGiven >= 3,
    bonusSeeds: 5,
  },
  {
    badge_type: 'good_and_faithful',
    title: 'Good & Faithful',
    description: 'Earned 250 seeds — "Well done, good and faithful servant." (Matthew 25:21)',
    icon_emoji: '👑',
    check: (c) => c.totalSeedsEarned >= 250,
    bonusSeeds: 15,
  },
  {
    badge_type: 'verse_first',
    title: 'Word Planted',
    description: 'Memorized your first weekly verse — "Your word I have hidden in my heart." (Psalm 119:11)',
    icon_emoji: '📖',
    check: (c) => (c.memoryVersesCount || 0) >= 1,
    bonusSeeds: 3,
  },
  {
    badge_type: 'verse_streak_4',
    title: 'Scripture Keeper',
    description: 'Memorized a verse 4 weeks in a row — "that I might not sin against You." (Psalm 119:11)',
    icon_emoji: '📖',
    check: (c) => (c.memoryStreakBest || 0) >= 4,
    bonusSeeds: 15,
  },
  {
    badge_type: 'verse_master',
    title: 'Hidden in the Heart',
    description: 'Memorized 12 weekly verses — "I have treasured Your words in my heart." (Job 23:12)',
    icon_emoji: '💎',
    check: (c) => (c.memoryVersesCount || 0) >= 12,
    bonusSeeds: 25,
  },

  // ---- Armor of God (daily devotion habit) --------------------------------
  {
    badge_type: 'armor_bearer',
    title: 'Armor Bearer',
    description: 'Put on your first piece of armor — "Put on the full armor of God." (Ephesians 6:11)',
    icon_emoji: '🛡️',
    check: (c) => (c.armorPiecesCount || 0) >= 1,
    bonusSeeds: 3,
  },
  {
    badge_type: 'armor_full',
    title: 'Fully Armored',
    description: 'Put on the full Armor of God — "so that you can take your stand." (Ephesians 6:13)',
    icon_emoji: '⚔️',
    check: (c) => (c.armorSuitsCompleted || 0) >= 1,
    bonusSeeds: 10,
  },
  {
    badge_type: 'armor_daily_7',
    title: 'Daily Devotion',
    description: 'Put on the armor 7 days running — "Stand firm then." (Ephesians 6:14)',
    icon_emoji: '🔥',
    check: (c) => (c.armorStreakBest || 0) >= 7,
    bonusSeeds: 10,
  },

  // ---- Fruit of the Spirit garden -----------------------------------------
  {
    badge_type: 'fruit_five',
    title: 'Good Fruit',
    description: 'Showed five Fruits of the Spirit — "By their fruit you will recognize them." (Matthew 7:16)',
    icon_emoji: '🍏',
    check: (c) => (c.distinctFruits || 0) >= 5,
    bonusSeeds: 8,
  },
  {
    badge_type: 'fruit_full',
    title: 'Flourishing Tree',
    description: 'Showed all nine Fruits of the Spirit — "love, joy, peace, patience, kindness…" (Galatians 5:22-23)',
    icon_emoji: '🌳',
    check: (c) => (c.distinctFruits || 0) >= 9,
    bonusSeeds: 20,
  },

  // ---- Prayer / gratitude jar ---------------------------------------------
  {
    badge_type: 'gratitude_first',
    title: 'Grateful Heart',
    description: 'Started your gratitude jar — "Give thanks in all circumstances." (1 Thessalonians 5:18)',
    icon_emoji: '💛',
    check: (c) => (c.gratitudeCount || 0) >= 1,
    bonusSeeds: 3,
  },
  {
    badge_type: 'gratitude_streak_7',
    title: 'Thankful Every Day',
    description: 'Added to your jar 7 days running — "Rejoice always, pray continually." (1 Thessalonians 5:16-17)',
    icon_emoji: '🙏',
    check: (c) => (c.gratitudeStreakBest || 0) >= 7,
    bonusSeeds: 10,
  },
  {
    badge_type: 'gratitude_30',
    title: 'Overflowing',
    description: 'Filled your jar with 30 notes of thanks and prayer — "My cup overflows." (Psalm 23:5)',
    icon_emoji: '🫙',
    check: (c) => (c.gratitudeCount || 0) >= 30,
    bonusSeeds: 15,
  },

  // ---- Bible journey capstone (threshold mirrors journey.js final stop) ----
  {
    badge_type: 'journey_complete',
    title: 'The Whole Story',
    description: 'Traveled the Bible journey to the Empty Tomb — "He is not here; he has risen!" (Matthew 28:6)',
    icon_emoji: '✝️',
    check: (c) => (c.totalSeedsEarned || 0) >= 1600,
    bonusSeeds: 30,
  },
]

export function getBadgeDef(type) {
  return BADGE_DEFS.find((b) => b.badge_type === type)
}
