'use server'

import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function createWriting() {
  const { data, error } = await supabase
    .from('writings')
    .insert({ title: 'Untitled', content: '', published: false })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create writing')
  redirect(`/write/${data.id}`)
}
