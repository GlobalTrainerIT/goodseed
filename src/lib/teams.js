// Multiple teams/classes under one coach account.
//
// Each team is still its own group (a `family` with kind:'group'), but every
// team a coach makes carries the same `owner_key` — a stable per-device coach
// identity. That key is what lets ONE subscription (or org code) cover ALL of a
// coach's teams (see leader-coverage), and lets the switcher list them.
//
// The switcher itself works off a device-local list of {familyId, userId,...}:
// switching a team just logs into that team's coach user, which re-keys sync.
import { useSyncExternalStore } from 'react'
import { login } from './auth'
import { create, updateSettings, getSettings } from './db'
import { generateInviteCode } from './utils'
import { GROUP_TYPES } from './plan'
import { DEFAULT_POINT_PRESETS } from './constants'
import { DEFAULT_NOTIFICATION_PREFS } from './seedData'

const OWNER_KEY = 'goodseed_owner_key'
const TEAMS_KEY = 'goodseed_my_teams'

function uuid() {
  // Not crypto-critical (it only groups a coach's own teams); avoids needing
  // crypto in every environment.
  return 'own-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** This device's stable coach identity — created once, reused for every team. */
export function ensureOwnerKey() {
  let k = null
  try { k = localStorage.getItem(OWNER_KEY) } catch { /* ignore */ }
  if (!k) {
    k = uuid()
    try { localStorage.setItem(OWNER_KEY, k) } catch { /* ignore */ }
  }
  return k
}

// ---- local list of this coach's teams -------------------------------------
function load() {
  try { return JSON.parse(localStorage.getItem(TEAMS_KEY) || '[]') } catch { return [] }
}
let teams = load()
const listeners = new Set()
function emit() {
  try { localStorage.setItem(TEAMS_KEY, JSON.stringify(teams)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

/** Remember a team this device leads. {familyId, userId, name, emoji, type} */
export function registerTeam(entry) {
  if (teams.some((t) => t.familyId === entry.familyId)) {
    teams = teams.map((t) => (t.familyId === entry.familyId ? { ...t, ...entry } : t))
  } else {
    teams = [...teams, entry]
  }
  emit()
}

export function unregisterTeam(familyId) {
  teams = teams.filter((t) => t.familyId !== familyId)
  emit()
}

export function myTeams() {
  return teams
}

export function useMyTeams() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => teams,
    () => teams
  )
}

/** Switch which team is active: log into that team's coach user. */
export function switchTeam(familyId) {
  const t = teams.find((x) => x.familyId === familyId)
  if (t) login(t.userId)
  return t
}

/**
 * Create a group (team/class/etc.) led by this coach. Used for both the very
 * first team at signup and every "+ New team" afterward — each carries the same
 * owner_key, so coverage and the switcher treat them as one coach's teams.
 * Returns { group, coach }. Does NOT log in (caller decides).
 */
export function createCoachGroup({ name, typeId, coachName, email }) {
  const type = GROUP_TYPES.find((t) => t.id === typeId) || GROUP_TYPES[0]
  const ownerKey = ensureOwnerKey()
  const group = create('families', {
    name: name.trim(),
    invite_code: generateInviteCode(),
    avatar_emoji: type.emoji,
    plan: 'free',
    kind: 'group',
    group_type: type.id,
    owner_key: ownerKey,
  })
  const coach = create('users', {
    family_id: group.id,
    full_name: coachName.trim(),
    email: (email || '').trim(),
    role: 'parent',
    avatar_emoji: '🏅',
    avatar_bg_color: '#bfdbfe',
    seed_balance: 0,
    total_seeds_earned: 0,
    streak_current: 0,
    streak_longest: 0,
    streak_savers_available: 0,
    xp: 0,
    level: 1,
  })
  // Settings is a single shared object — seed the group defaults once, and let
  // the coach's customized behaviors carry across all their teams.
  const s = getSettings()
  if (!s?.pointPresets || s.seedName !== 'Points') {
    updateSettings({
      family_id: group.id,
      seedName: 'Points',
      seedNameSingular: 'Point',
      allowStreakSavers: false,
      enableSeedPacks: false,
      parentPin: '',
      parentPinEnabled: false,
      leaderboardMode: 'full',
      pointPresets: DEFAULT_POINT_PRESETS.map((p) => ({ ...p })),
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    })
  }
  registerTeam({ familyId: group.id, userId: coach.id, name: group.name, emoji: type.emoji, type: type.id })
  return { group, coach }
}
