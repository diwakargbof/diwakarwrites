import Link from 'next/link'
import { db as supabase } from '@/lib/db'
import type { Manuscript } from '@/lib/supabase'
import { createManuscript, deleteManuscript } from '../actions'

export const dynamic = 'force-dynamic'

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

export default async function BooksPage() {
  const [{ data: manuscripts }, { data: chapters }] = await Promise.all([
    supabase.from('manuscripts').select('*').order('created_at', { ascending: false }),
    supabase.from('writings').select('id, manuscript_id, content, title, published').not('manuscript_id', 'is', null),
  ])

  const all = (manuscripts ?? []) as Manuscript[]
  const allChapters = chapters ?? []

  const statsFor = (id: string) => {
    const ch = allChapters.filter(c => c.manuscript_id === id)
    return {
      chapters: ch.length,
      words: ch.reduce((s, c) => s + wc(c.content || ''), 0),
      published: ch.filter(c => c.published).length,
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '52px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <Link href="/write" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', display: 'block', marginBottom: 8 }}>← write</Link>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Books</h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          {all.length} manuscript{all.length !== 1 ? 's' : ''} in progress
        </p>
      </div>

      {/* Manuscript grid */}
      {all.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 52 }}>
          {all.map(m => {
            const s = statsFor(m.id)
            const pct = Math.round((s.words / (m.target_words || 80000)) * 100)
            return (
              <Link key={m.id} href={`/write/book/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ height: '100%', transition: 'border-color 0.15s', cursor: 'pointer' }}>
                  {m.genre && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {m.genre}
                    </span>
                  )}
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
                    {m.title}
                  </div>
                  {m.description && (
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.5 }}>{m.description}</div>
                  )}
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 12 }}>
                    {s.chapters} chapter{s.chapters !== 1 ? 's' : ''} · {s.words.toLocaleString()} words
                    {s.published > 0 && ` · ${s.published} published`}
                  </div>
                  <div className="prog" style={{ marginBottom: 4 }}>
                    <div className="prog-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                    {pct}% of {(m.target_words || 80000).toLocaleString()} words
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {all.length === 0 && (
        <p style={{ fontSize: 14, color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: 48 }}>
          No manuscripts yet. Create your first book below.
        </p>
      )}

      {/* New manuscript form */}
      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 36 }}>
        <span className="mono-label">NEW MANUSCRIPT</span>
        <form action={createManuscript} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input name="title" placeholder="Book title" required
            className="inp" style={{ fontFamily: 'var(--serif)', fontSize: 20, padding: '10px 14px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input name="genre" placeholder="Genre  (e.g. memoir, fiction, essays)"
              className="inp" />
            <input name="target_words" type="number" placeholder="Target words  (default 80,000)"
              className="inp" style={{ fontFamily: 'var(--mono)' }} />
          </div>
          <textarea name="description" placeholder="What is this book about? (optional)"
            className="inp" style={{ resize: 'vertical', minHeight: 72, lineHeight: 1.55, fontSize: 13 }} />
          <div>
            <button type="submit" className="btn btn-primary">Create manuscript →</button>
          </div>
        </form>
      </div>
    </div>
  )
}
