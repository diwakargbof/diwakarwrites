import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Writing = {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  published: boolean
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
