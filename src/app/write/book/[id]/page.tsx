import Link from 'next/link'
import { supabase, Manuscript } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import { createWritingForm } from '../../actions'

export const dynamic = 'force-dynamic'

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

export default async function ManuscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: m }, { data: chapters }] = await Promise.all([
    supabase.from('manuscripts').select('*').eq('id', id).single(),
    supabase.from('writings').select('*').eq('manuscript_id', id).order('created_at'),
  ])

  if (!m) notFound()
  const manuscript = m as Manuscript
  const all = chapters ?? []
  const totalWords = all.reduce((s, c) => s + wc(c.content || ''), 0)
  const pct = Math.round((totalWords / (manuscript.target_words || 80000)) * 100)

  async function handleDelete() {
    'use server'
    await supabase.from('manuscripts').delete().eq('id', id)
    redirect('/write/book')
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px 80px' }}>
      {/* Breadcrumb */}
      <Link href="/write/book" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', display: 'block', marginBottom: 36 }}>
        ← all books
      </Link>

      {/* Manuscript header */}
      <div style={{ marginBottom: 40 }}>
        {manuscript.genre && (
          <span className="mono-label" style={{ marginBottom: 8 }}>{manuscript.genre.toUpperCase()}</span>
        )}
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 10 }}>
          {manuscript.title}
        </h1>
        {manuscript.description && (
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16, maxWidth: 540 }}>
            {manuscript.description}
          </p>
        )}

        {/* Progress */}
        <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          <span>{all.length} chapter{all.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} words written</span>
          <span>{pct}% of {(manuscript.target_words || 80000).toLocaleString()}</span>
        </div>
        <div className="prog" style={{ marginBottom: 24 }}>
          <div className="prog-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <form action={createWritingForm}>
            <input type="hidden" name="section" value="book" />
            <input type="hidden" name="manuscript_id" value={id} />
            <button type="submit" className="btn btn-primary">+ New chapter</button>
          </form>
          <form action={handleDelete} onSubmit={() => confirm('Delete this manuscript? Chapters are kept but unlinked.')}>
            <button type="submit" className="btn" style={{ color: 'var(--ink-4)' }}>Delete manuscript</button>
          </form>
        </div>
      </div>

      <hr className="rule" style={{ marginBottom: 28 }} />

      {/* Chapter list */}
      {all.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: 16 }}>
            No chapters yet. Start writing your first one.
          </p>
          <form action={createWritingForm}>
            <input type="hidden" name="section" value="book" />
            <input type="hidden" name="manuscript_id" value={id} />
            <button type="submit" className="btn btn-primary">Write chapter one →</button>
          </form>
        </div>
      ) : (
        <div className="row-list">
          {all.map((c, i) => {
            const words = wc(c.content || '')
            return (
              <Link key={c.id} href={`/write/${c.id}`} className="row-item">
                <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>
                    Ch. {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="row-title">{c.title || 'Untitled'}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                      {words.toLocaleString()} words · {new Date(c.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                  background: c.published ? 'rgba(74,180,80,0.1)' : 'var(--paper-2)',
                  color: c.published ? '#3a9a3f' : 'var(--ink-4)',
                }}>
                  {c.published ? 'published' : 'draft'}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
