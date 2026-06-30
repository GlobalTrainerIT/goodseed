/**
 * Multi-device sync layer (local-first mirror).
 *
 * The in-memory store in db.js stays the synchronous source of truth for the UI.
 * This module mirrors it to Supabase: it loads a family's rows on login, pushes
 * every local write up, and applies realtime changes from other devices back
 * into the local store. With no Supabase configured it is entirely inert.
 *
 * Resilience: a circuit breaker stops hammering the backend when it's
 * unreachable (e.g. a paused free-tier project). Failures are logged once, not
 * per request, and a sync-status store drives an "offline" UI indicator. The
 * local store always remains authoritative when the cloud is down.
 *
 * The demo family is intentionally local-only (never synced).
 */
import { useSyncExternalStore } from 'react'
import { supabase, supabaseEnabled, RECORDS_TABLE } from './supabase'
import {
  COLLECTIONS,
  getAll,
  getById,
  getSettings,
  registerSyncHandlers,
  applyRemoteUpsert,
  applyRemoteDeleteById,
  bulkApplyRemote,
} from './db'

const DEMO_FAMILY = 'fam_demo'

let activeFamilyId = null
let channel = null
let syncing = false

// ---- sync status store -----------------------------------------------------
// 'local'  — no backend configured (pure localStorage)
// 'connecting' — attempting initial load
// 'online' — synced
// 'offline' — backend unreachable; circuit breaker open, running on-device
let status = supabaseEnabled ? 'connecting' : 'local'
const statusListeners = new Set()
function setStatus(next) {
  if (next === status) return
  status = next
  statusListeners.forEach((l) => l())
}
export function getSyncStatus() {
  return status
}
export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb)
      return () => statusListeners.delete(cb)
    },
    getSyncStatus,
    getSyncStatus
  )
}

// ---- circuit breaker -------------------------------------------------------
const MAX_FAILURES = 4
const COOLDOWN_MS = 60_000
let failures = 0
let breakerOpenUntil = 0
let loggedDown = false

function breakerOpen() {
  return Date.now() < breakerOpenUntil
}
function onSuccess() {
  failures = 0
  breakerOpenUntil = 0
  loggedDown = false
  if (active()) setStatus('online')
}
function onFailure(context, detail) {
  failures += 1
  if (failures >= MAX_FAILURES) {
    breakerOpenUntil = Date.now() + COOLDOWN_MS
    if (!loggedDown) {
      // Single throttled log instead of one per request.
      // eslint-disable-next-line no-console
      console.warn(`[sync] backend unreachable — pausing sync ~${COOLDOWN_MS / 1000}s (${context})`, detail || '')
      loggedDown = true
    }
  }
  if (active()) setStatus('offline')
}

/** Manually retry after the breaker tripped (e.g. user taps the offline chip). */
export async function retrySync() {
  failures = 0
  breakerOpenUntil = 0
  loggedDown = false
  if (activeFamilyId) {
    setStatus('connecting')
    const rows = await fetchFamily(activeFamilyId)
    if (rows.length) bulkApplyRemote(rows)
  }
}

// ---- row mapping -----------------------------------------------------------
function familyIdOf(collection, record) {
  if (collection === 'families') return record.id
  if (record.family_id) return record.family_id
  if (record.child_id) return getById('users', record.child_id)?.family_id
  return null
}

function rowFor(collection, record) {
  const family_id = familyIdOf(collection, record)
  if (!family_id) return null
  const id = collection === 'settings' ? `settings_${family_id}` : record.id
  return { id, family_id, collection, data: record, updated_at: new Date().toISOString() }
}

function active() {
  return supabaseEnabled && syncing && activeFamilyId && activeFamilyId !== DEMO_FAMILY
}

// ---- push handlers (called by db.js on local writes) -----------------------
async function pushUpsert(collection, record) {
  if (!active() || breakerOpen()) return
  const row = rowFor(collection, record)
  if (!row || row.family_id !== activeFamilyId) return
  try {
    const { error } = await supabase.from(RECORDS_TABLE).upsert(row, { onConflict: 'id' })
    if (error) onFailure('upsert', error.message)
    else onSuccess()
  } catch (e) {
    onFailure('upsert', String(e))
  }
}

async function pushDelete(_collection, id) {
  if (!active() || breakerOpen() || !id) return
  try {
    const { error } = await supabase.from(RECORDS_TABLE).delete().eq('id', id)
    if (error) onFailure('delete', error.message)
    else onSuccess()
  } catch (e) {
    onFailure('delete', String(e))
  }
}

function pushSettings(settings) {
  if (settings) pushUpsert('settings', settings)
}

// ---- remote reads ----------------------------------------------------------
async function fetchFamily(familyId) {
  if (breakerOpen()) return []
  try {
    const { data, error } = await supabase
      .from(RECORDS_TABLE)
      .select('id,collection,data')
      .eq('family_id', familyId)
    if (error) {
      onFailure('fetch', error.message)
      return []
    }
    onSuccess()
    return data || []
  } catch (e) {
    onFailure('fetch', String(e))
    return []
  }
}

// Look up + join a family by invite code (the join IS the membership grant),
// then load its data. Returns the full family record (with plan), or null.
export async function findFamilyByInviteCode(code) {
  if (!supabaseEnabled || !code || breakerOpen()) return null
  try {
    await ensureSession()
    const { data, error } = await supabase.rpc('join_family', { p_invite_code: code.trim() })
    if (error || !data || !data.length) {
      if (error) onFailure('lookup', error.message)
      return null
    }
    onSuccess()
    const fid = data[0].family_id
    await loadFamilyData(fid) // member now → can read the family's records
    return getById('families', fid) || { id: fid, name: data[0].name }
  } catch (e) {
    onFailure('lookup', String(e))
    return null
  }
}

/** Load a family's data into the local store without subscribing (used pre-login). */
export async function loadFamilyData(familyId) {
  if (!supabaseEnabled || !familyId) return
  const rows = await fetchFamily(familyId)
  if (rows.length) bulkApplyRemote(rows)
}

// ---- lifecycle -------------------------------------------------------------
async function pushLocalMissing(familyId, remoteIds) {
  if (breakerOpen()) return
  const rows = []
  COLLECTIONS.forEach((c) => {
    getAll(c).forEach((rec) => {
      const row = rowFor(c, rec)
      if (row && row.family_id === familyId && !remoteIds.has(row.id)) rows.push(row)
    })
  })
  const settings = getSettings()
  if (settings && settings.family_id === familyId) {
    const srow = rowFor('settings', settings)
    if (srow && !remoteIds.has(srow.id)) rows.push(srow)
  }
  if (rows.length) {
    try {
      const { error } = await supabase.from(RECORDS_TABLE).upsert(rows, { onConflict: 'id' })
      if (error) onFailure('initial push', error.message)
      else onSuccess()
    } catch (e) {
      onFailure('initial push', String(e))
    }
  }
}

function subscribe(familyId) {
  channel = supabase
    .channel(`goodseed:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: RECORDS_TABLE, filter: `family_id=eq.${familyId}` },
      (payload) => {
        try {
          if (payload.eventType === 'DELETE') {
            applyRemoteDeleteById(payload.old?.id)
          } else if (payload.new) {
            applyRemoteUpsert(payload.new.collection, payload.new.data)
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[sync] realtime apply failed', e)
        }
      }
    )
    .subscribe((channelStatus) => {
      if (channelStatus === 'SUBSCRIBED') onSuccess()
      else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
        if (active()) setStatus('offline')
      }
    })
}

// Ensure this device has an (anonymous) identity for membership-scoped RLS.
async function ensureSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return session
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.warn('[sync] anonymous sign-in failed', error.message)
      return null
    }
    return data.session
  } catch (e) {
    console.warn('[sync] session error', e)
    return null
  }
}

// Make this device a member of the family: join an existing cloud family by its
// invite code, or register a freshly-created local one. Idempotent.
async function claimFamily(family) {
  if (!family) return false
  try {
    const { error } = await supabase.rpc('join_family', { p_invite_code: family.invite_code })
    if (!error) return true
    const reg = await supabase.rpc('register_family', {
      p_family_id: family.id,
      p_invite_code: family.invite_code,
      p_name: family.name,
    })
    return !reg.error
  } catch (e) {
    console.warn('[sync] claim family failed', e)
    return false
  }
}

export async function initSync(familyId) {
  if (!supabaseEnabled || !familyId || familyId === DEMO_FAMILY) {
    setStatus('local')
    return
  }
  if (syncing && activeFamilyId === familyId) return
  await teardownSync()

  activeFamilyId = familyId
  syncing = true
  setStatus('connecting')

  // Establish device identity + family membership before any reads/writes
  // (required once records RLS is membership-scoped).
  const session = await ensureSession()
  if (session) await claimFamily(getById('families', familyId))

  registerSyncHandlers({ onUpsert: pushUpsert, onDelete: pushDelete, onSettings: pushSettings })

  const remote = await fetchFamily(familyId)
  const remoteIds = new Set(remote.map((r) => r.id))
  if (remote.length) bulkApplyRemote(remote)
  await pushLocalMissing(familyId, remoteIds)
  subscribe(familyId)
}

export async function teardownSync() {
  if (channel) {
    try {
      await supabase.removeChannel(channel)
    } catch {
      /* ignore */
    }
    channel = null
  }
  registerSyncHandlers({})
  syncing = false
  activeFamilyId = null
  setStatus(supabaseEnabled ? 'connecting' : 'local')
}

export function isSyncing() {
  return active()
}
