import Link from 'next/link'
import { supabase, Writing } from '@/lib/supabase'
import { createWriting, createWritingForm } from './actions'
import PasswordGate from '@/components/PasswordGate'

export const dynamic = 'force-dynamic'

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>
}) {
  const params = await searchParams
  // ?create=diary|pieces|book → create draft with that section and redirect to editor
  if (params.create) {
    await createWriting(params.create)
  }

  const { data: writings } = await supabase
    .from('writings')
    .select('*')
    .order('updated_at', { ascending: false })

  const all = (writings ?? []) as (Writing & { section?: string })[]

  const pieces = all.filter(w => !w.section || w.section === 'pieces')
  const diary  = all.filter(w => w.section === 'diary')
  const book   = all.filter(w => w.section === 'book')

  const totalWords = all.reduce((s, w) => s + wc(w.content), 0)

  return (
    <PasswordGate>
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '52px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 44 }}>
        <div>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', display: 'block', marginBottom: 8 }}>← home</Link>
          <h1 className="page-h">Write</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
            {all.length} drafts · {totalWords.toLocaleString()} words total
          </p>
        </div>
        <Link href="/write/book" className="btn">
          📚 Manage books
        </Link>
      </div>

      {/* Three sections */}
      {[
        { key: 'pieces', label: 'Pieces', items: pieces, newLabel: '+ New piece' },
        { key: 'diary',  label: 'Diary',  items: diary,  newLabel: '+ New entry' },
        { key: 'book',   label: 'Book chapters', items: book, newLabel: '+ New chapter', bookLink: true },
      ].map(({ key, label, items, newLabel, bookLink }) => (
        <div key={key} style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="mono-label" style={{ marginBottom: 0 }}>{label.toUpperCase()}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {bookLink && (
                <Link href="/write/book" className="btn btn-sm">Manage manuscripts →</Link>
              )}
              <form action={createWritingForm}>
                <input type="hidden" name="section" value={key} />
                <button type="submit" className="btn btn-sm btn-primary">{newLabel}</button>
              </form>
            </div>
          </div>

          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>
              No {label.toLowerCase()} yet.
            </p>
          ) : (
            <div className="row-list">
              {items.map(w => (
                <Link key={w.id} href={`/write/${w.id}`} className="row-item">
                  <div style={{ flex: 1 }}>
                    <div className="row-title">{w.title || 'Untitled'}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                      {wc(w.content).toLocaleString()} words · {new Date(w.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                    background: w.published ? 'rgba(74,180,80,0.1)' : 'var(--paper-2)',
                    color: w.published ? '#3a9a3f' : 'var(--ink-4)',
                  }}>
                    {w.published ? 'published' : 'draft'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
    </PasswordGate>
  )
}
