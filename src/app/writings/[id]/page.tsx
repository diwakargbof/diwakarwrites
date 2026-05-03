import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: writing } = await supabase
    .from('writings')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (!writing) notFound()

  return (
    <main className="max-w-2xl mx-auto px-6 py-20">
      <Link href="/writings" className="text-sm text-gray-400 hover:text-gray-600 block mb-10">← All writings</Link>
      <p className="text-sm text-gray-400 mb-3">
        {new Date(writing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <h1 className="text-4xl font-bold mb-10">{writing.title}</h1>
      <article
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: writing.content }}
      />
    </main>
  )
}
