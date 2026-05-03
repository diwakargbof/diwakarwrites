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
}
