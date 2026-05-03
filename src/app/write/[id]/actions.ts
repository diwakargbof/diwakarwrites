'use server'

import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function saveWriting({
  id, title, content, published, section,
}: {
  id: string
  title: string
  content: string
  published: boolean
  section: string
}) {
  await supabase
    .from('writings')
    .update({ title, content, published, section, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function deleteWriting(id: string) {
  await supabase.from('writings').delete().eq('id', id)
  redirect('/write')
}
