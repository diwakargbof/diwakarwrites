import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client. The key never reaches the browser — client
 * components talk to Supabase through the gated /api/db proxy instead.
 *
 * Prefers the service-role key when present (required once RLS is enabled,
 * see supabase-migrations/004_public_site.sql), falling back to the anon key.
 */
const url =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL

const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) throw new Error('Supabase URL / key is not configured')

export const supabaseUrl = url
export const supabaseKey = key

export const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
