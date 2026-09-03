'use server'

import { db as supabase } from '@/lib/db'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('unauthorized')
}

export async function saveWriting({
  id, title, content, published, isPublic, section,
}: {
  id: string
  title: string
  content: string
  published: boolean
  /** Marked for the public site. Independent of `published`, which just means "done". */
  isPublic: boolean
  section: string
}) {
  await requireAdmin()
  await supabase
    .from('writings')
    .update({
      title,
      content,
      published,
      is_public: isPublic,
      section,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export async function deleteWriting(id: string) {
  await requireAdmin()
  await supabase.from('writings').delete().eq('id', id)
  redirect('/write')
}
