// Coach ↔ parent linking + the home rollup.
//
// Coach side: createParentLink() mints (or reuses) a per-kid capability code.
// Parent side: a local list of followed codes (each tied to one of THIS
// family's children) + fetchLinkPreview(). Points earned in a group roll up
// to that child's "total earned everywhere" and grow their level/rank — but
// they are NOT added to the child's spendable home Seeds. Parents keep full
// control of the home reward shop; a coach can never fund a home reward.
import { useSyncExternalStore } from 'react'
import { supabase, supabaseEnabled } from './supabase'
import { ensureSession } from './sync'
import { generateInviteCode } from './utils'
import { LEVEL_THRESHOLDS } from './constants'
import { levelRank } from './faith'
import { kidGroupsFor } from './kidCode'

// ---- coach: mint a share code for one roster kid --------------------------
export async function createParentLink(child) {
  if (!supabaseEnabled || !child) return { error: 'Cloud sync is required to share.' }
  try {
    await ensureSession()
    const { data: existing } = await supabase
      .from('group_links').select('code')
      .eq('child_id', child.id).eq('revoked', false).limit(1)
    if (existing?.length) return { code: existing[0].code }
    const code = generateInviteCode()
    const { error } = await supabase.from('group_links').insert({
      code,
      family_id: child.family_id,
      child_id: child.id,
      child_name: child.full_name,
    })
    if (error) return { error: error.message }
    return { code }
  } catch (e) {
    return { error: String(e?.message || e) }
  }
}

// ---- parent: read a linked child's group snapshot -------------------------
export async function fetchLinkPreview(code) {
  if (!supabaseEnabled) return { error: 'offline' }
  try {
    const { data, error } = await supabase.functions.invoke('group-link', {
      body: { action: 'preview', code: String(code).trim().toUpperCase() },
    })
    if (error) {
      try {
        const ctx = await error.context?.json()
        return { error: ctx?.error || error.message }
      } catch {
        return { error: error.message }
      }
    }
    return data
  } catch (e) {
    return { error: String(e?.message || e) }
  }
}

// ---- parent: local followed-groups store + cached snapshots ---------------
const KEY = 'goodseed_followed_groups'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

let followed = load() // [{ code, childId, childName, groupName }]  (childId = THIS family's child)
let snapshots = {} // { [code]: previewData } — in-memory, refetched each session
const listeners = new Set()

function emit(persist = true) {
  if (persist) {
    try {
      localStorage.setItem(KEY, JSON.stringify(followed))
    } catch {
      /* ignore quota */
    }
  }
  listeners.forEach((l) => l())
}

export function addFollowedGroup(entry) {
  if (followed.some((f) => f.code === entry.code)) return
  followed = [...followed, entry]
  emit()
}

export function removeFollowedGroup(code) {
  followed = followed.filter((f) => f.code !== code)
  const { [code]: _drop, ...rest } = snapshots
  snapshots = rest
  emit()
}

function setSnapshot(code, data) {
  snapshots = { ...snapshots, [code]: data }
  emit(false) // snapshots aren't persisted
}

// Fetch previews for all followed codes and cache them (drives the rollup).
export async function refreshFollowed() {
  await Promise.all(
    followed.map(async (f) => {
      const r = await fetchLinkPreview(f.code)
      if (r && !r.error) setSnapshot(f.code, r)
    })
  )
}

const version = () => followed.length * 1e6 + Object.keys(snapshots).length + Object.values(snapshots).reduce((s, d) => s + (d?.total_earned || 0), 0)
export function useFollowedData() {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, version, version)
  return { followed, snapshots }
}

export function useFollowedGroups() {
  return useFollowedData().followed
}

// ---- the rollup: home + linked groups, for one family child ---------------
function levelFromXp(xp) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}

// Recognition rollup: groups add to the total & level, never to spendable Seeds.
// (Seeds contribute 2 XP each — same factor used when points are awarded — so a
// group's lifetime points grow the home level consistently.)
export function computeRollup(child) {
  const homeTotal = child?.total_seeds_earned || 0
  const homeXp = child?.xp || 0

  // Groups found automatically via the child's ONE permanent kid code.
  const auto = kidGroupsFor(child?.id).map((g) => ({
    code: g.group_family_id,
    name: g.group_name,
    total: g.total_earned ?? 0,
    points: g.points ?? 0,
    auto: true,
  }))

  // Legacy path: groups the parent linked by hand (for roster-only kids added
  // by name). Skip any already found by kid code so nothing double-counts.
  const seen = new Set(auto.map((g) => g.name))
  const manual = followed
    .filter((f) => f.childId === child?.id)
    .map((f) => {
      const snap = snapshots[f.code]
      return {
        code: f.code,
        name: snap?.group_name || f.groupName,
        total: snap?.total_earned ?? null, // null = not fetched yet
        points: snap?.points ?? null,
      }
    })
    .filter((g) => !seen.has(g.name))

  const groups = [...auto, ...manual]
  const groupTotal = groups.reduce((s, g) => s + (g.total || 0), 0)
  const grandTotal = homeTotal + groupTotal
  const level = levelFromXp(homeXp + groupTotal * 2)
  return { groups, homeTotal, groupTotal, grandTotal, level, rank: levelRank(level), hasGroups: groups.length > 0 }
}
