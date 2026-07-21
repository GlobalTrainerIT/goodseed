/**
 * Demo data pre-loaded on first launch. Provides a populated family so every
 * page has something to show (leaderboard, reports, activity, badges).
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function inDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(20, 0, 0, 0)
  return d.toISOString()
}

export const DEFAULT_NOTIFICATION_PREFS = {
  newTaskAssigned: true,
  taskReminders: true,
  dueDateAlerts: true,
  redemptionRequests: true,
  rewardApproved: true,
  newAnnouncements: true,
  goalUpdates: true,
  weeklyBossUpdates: true,
}

export function seedData() {
  const familyId = 'fam_demo'

  const family = {
    id: familyId,
    name: 'The Demo Family',
    invite_code: 'DEMO01',
    avatar_emoji: '🏡',
    created_date: daysAgo(40),
  }

  const users = [
    {
      id: 'parent1',
      family_id: familyId,
      full_name: 'Alex Parent',
      email: 'alex@demo.com',
      role: 'parent',
      avatar_emoji: '👑',
      avatar_bg_color: '#fde68a',
      seed_balance: 0,
      total_seeds_earned: 0,
      streak_current: 0,
      streak_longest: 0,
      streak_savers_available: 0,
      xp: 0,
      level: 1,
      created_date: daysAgo(40),
    },
    {
      id: 'child1',
      family_id: familyId,
      full_name: 'Sam',
      email: '',
      role: 'child',
      age: 8,
      avatar_emoji: '🚀',
      avatar_bg_color: '#bfdbfe',
      seed_balance: 12,
      total_seeds_earned: 86,
      streak_current: 5,
      streak_longest: 9,
      streak_savers_available: 1,
      xp: 430,
      level: 3,
      managed: true,
      created_date: daysAgo(38),
    },
    {
      id: 'child2',
      family_id: familyId,
      full_name: 'Jordan',
      email: '',
      role: 'child',
      age: 10,
      avatar_emoji: '🦄',
      avatar_bg_color: '#f5d0fe',
      seed_balance: 8,
      total_seeds_earned: 64,
      streak_current: 3,
      streak_longest: 6,
      streak_savers_available: 0,
      xp: 260,
      level: 3,
      managed: true,
      created_date: daysAgo(36),
    },
    {
      id: 'child3',
      family_id: familyId,
      full_name: 'Riley',
      email: '',
      role: 'child',
      age: 6,
      avatar_emoji: '🐬',
      avatar_bg_color: '#a7f3d0',
      seed_balance: 5,
      total_seeds_earned: 32,
      streak_current: 1,
      streak_longest: 4,
      streak_savers_available: 0,
      xp: 120,
      level: 2,
      managed: true,
      created_date: daysAgo(30),
    },
  ]

  users.forEach((u) => { if (u.role === 'child') u.protected_days = [] })

  const tasks = [
    {
      id: 'task1',
      family_id: familyId,
      title: 'Tidy Room',
      description: 'Make your bed and put away toys and clothes.',
      category: 'chores',
      seed_value: 1,
      frequency: 'daily',
      due_date: inDays(0),
      assigned_children: [],
      status: 'active',
      requires_approval: true,
      created_by: 'parent1',
      created_date: daysAgo(20),
    },
    {
      id: 'task2',
      family_id: familyId,
      title: 'Read for 20 Minutes',
      description: 'Read a book of your choice for at least 20 minutes.',
      category: 'homework',
      seed_value: 2,
      frequency: 'daily',
      due_date: inDays(0),
      assigned_children: [],
      status: 'active',
      requires_approval: true,
      created_by: 'parent1',
      created_date: daysAgo(20),
    },
    {
      id: 'task3',
      family_id: familyId,
      title: 'Help Set the Table',
      description: 'Set plates, cups, and cutlery before dinner.',
      category: 'kindness',
      seed_value: 1,
      frequency: 'daily',
      due_date: inDays(0),
      assigned_children: [],
      status: 'active',
      requires_approval: false,
      created_by: 'parent1',
      created_date: daysAgo(18),
    },
    {
      id: 'task4',
      family_id: familyId,
      title: 'Practice Spelling Words',
      description: 'Go through this week’s spelling list twice.',
      category: 'learning',
      seed_value: 3,
      frequency: 'weekly',
      due_date: inDays(-2),
      assigned_children: ['child2'],
      status: 'active',
      requires_approval: true,
      created_by: 'parent1',
      created_date: daysAgo(10),
    },
    {
      id: 'task5',
      family_id: familyId,
      title: '15 Minute Bike Ride',
      description: 'Get some fresh air and exercise outside.',
      category: 'exercise',
      seed_value: 2,
      frequency: 'weekly',
      due_date: inDays(3),
      assigned_children: [],
      status: 'active',
      requires_approval: true,
      created_by: 'parent1',
      created_date: daysAgo(8),
    },
  ]

  tasks.forEach((t, i) => { t.sort_order = i })

  const completions = [
    { id: 'comp1', task_id: 'task1', child_id: 'child1', family_id: familyId, status: 'approved', submitted_date: daysAgo(1), approved_date: daysAgo(1), approved_by: 'parent1', seeds_awarded: 1, note: '', photo: null },
    { id: 'comp2', task_id: 'task2', child_id: 'child1', family_id: familyId, status: 'approved', submitted_date: daysAgo(2), approved_date: daysAgo(2), approved_by: 'parent1', seeds_awarded: 2, note: '' },
    { id: 'comp3', task_id: 'task1', child_id: 'child2', family_id: familyId, status: 'approved', submitted_date: daysAgo(1), approved_date: daysAgo(1), approved_by: 'parent1', seeds_awarded: 1, note: '' },
    { id: 'comp4', task_id: 'task2', child_id: 'child1', family_id: familyId, status: 'pending_approval', submitted_date: daysAgo(0), approved_date: null, approved_by: null, seeds_awarded: 0, note: 'Finished my chapter book!' },
    { id: 'comp5', task_id: 'task4', child_id: 'child2', family_id: familyId, status: 'pending_approval', submitted_date: daysAgo(0), approved_date: null, approved_by: null, seeds_awarded: 0, note: '' },
    { id: 'comp6', task_id: 'task3', child_id: 'child3', family_id: familyId, status: 'approved', submitted_date: daysAgo(3), approved_date: daysAgo(3), approved_by: 'parent1', seeds_awarded: 1, note: '' },
  ]

  const rewards = [
    { id: 'reward1', family_id: familyId, title: '30 Min Extra Screen Time', description: 'Enjoy 30 extra minutes of screen time.', category: 'screen_time', seed_cost: 10, emoji_icon: '📱', is_available: true, created_by: 'parent1', created_date: daysAgo(20) },
    { id: 'reward2', family_id: familyId, title: 'Choose Dinner Tonight', description: 'Pick what the family eats for dinner.', category: 'privileges', seed_cost: 15, emoji_icon: '🍕', is_available: true, created_by: 'parent1', created_date: daysAgo(20) },
    { id: 'reward3', family_id: familyId, title: '1-on-1 Time with Parent', description: 'Special outing or activity with a parent.', category: 'experiences', seed_cost: 50, emoji_icon: '🎉', is_available: true, created_by: 'parent1', created_date: daysAgo(20) },
    { id: 'reward4', family_id: familyId, title: 'Ice Cream Treat', description: 'A trip to the ice cream shop.', category: 'treats', seed_cost: 20, emoji_icon: '🍦', is_available: true, created_by: 'parent1', created_date: daysAgo(15) },
    { id: 'reward5', family_id: familyId, title: 'New Small Toy', description: 'Pick a small toy from the store.', category: 'toys', seed_cost: 40, emoji_icon: '🧸', is_available: false, created_by: 'parent1', created_date: daysAgo(12) },
  ]

  const redemptions = [
    { id: 'redeem1', reward_id: 'reward1', child_id: 'child1', family_id: familyId, status: 'pending', requested_date: daysAgo(0), resolved_date: null, resolved_by: null, note: '' },
  ]

  const shoutouts = [
    { id: 'shout1', family_id: familyId, from_user_id: 'parent1', to_user_id: 'child1', message: 'Amazing job keeping your room tidy all week!', created_date: daysAgo(1) },
    { id: 'shout2', family_id: familyId, from_user_id: 'child2', to_user_id: 'child3', message: 'Thanks for sharing your snack with me 💕', created_date: daysAgo(2) },
  ]

  const goals = [
    { id: 'goal1', family_id: familyId, title: 'Family Movie Night', description: 'Earn enough seeds together for a big movie night with snacks.', target_seeds: 100, current_seeds: 45, status: 'active', deadline: inDays(14), created_date: daysAgo(10) },
  ]

  const announcements = [
    { id: 'ann1', family_id: familyId, title: 'Welcome to GoodSeed!', message: 'We are starting our family rewards journey. Let’s plant good seeds together. 🌱', created_by: 'parent1', created_date: daysAgo(5), is_pinned: true },
  ]

  const weeklyBosses = [
    {
      id: 'boss1',
      family_id: familyId,
      title: 'The Chore Dragon',
      description: 'A grumpy dragon hoards all the seeds! Complete chores together to defeat it.',
      emoji: '🐲',
      total_tasks_required: 15,
      tasks_completed: 6,
      reward_description: 'A family pizza night',
      seed_bonus: 10,
      week_start: daysAgo(2),
      week_end: inDays(5),
      status: 'active',
    },
  ]

  const trades = []

  const badges = [
    { id: 'badge1', user_id: 'child1', family_id: familyId, badge_type: 'first_task', title: 'First Seed', description: 'Completed your very first task', icon_emoji: '🌱', earned_date: daysAgo(20) },
    { id: 'badge2', user_id: 'child1', family_id: familyId, badge_type: 'streak_3', title: 'Streak Starter', description: 'Reached a 3-day streak', icon_emoji: '🔥', earned_date: daysAgo(6) },
    { id: 'badge3', user_id: 'child2', family_id: familyId, badge_type: 'first_task', title: 'First Seed', description: 'Completed your very first task', icon_emoji: '🌱', earned_date: daysAgo(18) },
    { id: 'badge4', user_id: 'child3', family_id: familyId, badge_type: 'first_task', title: 'First Seed', description: 'Completed your very first task', icon_emoji: '🌱', earned_date: daysAgo(14) },
  ]

  const activity = [
    { id: 'act1', family_id: familyId, user_id: 'child1', action_type: 'task_approved', description: 'Sam completed “Tidy Room”', seeds_delta: 1, timestamp: daysAgo(1) },
    { id: 'act2', family_id: familyId, user_id: 'child1', action_type: 'task_approved', description: 'Sam completed “Read for 20 Minutes”', seeds_delta: 2, timestamp: daysAgo(2) },
    { id: 'act3', family_id: familyId, user_id: 'child2', action_type: 'task_approved', description: 'Jordan completed “Tidy Room”', seeds_delta: 1, timestamp: daysAgo(1) },
    { id: 'act4', family_id: familyId, user_id: 'child1', action_type: 'badge_earned', description: 'Sam earned the Streak Starter badge 🔥', seeds_delta: 0, timestamp: daysAgo(6) },
    { id: 'act5', family_id: familyId, user_id: 'child3', action_type: 'shoutout_given', description: 'Jordan gave Riley a shout-out 💬', seeds_delta: 0, timestamp: daysAgo(2) },
  ]

  const seedPacks = [
    { id: 'pack1', child_id: 'child1', earned_date: daysAgo(3), opened: false, cosmetic_reward: null },
  ]

  const missions = [
    {
      id: 'mission1',
      family_id: familyId,
      title: 'Helpful Week Challenge',
      description: 'Complete this set of tasks together to unlock a bonus.',
      task_ids: ['task1', 'task2', 'task3'],
      seed_bonus: 10,
      deadline: inDays(7),
      status: 'active',
      created_by: 'parent1',
    },
  ]

  const leaderboardSnapshots = [
    {
      id: 'snap1',
      family_id: familyId,
      week_start: daysAgo(14),
      week_end: daysAgo(7),
      winner_id: 'child1',
      winner_name: 'Sam',
      standings: [
        { child_id: 'child1', name: 'Sam', seeds: 24 },
        { child_id: 'child2', name: 'Jordan', seeds: 18 },
        { child_id: 'child3', name: 'Riley', seeds: 9 },
      ],
    },
  ]

  const settings = {
    family_id: familyId,
    seedName: 'Seeds',
    seedNameSingular: 'Seed',
    allowStreakSavers: false,
    enableSeedPacks: true,
    memoryVerseEnabled: true,
    memoryVerseReward: 5,
    armorEnabled: true,
    armorPieceReward: 2,
    fruitGardenEnabled: true,
    gratitudeEnabled: true,
    gratitudeReward: 1,
    journeyEnabled: true,
    parentPin: '',
    parentPinEnabled: false,
    lastMaintenanceDay: null,
    lastSaverWeek: null,
    lastSnapshotWeek: null,
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
  }

  return {
    families: [family],
    users,
    tasks,
    completions,
    rewards,
    redemptions,
    shoutouts,
    goals,
    announcements,
    weeklyBosses,
    trades,
    notifications: [],
    badges,
    activity,
    seedPacks,
    missions,
    leaderboardSnapshots,
    memoryVerses: [],
    armorPieces: [],
    fruitEarned: [],
    gratitude: [],
    settings,
  }
}
