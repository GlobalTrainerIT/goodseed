/**
 * Multi-device sync layer (local-first mirror).
 *
 * The in-memory store in db.js stays the synchronous source of truth for the UI.
 * This module mirrors it to Supabase: it loads a family's rows on login, pushes
 * every local write up, and applies realtime changes from other devices back
 * into the local store. With no Supabase configured it is entirely inert.
 *
 * The demo family is intentionally local-only (never synced).
 */
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
  if (!active()) return
  const row = rowFor(collection, record)
  if (!row || row.family_id !== activeFamilyId) return
  try {
    await supabase.from(RECORDS_TABLE).upsert(row, { onConflict: 'id' })
  } catch (e) {
    console.warn('[sync] upsert failed', e)
  }
}

async function pushDelete(_collection, id) {
  if (!active() || !id) return
  try {
    await supabase.from(RECORDS_TABLE).delete().eq('id', id)
  } catch (e) {
    console.warn('[sync] delete failed', e)
  }
}

function pushSettings(settings) {
  if (settings) pushUpsert('settings', settings)
}

// ---- remote reads ----------------------------------------------------------
async function fetchFamily(familyId) {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select('id,collection,data')
    .eq('family_id', familyId)
  if (error) {
    console.warn('[sync] fetch failed', error)
    return []
  }
  return data || []
}

export async function findFamilyByInviteCode(code) {
  if (!supabaseEnabled || !code) return null
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select('data')
    .eq('collection', 'families')
    .eq('data->>invite_code', code.trim().toUpperCase())
    .limit(1)
  if (error || !data || !data.length) return null
  return data[0].data
}

/** Load a family's data into the local store without subscribing (used pre-login). */
export async function loadFamilyData(familyId) {
  if (!supabaseEnabled || !familyId) return
  const rows = await fetchFamily(familyId)
  if (rows.length) bulkApplyRemote(rows)
}

// ---- lifecycle -------------------------------------------------------------
async function pushLocalMissing(familyId, remoteIds) {
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
      await supabase.from(RECORDS_TABLE).upsert(rows, { onConflict: 'id' })
    } catch (e) {
      console.warn('[sync] initial push failed', e)
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
          console.warn('[sync] realtime apply failed', e)
        }
      }
    )
    .subscribe()
}

export async function initSync(familyId) {
  if (!supabaseEnabled || !familyId || familyId === DEMO_FAMILY) return
  if (syncing && activeFamilyId === familyId) return
  await teardownSync()

  activeFamilyId = familyId
  syncing = true
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
}

export function isSyncing() {
  return active()
}
