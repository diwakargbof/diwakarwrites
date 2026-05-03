import Link from 'next/link'
import { supabase, Writing } from '@/lib/supabase'
import { createWriting } from './actions'

export const dynamic = 'force-dynamic'

export default async function WritePage() {
  const { data: writings } = await supabase
    .from('writings')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', display: 'block', marginBottom: 8 }}>← home</Link>
          <h1 className="page-h">My Writings</h1>
        </div>
        <form action={createWriting}>
          <button type="submit" className="btn btn-primary">+ New</button>
        </form>
      </div>

      {!writings || writings.length === 0 ? (
        <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No writings yet. Hit + New to start.</p>
      ) : (
        <div className="row-list">
          {(writings as (Writing & { section?: string })[]).map(w => (
            <Link key={w.id} href={`/write/${w.id}`} className="row-item">
              <div>
                <div className="row-title">{w.title || 'Untitled'}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                  {w.section || 'piece'} · {new Date(w.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 9px', borderRadius: 20,
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
  )
}
