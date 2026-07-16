// One permanent code per child — reused for every group they ever join.
//
// The code lives on the child's own record (not on any group), so joining
// soccer, school and church never mints extra codes: it just adds memberships
// under the same code. A parent hands the code out; a coach "adds by code" and
// the child is linked back home automatically (no separate follow step).
import { useSyncExternalStore } from 'react'
import { supabase, supabaseEnabled } from './supabase'
import { ensureSession } from './sync'
import { update, getById } from './db'
import { generateKidCode } from './utils'

// ---- the code itself ------------------------------------------------------
/** Returns the child's permanent code, creating it on first use (back-fills
 *  children who existed before codes). */
export function ensureKidCode(child) {
  if (!child) return null
  if (child.kid_code) return child.kid_code
  const code = generateKidCode()
  update('users', child.id, { kid_code: code })
  return code
}

/** New code for a child — invalidates every group's copy of the old one. */
export async function regenerateKidCode(child) {
  const oldCode = child?.kid_code
  const code = generateKidCode()
  update('users', child.id, { kid_code: code })
  if (supabaseEnabled && oldCode) {
    try {
      await ensureSession()
      await supabase.from('kid_links').update({ revoked: true }).eq('kid_code', oldCode)
    } catch {
      /* best effort — the old code no longer resolves to this child anyway */
    }
  }
  return code
}

// ---- coach: turn a code into a child, then link them ----------------------
export async function resolveKidCode(code) {
  if (!supabaseEnabled) return { error: 'Cloud sync is required.' }
  try {
    await ensureSession()
    const { data, error } = await supabase.functions.invoke('kid-code', {
      body: { action: 'resolve', code: String(code).trim().toUpperCase() },
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

/** Record that a home child now has a roster entry in this group. The unique
 *  (kid_code, group_family_id) constraint means re-adding is a no-op, so a kid
 *  can never end up in the same group twice. */
export async function linkKidToGroup({ kidCode, homeFamilyId, homeChildId, groupFamilyId, groupChildId, groupName }) {
  if (!supabaseEnabled) return { error: 'offline' }
  try {
    await ensureSession()
    const { error } = await supabase.from('kid_links').insert({
      kid_code: kidCode,
      home_family_id: homeFamilyId,
      home_child_id: homeChildId,
      group_family_id: groupFamilyId,
      group_child_id: groupChildId,
      group_name: groupName,
    })
    // The unique (kid_code, group_family_id) constraint is what guarantees a
    // kid can't be added to the same group twice — surface it as a clear
    // "already here" so the caller can undo the roster entry it just made.
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { error: 'already_in_group' }
      return { error: error.message }
    }
    return { ok: true }
  } catch (e) {
    return { error: String(e?.message || e) }
  }
}

// ---- parent: auto-discover every group a child is in ----------------------
let discovered = {} // { [childId]: [group, ...] }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

export async function fetchKidGroups(child) {
  const code = child?.kid_code
  if (!supabaseEnabled || !code) return []
  try {
    await ensureSession()
    const { data, error } = await supabase.functions.invoke('kid-code', {
      body: { action: 'groups', code },
    })
    if (error || !data?.groups) return []
    discovered = { ...discovered, [child.id]: data.groups }
    emit()
    return data.groups
  } catch {
    return []
  }
}

export async function refreshKidGroups(children = []) {
  await Promise.all(children.filter((c) => c?.kid_code).map((c) => fetchKidGroups(c)))
}

const version = () =>
  Object.values(discovered).reduce((s, gs) => s + gs.length * 1000 + gs.reduce((t, g) => t + (g.total_earned || 0), 0), 0)

export function useKidGroups() {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, version, version)
  return discovered
}

export function kidGroupsFor(childId) {
  return discovered[childId] || []
}
