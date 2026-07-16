// Coach ↔ parent linking.
//
// Coach side: createParentLink() mints (or reuses) a per-kid capability code
// and stores it in group_links (RLS lets a group member write their own).
// Parent side: a local list of followed codes + fetchLinkPreview(), which asks
// the group-link edge function for that child's read-only points/announcements.
// The parent never joins the group and never writes group data.
import { useSyncExternalStore } from 'react'
import { supabase, supabaseEnabled } from './supabase'
import { ensureSession } from './sync'
import { generateInviteCode } from './utils'

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

// ---- parent: local list of followed groups (never synced) -----------------
const KEY = 'goodseed_followed_groups'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

let followed = load()
const listeners = new Set()

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(followed))
  } catch {
    /* ignore quota */
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
  emit()
}

export function useFollowedGroups() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => followed,
    () => followed
  )
}
