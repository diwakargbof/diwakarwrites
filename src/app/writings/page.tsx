import { supabase } from '@/lib/supabase'
import WritingHub from './WritingHub'

export const dynamic = 'force-dynamic'

export default async function WritingsPage() {
  const { data: writings } = await supabase
    .from('writings')
    .select('id, title, content, created_at, section')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return <WritingHub writings={writings ?? []} />
}
