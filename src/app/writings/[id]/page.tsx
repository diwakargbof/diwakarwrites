import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: w } = await supabase
    .from('writings').select('*').eq('id', id).eq('published', true).single()

  if (!w) notFound()

  return (
    <div className="page-wrap" style={{ maxWidth: 680 }}>
      <Link href="/writings" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', display: 'block', marginBottom: 40 }}>
        ← writings
      </Link>

      <div style={{ marginBottom: 48 }}>
        {w.section && (
          <span className="mono-label" style={{ marginBottom: 10 }}>{w.section.toUpperCase()}</span>
        )}
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: 14 }}>
          {w.title}
        </h1>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <hr className="rule" style={{ marginBottom: 40 }} />

      <div className="prose-serif" dangerouslySetInnerHTML={{ __html: w.content }} />
    </div>
  )
}
