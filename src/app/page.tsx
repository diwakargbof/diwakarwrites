import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const revalidate = 60

export default async function Home() {
  const { data: writings } = await supabase
    .from('writings')
    .select('id, title, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 52 }}>
        <h1 className="page-h" style={{ marginBottom: 10 }}>Diwakar's Notebook</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
          Writing, tracking, and living out loud.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 52 }}>
        <Link href="/habits" className="room-card">
          <span className="room-card-label">HABITS</span>
          <div className="room-card-title">Daily tracking</div>
          <div className="room-card-desc">Sleep, steps, water, food, strength</div>
        </Link>

        <Link href="/writings" className="room-card">
          <span className="room-card-label">WRITING</span>
          <div className="room-card-title">Words &amp; pages</div>
          <div className="room-card-desc">Diary, essays, and book chapters</div>
        </Link>

        <Link href="/library" className="room-card">
          <span className="room-card-label">LIBRARY</span>
          <div className="room-card-title">Books &amp; films</div>
          <div className="room-card-desc">What I&apos;m reading and watching</div>
        </Link>

        <Link href="/habits#workout" className="room-card">
          <span className="room-card-label">WORKOUT</span>
          <div className="room-card-title">Strength log</div>
          <div className="room-card-desc">Sets, reps, weight, PRs</div>
        </Link>
      </div>

      {writings && writings.length > 0 && (
        <div>
          <span className="mono-label">LATEST WRITING</span>
          <div className="row-list">
            {writings.map(w => (
              <Link key={w.id} href={`/writings/${w.id}`} className="row-item">
                <span className="row-title">{w.title}</span>
                <span className="row-meta">
                  {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
