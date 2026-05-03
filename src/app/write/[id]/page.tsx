import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import WritingEditor from './WritingEditor'

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: writing } = await supabase.from('writings').select('*').eq('id', id).single()

  if (!writing) notFound()

  return <WritingEditor writing={writing} />
}
