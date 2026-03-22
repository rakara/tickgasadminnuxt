/**
 * server/utils/supabase.ts
 * Auto-imported by Nitro into all server/api handlers.
 *
 * Exports two clients:
 *   supabaseAdmin  — service-role, bypasses RLS (server only)
 *   supabasePublic — anon client (RLS enforced)
 */

import { createClient } from '@supabase/supabase-js'

function getClients() {
  const config = useRuntimeConfig()

  const url      = config.public.supabaseUrl
  const anonKey  = config.public.supabaseAnonKey
  const svcKey   = config.supabaseServiceKey

  if (!url || !anonKey) {
    throw new Error('Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const admin = createClient(url, svcKey || anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const anon = createClient(url, anonKey)

  return { admin, anon }
}

export function useSupabaseAdmin() {
  return getClients().admin
}

export function useSupabasePublic() {
  return getClients().anon
}
