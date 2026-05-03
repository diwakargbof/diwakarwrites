'use server'

import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function createWritingForm(formData: FormData) {
  const section = (formData.get('section') as string) || 'pieces'
  const manuscriptId = (formData.get('manuscript_id') as string) || undefined
  return createWriting(section, manuscriptId)
}

export async function createWriting(section = 'pieces', manuscriptId?: string) {
  const { data, error } = await supabase
    .from('writings')
    .insert({
      title: 'Untitled',
      content: '',
      published: false,
      section,
      manuscript_id: manuscriptId ?? null,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create writing')
  redirect(`/write/${data.id}`)
}

export async function createManuscript(formData: FormData) {
  const title = (formData.get('title') as string)?.trim() || 'Untitled Book'
  const genre = (formData.get('genre') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const target_words = parseInt(formData.get('target_words') as string) || 80000

  const { data, error } = await supabase
    .from('manuscripts')
    .insert({ title, genre, description, target_words })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create manuscript')
  redirect(`/write/book/${data.id}`)
}

export async function updateManuscript(id: string, updates: { title?: string; description?: string; genre?: string; target_words?: number }) {
  await supabase.from('manuscripts').update(updates).eq('id', id)
}

export async function deleteManuscript(id: string) {
  await supabase.from('manuscripts').delete().eq('id', id)
  redirect('/write/book')
}
