import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ChatPanel from '@/components/ChatPanel'
import StickyTodo from '@/components/StickyTodo'

export const revalidate = 60

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

function expt(html: string, n = 110) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let count = 0
  let cur = today
  for (const d of sorted) {
    if (d === cur) {
      count++
      const dt = new Date(cur)
      dt.setDate(dt.getDate() - 1)
      cur = dt.toISOString().split('T')[0]
    } else break
  }
  return count
}

export default async function Home() {
  const [
    { data: logs },
    { data: writings },
    { data: books },
    { data: films },
    { data: shows },
  ] = await Promise.all([
    supabase.from('habit_logs').select('date').order('date', { ascending: false }).limit(60),
    supabase.from('writings').select('id,title,content,created_at,section').eq('published', true).order('created_at', { ascending: false }),
    supabase.from('books').select('*').order('created_at', { ascending: false }),
    supabase.from('films').select('*').order('created_at', { ascending: false }).limit(2),
    supabase.from('shows').select('id'),
  ])

  const streakDays   = calcStreak((logs ?? []).map(l => l.date))
  const diary        = (writings ?? []).filter(w => w.section === 'diary')
  const bookChapters = (writings ?? []).filter(w => w.section === 'book')
  const bookWords    = bookChapters.reduce((s, w) => s + wc(w.content), 0)
  const totalEntries = (writings ?? []).length
  const reading      = (books ?? []).find((b: { status: string }) => b.status === 'reading')
  const booksCount   = (books ?? []).length
  const mediaCount   = (films ?? []).length + (shows ?? []).length

  // 7×7 mini heatmap (last 49 days)
  const logSet = new Set((logs ?? []).map(l => l.date))
  const cells  = Array.from({ length: 49 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (48 - i))
    return logSet.has(d.toISOString().split('T')[0])
  })

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px 96px' }}>

      {/* ── Hero ── */}
      <section style={{ padding: '80px 0 64px', borderBottom: '1px solid var(--rule)', marginBottom: 52 }}>
        <div className="kicker" style={{ marginBottom: 24 }}>
          <span className="kicker-dot" />
          personal site · est. 2025
        </div>

        <h1 style={{
          fontFamily: 'var(--serif)', fontWeight: 400,
          fontSize: 'clamp(42px, 7vw, 72px)', lineHeight: 1.05,
          letterSpacing: '-0.025em', marginBottom: 24,
        }}>
          Diwakar&apos;s<br />
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>notebook</em>, gym log, &amp; library.
        </h1>

        <p style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 20, color: 'var(--ink-3)',
          maxWidth: 580, lineHeight: 1.65, marginBottom: 36,
        }}>
          A small, slow place on the internet. I track what I do with my body and what I
          do with my mind, and occasionally I write something down so I don&apos;t forget
          the difference.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/habits" style={{
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
            padding: '9px 20px', borderRadius: 4,
            background: 'var(--accent)', color: '#fff',
            border: '1px solid var(--accent)', textDecoration: 'none',
          }}>
            Open today
          </Link>
          <Link href="/write" style={{
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
            padding: '9px 20px', borderRadius: 4,
            background: 'transparent', color: 'var(--ink)',
            border: '1px solid var(--rule)', textDecoration: 'none',
          }}>
            Write something
          </Link>
        </div>
      </section>

      {/* ── Rooms kicker ── */}
      <div className="kicker" style={{ marginBottom: 16 }}>
        <span className="kicker-dot" /> rooms
      </div>

      {/* ── Rooms grid ── */}
      <div className="rooms-grid" style={{ marginBottom: 80 }}>

        {/* 01 — Habits (span 6) */}
        <Link href="/habits" className="home-room col-6">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>01</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.01em', marginTop: 10, marginBottom: 6 }}>Habits</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            The body, kept in good order. Sleep, steps, water, food, lifts.
          </div>
          {/* Mini heatmap */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, maxWidth: 168 }}>
            {cells.map((hit, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 2,
                background: hit ? 'var(--accent)' : 'var(--paper-2)',
                opacity: hit ? 0.85 : 1,
              }} />
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            <span>{streakDays > 0 ? `streak — ${streakDays} days` : 'start a streak today'}</span>
            <span className="room-arr">→</span>
          </div>
        </Link>

        {/* 02 — Writing (span 6) */}
        <Link href="/writings" className="home-room col-6">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>02</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.01em', marginTop: 10, marginBottom: 6 }}>Writing</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Diary, essays, the book-in-progress, marginalia.
          </div>
          {/* Mini bar chart */}
          <div style={{ marginTop: 20, display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
            {[30, 15, 55, 20, 42, 70, 25, 80, 35, 60, 22, 68, 40, 90].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`, borderRadius: 1,
                background: i === 13 ? 'var(--accent)' : 'var(--ink-3)',
                opacity: i === 13 ? 1 : 0.28,
              }} />
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            <span>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
            <span className="room-arr">→</span>
          </div>
        </Link>

        {/* 03 — The Book (span 4) */}
        <Link href="/writings" className="home-room col-4">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>03</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.01em', marginTop: 10, marginBottom: 6 }}>The Book</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            A novel. {bookWords.toLocaleString()} of 80,000 words.
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 3, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((bookWords / 80000) * 100, 100)}%`, background: 'var(--accent)' }} />
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{Math.round((bookWords / 80000) * 100)}% drafted</span>
              <span>{bookWords.toLocaleString()} / 80,000</span>
            </div>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            <span>chapter {bookChapters.length} of ?</span>
            <span className="room-arr">→</span>
          </div>
        </Link>

        {/* 04 — Books (span 4) */}
        <Link href="/library" className="home-room col-4">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>04</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.01em', marginTop: 10, marginBottom: 6 }}>Books</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>Read, reading, want to read.</div>
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            <span>{booksCount} on the shelf</span>
            <span className="room-arr">→</span>
          </div>
        </Link>

        {/* 05 — Films & Shows (span 4) */}
        <Link href="/library" className="home-room col-4">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>05</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.01em', marginTop: 10, marginBottom: 6 }}>Films &amp; shows</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>Watched and what I thought of them.</div>
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            <span>{mediaCount} logged</span>
            <span className="room-arr">→</span>
          </div>
        </Link>
      </div>

      {/* ── Bottom two-column ── */}
      <div className="two-col">

        {/* Latest from notebook */}
        <div>
          <div className="kicker" style={{ marginBottom: 12 }}>
            <span className="kicker-dot" /> latest
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.015em', marginBottom: 28, marginTop: 12 }}>
            From the notebook
          </h2>

          {diary.slice(0, 3).map(w => (
            <Link key={w.id} href={`/writings/${w.id}`} className="home-entry">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {new Date(w.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, letterSpacing: '-0.01em', marginBottom: 4 }}>{w.title}</div>
                {w.content && (
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.5 }}>{expt(w.content)}</div>
                )}
              </div>
              <div className="home-entry-wc" style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                {wc(w.content).toLocaleString()}w
              </div>
            </Link>
          ))}

          {diary.length === 0 && (
            <div style={{ padding: '32px 0', color: 'var(--ink-4)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15 }}>
              No diary entries yet.
            </div>
          )}
        </div>

        {/* What I'm into */}
        <div>
          <div className="kicker" style={{ marginBottom: 12 }}>
            <span className="kicker-dot" /> right now
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.015em', marginBottom: 28, marginTop: 12 }}>
            What I&apos;m into
          </h2>

          <StickyTodo />

          {/* Currently reading */}
          {reading ? (
            <Link href="/library" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 20 }}>
              <div style={{ background: 'var(--paper-2)', padding: 20, borderRadius: 6, display: 'grid', gridTemplateColumns: '72px 1fr', gap: 18, alignItems: 'center' }}>
                <div style={{
                  width: 72, height: 100, background: 'var(--rule)', borderRadius: 3,
                  display: 'flex', alignItems: 'flex-end', padding: 8,
                  fontFamily: 'var(--serif)', fontSize: 9, color: 'var(--ink-3)', lineHeight: 1.2,
                }}>
                  {reading.title}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                    currently reading
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 2 }}>{reading.title}</div>
                  <div style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>{reading.author}</div>
                  {reading.total_pages && (
                    <>
                      <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{ height: '100%', width: `${Math.min(((reading.progress_pages || 0) / reading.total_pages) * 100, 100)}%`, background: 'var(--accent)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                        <span>p. {reading.progress_pages || 0} / {reading.total_pages}</span>
                        <span>{Math.round(((reading.progress_pages || 0) / reading.total_pages) * 100)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/library" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
              <div style={{ background: 'var(--paper-2)', padding: '18px 20px', borderRadius: 6, color: 'var(--ink-4)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14 }}>
                No book in progress — add one in Library
              </div>
            </Link>
          )}

          {/* Recent films */}
          {(films ?? []).map((f: { id: string; title: string; year?: number; watched_at?: string; rating?: number }) => (
            <Link key={f.id} href="/library" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr auto', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--rule)', alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {f.watched_at ? new Date(f.watched_at).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : '—'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 2 }}>{f.title}</div>
                  {f.year && <div style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>{f.year}</div>}
                </div>
                {f.rating && (
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--accent)' }}>
                    {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                  </div>
                )}
              </div>
            </Link>
          ))}

          {!(films ?? []).length && !reading && (
            <p style={{ color: 'var(--ink-4)', fontSize: 13, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
              Add books and films to see them here.
            </p>
          )}
        </div>
      </div>

      <ChatPanel agent="coach" label="Daily Coach" placeholder="How's my day looking?" />
    </div>
  )
}
