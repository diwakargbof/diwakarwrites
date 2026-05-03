import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const revalidate = 60
export const dynamic = 'force-dynamic'

export default async function WritingsPage() {
  const { data: writings } = await supabase
    .from('writings')
    .select('id, title, created_at, section')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const pieces = writings?.filter(w => !w.section || w.section === 'pieces') ?? []
  const diary = writings?.filter(w => w.section === 'diary') ?? []
  const book = writings?.filter(w => w.section === 'book') ?? []

  const Section = ({ label, items }: { label: string; items: typeof pieces }) => (
    <section style={{ marginBottom: 44 }}>
      <span className="mono-label">{label}</span>
      <div className="row-list">
        {items.map(w => (
          <Link key={w.id} href={`/writings/${w.id}`} className="row-item">
            <span className="row-title">{w.title}</span>
            <span className="row-meta">
              {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 40 }}>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Writing</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Pieces, diary, and the ongoing book</p>
      </div>

      {pieces.length > 0 && <Section label="PIECES" items={pieces} />}
      {diary.length > 0 && <Section label="DIARY" items={diary} />}
      {book.length > 0 && <Section label="THE BOOK" items={book} />}

      {(!writings || writings.length === 0) && (
        <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>Nothing published yet.</p>
      )}
    </div>
  )
}
