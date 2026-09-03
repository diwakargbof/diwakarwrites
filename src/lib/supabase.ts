import { createClient } from '@supabase/supabase-js'

/**
 * Browser Supabase client.
 *
 * It does NOT hold real credentials. Requests go to the same-origin /api/db
 * proxy, which checks the owner session before forwarding to Supabase with a
 * server-held key. That keeps every personal table unreachable to visitors —
 * previously the anon key shipped in the page bundle, so anyone could read
 * habit logs, expenses and drafts straight from the REST API.
 *
 * Server code should import `db` from '@/lib/db' instead.
 */
const base =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/db`
    : 'http://127.0.0.1/api/db' // never called: client code queries from effects

export const supabase = createClient(base, 'proxied', {
  auth: { persistSession: false, autoRefreshToken: false },
})

export type Writing = {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  published: boolean
  /** Visible on the public site. `published` alone only means "done", not "shared". */
  is_public?: boolean
  section?: string
  manuscript_id?: string | null
}

export type Manuscript = {
  id: string
  title: string
  description?: string | null
  genre?: string | null
  target_words: number
  created_at: string
}

export type BoardPost = {
  id: string
  name: string
  message: string
  created_at: string
  parent_id: string | null
  is_owner: boolean
  visibility: 'public' | 'private'
}
