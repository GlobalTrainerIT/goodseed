import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for multi-device sync. Entirely optional: if the env vars are
 * not set, `supabase` is null and the app runs fully offline on localStorage.
 */
// The Supabase URL and anon/publishable key are PUBLIC by design — they ship in
// every client bundle and access is enforced by RLS. So we keep them as built-in
// defaults to guarantee the app is always backend-connected, regardless of how
// the host's build env vars are configured. Env vars override when present
// (e.g. to point at a different project).
const url = import.meta.env.VITE_SUPABASE_URL || 'https://jedqarsyvrpicvlztyrm.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DX-QsiePkj_AmvaGDnoxXw_9y1CM87H'

export const supabaseEnabled = Boolean(url && key)

export const supabase = supabaseEnabled
  ? createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

export const RECORDS_TABLE = 'records'
