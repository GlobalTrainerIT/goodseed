/**
 * Business logic: seed flows, streaks, XP/levels, badges, approvals,
 * redemptions, goals, weekly boss, notifications.
 */
import { getAll, getById, create, update, getSettings, updateSettings } from './db'
import { BADGE_DEFS } from './badges'
import { LEVEL_THRESHOLDS } from './constants'
import { toast } from './toast'
import { clamp } from './utils'

// ---------------------------------------------------------------- levels / xp
export function levelFromXp(xp) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}

export function levelProgress(xp) {
  const level = levelFromXp(xp)
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0
  const ceil = LEVEL_THRESHOLDS[level] ?? floor + 1000
  const into = xp - floor
  const span = ceil - floor
  return { level, into, span, pct: clamp(Math.round((into / span) * 100), 0, 100), nextAt: ceil }
}

export function addXp(userId, amount) {
  const user = getById('users', userId)
  if (!user) return
  const newXp = (user.xp || 0) + amount
  const oldLevel = user.level || levelFromXp(user.xp || 0)
  const newLevel = levelFromXp(newXp)
  update('users', userId, { xp: newXp, level: newLevel })
  if (newLevel > oldLevel) {
    addActivity(user.family_id, userId, 'level_up', `${user.full_name} reached Level ${newLevel}!`, 0)
    notify(userId, 'family', 'Level Up! 🎉', `You're now Level ${newLevel}!`, '/ChildProfile/' + userId)
    toast({ title: 'Level Up!', message: `${user.full_name} is now Level ${newLevel}!`, emoji: '⭐' })
  }
}

// ---------------------------------------------------------------- activity log
export function addActivity(familyId, userId, action_type, description, seeds_delta = 0) {
  create('activity', {
    family_id: familyId,
    user_id: userId,
    action_type,
    description,
    seeds_delta,
    timestamp: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------- notifications
export function notify(userId, type, title, message, link_to = null) {
  create('notifications', {
    user_id: userId,
    family_id: getById('users', userId)?.family_id,
    type,
    title,
    message,
    is_read: false,
    link_to,
  })
}

// ---------------------------------------------------------------- seeds
export function awardSeeds(childId, amount, reason, byUserId) {
  const child = getById('users', childId)
  if (!child || amount <= 0) return
  update('users', childId, (c) => ({
    seed_balance: (c.seed_balance || 0) + amount,
    total_seeds_earned: (c.total_seeds_earned || 0) + amount,
  }))
  addActivity(child.family_id, childId, 'seeds_awarded', `${child.full_name} earned ${amount} ${seedWord(amount)}${reason ? ` — ${reason}` : ''}`, amount)
  // Seeds contribute a little XP; tasks (10 XP each) remain the main driver so
  // progression isn't trivially fast (a one-off 50-seed award won't leap levels).
  addXp(childId, amount * 2)
  notify(childId, 'family', `+${amount} ${seedWord(amount)} 🌱`, reason || 'Seeds awarded!', null)
  checkBadges(childId)
}

export function deductSeeds(childId, amount, reason) {
  const child = getById('users', childId)
  if (!child || amount <= 0) return false
  const next = (child.seed_balance || 0) - amount
  if (next < 0) return false
  update('users', childId, { seed_balance: next })
  addActivity(child.family_id, childId, 'seeds_deducted', `${child.full_name} spent ${amount} ${seedWord(amount)}${reason ? ` — ${reason}` : ''}`, -amount)
  return true
}

export function seedWord(n = 2) {
  const s = getSettings()
  if (n === 1) return (s.seedNameSingular || 'Seed').toLowerCase()
  return (s.seedName || 'Seeds').toLowerCase()
}

export function seedLabel() {
  return getSettings().seedName || 'Seeds'
}

// ---------------------------------------------------------------- streaks
function localDayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function recomputeStreak(childId) {
  const child = getById('users', childId)
  if (!child) return
  const approved = getAll('completions').filter(
    (c) => c.child_id === childId && c.status === 'approved'
  )
  const days = new Set(approved.map((c) => localDayKey(c.approved_date || c.submitted_date)))
  // Days protected by a consumed streak saver count as "present".
  ;(child.protected_days || []).forEach((d) => days.add(d))

  // current streak: count back from today (or yesterday) while days present
  const today = new Date()
  let current = 0
  const cursor = new Date(today)
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1) // allow streak through yesterday
  while (days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    current += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const longest = Math.max(current, child.streak_longest || 0)
  update('users', childId, { streak_current: current, streak_longest: longest })
}

// ---------------------------------------------------------------- badges
function childBadgeContext(childId) {
  const child = getById('users', childId)
  const approved = getAll('completions').filter(
    (c) => c.child_id === childId && c.status === 'approved'
  )
  const tasks = getAll('tasks')
  const byCategory = {}
  let allChildrenTasks = 0
  approved.forEach((c) => {
    const task = tasks.find((t) => t.id === c.task_id)
    if (!task) return
    byCategory[task.category] = (byCategory[task.category] || 0) + 1
    if (!task.assigned_children || task.assigned_children.length === 0) allChildrenTasks += 1
  })
  return {
    tasksCompleted: approved.length,
    totalSeedsEarned: child?.total_seeds_earned || 0,
    streakBest: child?.streak_longest || 0,
    byCategory,
    allChildrenTasks,
  }
}

export function checkBadges(childId) {
  const child = getById('users', childId)
  if (!child) return []
  const owned = new Set(
    getAll('badges').filter((b) => b.user_id === childId).map((b) => b.badge_type)
  )
  const ctx = childBadgeContext(childId)
  const newlyEarned = []
  BADGE_DEFS.forEach((def) => {
    if (owned.has(def.badge_type)) return
    let earned = false
    try {
      earned = def.check(ctx)
    } catch {
      earned = false
    }
    if (earned) {
      create('badges', {
        user_id: childId,
        family_id: child.family_id,
        badge_type: def.badge_type,
        title: def.title,
        description: def.description,
        icon_emoji: def.icon_emoji,
        earned_date: new Date().toISOString(),
      })
      addActivity(child.family_id, childId, 'badge_earned', `${child.full_name} earned the ${def.title} badge ${def.icon_emoji}`, 0)
      notify(childId, 'family', 'New Badge! 🏅', `You earned "${def.title}" — ${def.description}`, '/ChildProfile/' + childId)
      if (def.bonusSeeds) {
        awardSeeds(childId, def.bonusSeeds, `${def.title} bonus`)
      }
      // seed pack on every-10-tasks or 7-day streak milestone
      if (getSettings().enableSeedPacks) {
        maybeAwardPack(childId, ctx)
      }
      newlyEarned.push(def)
    }
  })
  return newlyEarned
}

function maybeAwardPack(childId, ctx) {
  if (ctx.tasksCompleted > 0 && ctx.tasksCompleted % 10 === 0) {
    create('seedPacks', { child_id: childId, earned_date: new Date().toISOString(), opened: false, cosmetic_reward: null })
  }
}

// ---------------------------------------------------------------- tasks
/** Whether a task applies to a given child. */
export function taskAppliesTo(task, childId) {
  if (!task.assigned_children || task.assigned_children.length === 0) return true
  return task.assigned_children.includes(childId)
}

/** Latest completion record for a (task, child) pair. */
export function latestCompletion(taskId, childId) {
  const recs = getAll('completions')
    .filter((c) => c.task_id === taskId && c.child_id === childId)
    .sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date))
  return recs[0] || null
}

export function completeTask(taskId, childId, note = '', photo = null) {
  const task = getById('tasks', taskId)
  const child = getById('users', childId)
  if (!task || !child) return null
  if (task.requires_approval) {
    const rec = create('completions', {
      task_id: taskId,
      child_id: childId,
      family_id: task.family_id,
      status: 'pending_approval',
      submitted_date: new Date().toISOString(),
      approved_date: null,
      approved_by: null,
      seeds_awarded: 0,
      note,
      photo,
    })
    // notify parents
    getAll('users')
      .filter((u) => u.family_id === task.family_id && u.role === 'parent')
      .forEach((p) => notify(p.id, 'tasks', 'Task needs approval', `${child.full_name} completed "${task.title}"`, '/Tasks'))
    toast({ title: 'Submitted!', message: 'Waiting for a parent to approve.', emoji: '⏳' })
    return rec
  }
  // auto-approve
  const rec = create('completions', {
    task_id: taskId,
    child_id: childId,
    family_id: task.family_id,
    status: 'approved',
    submitted_date: new Date().toISOString(),
    approved_date: new Date().toISOString(),
    approved_by: null,
    seeds_awarded: task.seed_value,
    note,
    photo,
  })
  finishApproval(task, child)
  return rec
}

function finishApproval(task, child) {
  awardSeeds(child.id, task.seed_value, task.title)
  addXp(child.id, 10)
  recomputeStreak(child.id)
  checkBadges(child.id)
  incrementWeeklyBoss(task.family_id)
}

export function approveCompletion(completionId, byUserId, note = '') {
  const comp = getById('completions', completionId)
  if (!comp || comp.status !== 'pending_approval') return
  const task = getById('tasks', comp.task_id)
  const child = getById('users', comp.child_id)
  if (!task || !child) return
  update('completions', completionId, {
    status: 'approved',
    approved_date: new Date().toISOString(),
    approved_by: byUserId,
    seeds_awarded: task.seed_value,
    note: note || comp.note,
  })
  finishApproval(task, child)
  toast({ title: 'Approved!', message: `${child.full_name} earned ${task.seed_value} ${seedWord(task.seed_value)}.`, emoji: '✅' })
}

export function rejectCompletion(completionId, byUserId, note = '') {
  const comp = getById('completions', completionId)
  if (!comp) return
  const child = getById('users', comp.child_id)
  update('completions', completionId, {
    status: 'rejected',
    approved_by: byUserId,
    approved_date: new Date().toISOString(),
    note,
  })
  if (child) notify(child.id, 'tasks', 'Task needs another try', note || 'A parent asked you to try this task again.', '/Tasks')
  toast({ title: 'Sent back', message: 'The child can try again.', emoji: '↩️', type: 'info' })
}

// ---------------------------------------------------------------- rewards
export function requestRedemption(rewardId, childId) {
  const reward = getById('rewards', rewardId)
  const child = getById('users', childId)
  if (!reward || !child) return null
  if ((child.seed_balance || 0) < reward.seed_cost) {
    toast({ title: 'Not enough seeds', message: `You need ${reward.seed_cost} ${seedWord(reward.seed_cost)}.`, emoji: '🌱', type: 'error' })
    return null
  }
  const rec = create('redemptions', {
    reward_id: rewardId,
    child_id: childId,
    family_id: reward.family_id,
    status: 'pending',
    requested_date: new Date().toISOString(),
    resolved_date: null,
    resolved_by: null,
    note: '',
  })
  getAll('users')
    .filter((u) => u.family_id === reward.family_id && u.role === 'parent')
    .forEach((p) => notify(p.id, 'rewards', 'Redemption request', `${child.full_name} wants "${reward.title}"`, '/Rewards'))
  toast({ title: 'Requested!', message: 'A parent will review your reward.', emoji: '🎁' })
  return rec
}

export function resolveRedemption(redemptionId, approve, byUserId) {
  const r = getById('redemptions', redemptionId)
  if (!r || r.status !== 'pending') return
  const reward = getById('rewards', r.reward_id)
  const child = getById('users', r.child_id)
  if (approve) {
    const ok = deductSeeds(r.child_id, reward.seed_cost, reward.title)
    if (!ok) {
      toast({ title: 'Cannot approve', message: 'Child no longer has enough seeds.', type: 'error' })
      return
    }
    addActivity(reward.family_id, r.child_id, 'reward_redeemed', `${child.full_name} redeemed "${reward.title}" 🎁`, -reward.seed_cost)
    notify(r.child_id, 'rewards', 'Reward approved! 🎁', `Enjoy your "${reward.title}"!`, '/Rewards')
  } else {
    notify(r.child_id, 'rewards', 'Reward declined', `"${reward.title}" was not approved this time.`, '/Rewards')
  }
  update('redemptions', redemptionId, {
    status: approve ? 'approved' : 'rejected',
    resolved_date: new Date().toISOString(),
    resolved_by: byUserId,
  })
}

// ---------------------------------------------------------------- shout-outs
export function giveShoutout(familyId, fromId, toId, message) {
  create('shoutouts', { family_id: familyId, from_user_id: fromId, to_user_id: toId, message })
  addActivity(familyId, fromId, 'shoutout_given', `${getById('users', fromId)?.full_name} gave a shout-out 💬`, 0)
  notify(toId, 'family', 'You got a shout-out! 💬', message, '/Dashboard')
}

// ---------------------------------------------------------------- goals
export function contributeToGoal(goalId, childId, amount) {
  const goal = getById('goals', goalId)
  const child = getById('users', childId)
  if (!goal || !child || amount <= 0) return false
  if ((child.seed_balance || 0) < amount) return false
  deductSeeds(childId, amount, `Contributed to "${goal.title}"`)
  const newCurrent = (goal.current_seeds || 0) + amount
  const completed = newCurrent >= goal.target_seeds
  update('goals', goalId, { current_seeds: newCurrent, status: completed ? 'completed' : 'active' })
  addActivity(goal.family_id, childId, 'goal_completed', `${child.full_name} contributed ${amount} to "${goal.title}"`, 0)
  if (completed) {
    toast({ title: 'Goal complete! 🎉', message: `"${goal.title}" reached its target!`, emoji: '🎯' })
    getAll('users')
      .filter((u) => u.family_id === goal.family_id)
      .forEach((u) => notify(u.id, 'family', 'Family goal reached! 🎉', `"${goal.title}" is complete!`, '/Family'))
  }
  return true
}

// ---------------------------------------------------------------- weekly boss
export function incrementWeeklyBoss(familyId) {
  const boss = getAll('weeklyBosses').find((b) => b.family_id === familyId && b.status === 'active')
  if (!boss) return
  const done = (boss.tasks_completed || 0) + 1
  const defeated = done >= boss.total_tasks_required
  update('weeklyBosses', boss.id, { tasks_completed: done, status: defeated ? 'completed' : 'active' })
  if (defeated) {
    if (boss.seed_bonus) {
      getAll('users')
        .filter((u) => u.family_id === familyId && u.role === 'child')
        .forEach((c) => awardSeeds(c.id, boss.seed_bonus, `${boss.title} defeated!`))
    }
    addActivity(familyId, null, 'goal_completed', `The family defeated ${boss.title}! ${boss.emoji || '🐲'}`, 0)
  }
}

// ---------------------------------------------------------------- seed packs
const PACK_COSMETICS = [
  { id: 'cos_gold', label: 'Gold Ring', emoji: '💛', type: 'ring' },
  { id: 'cos_star', label: 'Star Sparkle', emoji: '✨', type: 'effect' },
  { id: 'cos_crown', label: 'Tiny Crown', emoji: '👑', type: 'hat' },
  { id: 'cos_rainbow', label: 'Rainbow Aura', emoji: '🌈', type: 'bg' },
  { id: 'cos_flame', label: 'Flame Trail', emoji: '🔥', type: 'effect' },
  { id: 'cos_heart', label: 'Heart Frame', emoji: '💖', type: 'ring' },
]

export function openSeedPack(packId) {
  const pack = getById('seedPacks', packId)
  if (!pack || pack.opened) return null
  const reward = PACK_COSMETICS[Math.floor(Math.random() * PACK_COSMETICS.length)]
  update('seedPacks', packId, { opened: true, cosmetic_reward: reward })
  return reward
}

// ---------------------------------------------------------------- ordering
/** Persist a new ordering of task ids (drag-and-drop reorder). */
export function reorderTasks(orderedIds) {
  orderedIds.forEach((id, index) => update('tasks', id, { sort_order: index }))
}

// ---------------------------------------------------------------- maintenance
export { localDayKey as dayKey }

function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Runs once per day on app load. Rolls recurring task due-dates forward,
 * auto-protects streaks with savers, grants weekly savers, and snapshots the
 * weekly leaderboard. Idempotent within a day via settings.lastMaintenanceDay.
 */
export function runDailyMaintenance(familyId) {
  const settings = getSettings()
  const todayKey = localDayKey(new Date().toISOString())
  if (settings.lastMaintenanceDay === todayKey) return

  const firstRun = !settings.lastMaintenanceDay
  try {
    rollRecurringTasks(familyId)
    if (!firstRun) {
      protectStreaks(familyId)
    }
    grantWeeklySavers(familyId)
    snapshotLeaderboard(familyId)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[maintenance]', e)
  }
  updateSettings({ lastMaintenanceDay: todayKey })
}

function rollRecurringTasks(familyId) {
  const now = new Date()
  getAll('tasks')
    .filter((t) => t.family_id === familyId && t.status === 'active' && t.due_date && t.frequency !== 'once')
    .forEach((t) => {
      let due = new Date(t.due_date)
      if (due >= now) return
      const stepDays = t.frequency === 'weekly' ? 7 : 1
      while (due < now) due.setDate(due.getDate() + stepDays)
      update('tasks', t.id, { due_date: due.toISOString() })
    })
}

function protectStreaks(familyId) {
  if (!getSettings().allowStreakSavers) return
  const lastDay = getSettings().lastMaintenanceDay
  if (!lastDay) return
  getAll('users')
    .filter((u) => u.family_id === familyId && u.role === 'child')
    .forEach((child) => {
      // Look at the days between last maintenance and today (exclusive).
      const approvedDays = new Set(
        getAll('completions')
          .filter((c) => c.child_id === child.id && c.status === 'approved')
          .map((c) => localDayKey(c.approved_date || c.submitted_date))
      )
      const protectedDays = [...(child.protected_days || [])]
      let savers = child.streak_savers_available || 0
      const cursor = new Date()
      cursor.setDate(cursor.getDate() - 1) // start at yesterday
      for (let i = 0; i < 7 && savers > 0; i++) {
        const key = localDayKey(cursor.toISOString())
        if (key === lastDay) break
        if (!approvedDays.has(key) && !protectedDays.includes(key) && (child.streak_current || 0) > 0) {
          protectedDays.push(key)
          savers -= 1
          notify(child.id, 'family', 'Streak saved! 🛡️', 'A streak saver protected your streak for a missed day.', '/Settings')
        }
        cursor.setDate(cursor.getDate() - 1)
      }
      if (savers !== (child.streak_savers_available || 0)) {
        update('users', child.id, { streak_savers_available: savers, protected_days: protectedDays })
      }
      recomputeStreak(child.id)
    })
}

function grantWeeklySavers(familyId) {
  if (!getSettings().allowStreakSavers) return
  const week = isoWeekKey()
  if (getSettings().lastSaverWeek === week) return
  getAll('users')
    .filter((u) => u.family_id === familyId && u.role === 'child')
    .forEach((c) => update('users', c.id, (u) => ({ streak_savers_available: Math.min(3, (u.streak_savers_available || 0) + 1) })))
  updateSettings({ lastSaverWeek: week })
}

function snapshotLeaderboard(familyId) {
  const week = isoWeekKey()
  if (getSettings().lastSnapshotWeek == null) {
    // first run — just record the current week, don't snapshot a partial week
    updateSettings({ lastSnapshotWeek: week })
    return
  }
  if (getSettings().lastSnapshotWeek === week) return
  const children = getAll('users').filter((u) => u.family_id === familyId && u.role === 'child')
  if (children.length) {
    const standings = children
      .map((c) => ({ child_id: c.id, name: c.full_name, seeds: c.seed_balance || 0 }))
      .sort((a, b) => b.seeds - a.seeds)
    const end = new Date()
    const start = new Date(); start.setDate(start.getDate() - 7)
    create('leaderboardSnapshots', {
      family_id: familyId,
      week_start: start.toISOString(),
      week_end: end.toISOString(),
      winner_id: standings[0]?.child_id,
      winner_name: standings[0]?.name,
      standings,
    })
  }
  updateSettings({ lastSnapshotWeek: week })
}

export function lastWeekWinner(familyId) {
  const snaps = getAll('leaderboardSnapshots')
    .filter((s) => s.family_id === familyId)
    .sort((a, b) => new Date(b.week_end) - new Date(a.week_end))
  return snaps[0] || null
}

// ---------------------------------------------------------------- missions
/** How many of a mission's tasks have at least one approved completion. */
export function missionProgress(mission) {
  const approved = getAll('completions').filter((c) => c.status === 'approved')
  const doneIds = new Set(approved.map((c) => c.task_id))
  const done = (mission.task_ids || []).filter((id) => doneIds.has(id)).length
  return { done, total: (mission.task_ids || []).length }
}

export function completeMission(missionId) {
  const mission = getById('missions', missionId)
  if (!mission || mission.status === 'completed') return
  update('missions', missionId, { status: 'completed' })
  if (mission.seed_bonus) {
    getAll('users')
      .filter((u) => u.family_id === mission.family_id && u.role === 'child')
      .forEach((c) => awardSeeds(c.id, mission.seed_bonus, `${mission.title} complete!`))
  }
  addActivity(mission.family_id, null, 'goal_completed', `Mission complete: ${mission.title} 🚀`, 0)
  getAll('users')
    .filter((u) => u.family_id === mission.family_id)
    .forEach((u) => notify(u.id, 'family', 'Mission complete! 🚀', `"${mission.title}" was completed!`, '/Missions'))
}

export function buyStreakSaver(childId) {
  const COST = 5
  const child = getById('users', childId)
  if (!child) return false
  if ((child.seed_balance || 0) < COST) {
    toast({ title: 'Not enough seeds', message: `Streak savers cost ${COST}.`, type: 'error' })
    return false
  }
  if (deductSeeds(childId, COST, 'Streak Saver')) {
    update('users', childId, (c) => ({ streak_savers_available: (c.streak_savers_available || 0) + 1 }))
    toast({ title: 'Streak Saver bought! 🛡️', message: 'It will protect your streak if you miss a day.', emoji: '🛡️' })
    return true
  }
  return false
}
