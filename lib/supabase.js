/**
 * lib/supabase.js — Supabase client instances
 *
 * Two clients are exported:
 *
 *   supabase      — public anon client (respects Row Level Security).
 *                   Safe to use in browser-side code or low-privilege API routes.
 *
 *   supabaseAdmin — service-role client (bypasses RLS).
 *                   Used by all server-side API routes that need unrestricted
 *                   DB access.  NEVER expose the service role key to the browser.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL       — Project URL (safe to expose)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — Anon/public key (safe to expose)
 *   SUPABASE_SERVICE_ROLE_KEY      — Service role key (SERVER ONLY — never expose)
 */

import { createClient } from '@supabase/supabase-js';

// ── Validate required env vars at module load time ──────────────────────────
// Throwing here gives an immediate and clear error on cold start rather than
// a cryptic "cannot read property of undefined" deep inside a route handler.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl)     throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseAnonKey) throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');

// ── Public (anon) client ─────────────────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Admin (service-role) client ──────────────────────────────────────────────
// In production SUPABASE_SERVICE_ROLE_KEY MUST be set — API routes that bypass
// RLS will silently fail or return empty results if the anon key is used instead.
// We throw at startup so the deployment fails fast rather than silently misbehaving.
if (!serviceRoleKey) {
  // Allow missing key in test/CI environments where DB calls are mocked,
  // but warn loudly so developers notice immediately.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required in production. ' +
      'Add it in Vercel → Project → Settings → Environment Variables.'
    );
  }
  console.warn(
    '[TickGas] SUPABASE_SERVICE_ROLE_KEY not set. ' +
    'API routes will use the anon key — Row Level Security will apply and ' +
    'server-side operations that require elevated access WILL fail. ' +
    'This is acceptable in development only.'
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  // Use service role key when available; fall back to anon only outside production
  serviceRoleKey || supabaseAnonKey,
  {
    auth: {
      // Disable automatic token refresh — server-side clients don't have a
      // browser session to refresh from
      autoRefreshToken: false,
      persistSession:   false
    }
  }
);
