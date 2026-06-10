import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for multi-device sync. Entirely optional: if the env vars are
 * not set, `supabase` is null and the app runs fully offline on localStorage.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = Boolean(url && key)

export const supabase = supabaseEnabled
  ? createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

export const RECORDS_TABLE = 'records'
