'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { supabase, Manuscript } from '@/lib/supabase'
import ChatPanel from '@/components/ChatPanel'

type W = {
  id: string
  title: string
  content: string
  created_at: string
  section: string
  manuscript_id?: string | null
}

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

function expt(html: string, n = 180) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t
}

type Section = 'pieces' | 'diary' | 'book'

// ── Daily diary prompts (rotates by day of year) ────────────────────────
const PROMPTS = [
  "What did today feel like? Write a paragraph about that feeling.",
  "What's something you're pretending not to know?",
  "Describe a small moment from today you'd normally forget by next week.",
  "What conversation are you avoiding? What would you say if you weren't afraid?",
  "Describe where you are right now — the room, the light, the sounds.",
  "What are you grateful for today that you weren't a year ago?",
  "What happened this week that you're still thinking about?",
  "Write about someone you admire. What specifically do you admire?",
  "What did you want today that you didn't get?",
  "Where do you feel most like yourself?",
  "What's a belief you've been holding that might not be serving you?",
  "Write about something you're learning right now.",
  "What would you tell your past self about this period of your life?",
  "Describe your energy today — where it came from, where it went.",
  "What's a fear you've been sitting with lately?",
  "What are you looking forward to? Be specific.",
  "Write about a memory that surfaced unexpectedly today.",
  "What does success look like for you right now, honestly?",
  "Who influenced your thinking this week?",
  "What are you procrastinating on, and what's the real reason?",
  "Write about a choice you made recently. Would you make it again?",
  "What question are you carrying around right now?",
  "What did your body tell you today?",
  "Describe a moment this week when you felt at ease.",
  "What's something you started and haven't finished? How do you feel about it?",
  "Write about a place you keep returning to in your mind.",
  "What's the last thing that made you feel proud?",
  "What habit are you building, and why does it matter to you?",
  "Write about something you don't fully understand yet but want to.",
  "What would an honest account of today look like?",
  "What's something that surprised you about yourself recently?",
  "Write about a relationship that has changed in the past year.",
  "What are you holding onto that you should probably let go of?",
  "Describe a time you changed your mind about something important.",
  "What would your future self thank you for doing today?",
  "Write about something ordinary that has suddenly become meaningful.",
  "What's one thing no one knows you're working on?",
  "Describe the last time you felt completely present.",
  "What does rest look like for you right now?",
  "Write about something you're afraid to want.",
]

function getDailyPrompt() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return PROMPTS[day % PROMPTS.length]
}

// ── Main ────────────────────────────────────────────────────────────────

export default function WritingHub({ writings }: { writings: W[] }) {
  const [section, setSection] = useState<Section>('pieces')
  const [search, setSearch] = useState('')
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [selectedMs, setSelectedMs] = useState<Manuscript | null>(null)
  const [msLoaded, setMsLoaded] = useState(false)

  // Load manuscripts when book section is first opened
  useEffect(() => {
    if (section === 'book' && !msLoaded) {
      supabase.from('manuscripts').select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setManuscripts(data as Manuscript[]); setMsLoaded(true) })
    }
  }, [section, msLoaded])

  const pieces = useMemo(() => writings.filter(w => !w.section || w.section === 'pieces'), [writings])
  const diary  = useMemo(() => writings.filter(w => w.section === 'diary'), [writings])
  const book   = useMemo(() => writings.filter(w => w.section === 'book'), [writings])

  const totalWords = useMemo(() => writings.reduce((s, w) => s + wc(w.content), 0), [writings])

  const base = section === 'diary' ? diary : section === 'pieces' ? pieces : book
  const filtered = search.trim()
    ? base.filter(w => w.title.toLowerCase().includes(search.toLowerCase()) || w.content.toLowerCase().includes(search.toLowerCase()))
    : base

  const navItems: { key: Section; label: string; count: number }[] = [
    { key: 'pieces', label: 'pieces',   count: pieces.length },
    { key: 'diary',  label: 'diary',    count: diary.length },
    { key: 'book',   label: 'the book', count: manuscripts.length || book.length },
  ]

  const prompt = getDailyPrompt()

  return (
    <div className="page-wrap-wide">
      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <h1 className="page-h" style={{ marginBottom: 8 }}>Writing</h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          {writings.length} published · {totalWords.toLocaleString()} words total
        </p>
      </div>

      <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 160, flexShrink: 0, position: 'sticky', top: 'calc(var(--nav-h) + 28px)' }}>
          <div style={{ marginBottom: 28 }}>
            <span className="mono-label">SECTIONS</span>
            {navItems.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <button onClick={() => { setSection(s.key); setSelectedMs(null) }} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flex: 1, padding: '8px 10px', borderRadius: 5,
                  fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', border: 'none',
                  background: section === s.key ? 'var(--paper-2)' : 'transparent',
                  color: section === s.key ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: section === s.key ? 500 : 400, textAlign: 'left',
                  transition: 'background 0.12s, color 0.12s',
                }}>
                  <span>{s.label}</span>
                  {s.count > 0 && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{s.count}</span>
                  )}
                </button>
                {/* Quick-create link per section */}
                <Link href={`/write?create=${s.key}`} title={`New ${s.label} entry`} style={{
                  fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-4)',
                  textDecoration: 'none', padding: '4px 6px', borderRadius: 4,
                  transition: 'color 0.1s, background 0.1s', lineHeight: 1,
                }}>+</Link>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <span className="mono-label">SEARCH</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="search…" className="inp"
              style={{ fontSize: 12, padding: '7px 10px' }} />
          </div>

          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 18 }}>
            <span className="mono-label">STATS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'pieces',        val: pieces.length },
                { label: 'diary entries', val: diary.length },
                { label: 'manuscripts',   val: manuscripts.length },
                { label: 'total words',   val: totalWords.toLocaleString() },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── DIARY ── */}
          {section === 'diary' && (
            <div>
              {/* Prompt of the day */}
              <div className="card card-flat" style={{ marginBottom: 32 }}>
                <span className="mono-label">PROMPT OF THE DAY</span>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.55, color: 'var(--ink-2)', marginBottom: 14 }}>
                  {prompt}
                </p>
                <Link href="/write?create=diary" style={{
                  fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                }}>
                  Write today&apos;s entry →
                </Link>
              </div>

              {filtered.length === 0
                ? <Empty search={search} fallback="No diary entries published yet." />
                : filtered.map(w => {
                    const d = new Date(w.created_at)
                    const words = wc(w.content)
                    return (
                      <Link key={w.id} href={`/writings/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{ display: 'flex', gap: 28, padding: '26px 0', borderBottom: '1px solid var(--rule)', transition: 'opacity 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                          <div style={{ flexShrink: 0, width: 52, paddingTop: 2 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, lineHeight: 1 }}>
                              {String(d.getDate()).padStart(2, '0')}
                            </div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>
                              {d.toLocaleDateString('en', { month: 'short' }).toUpperCase()}<br />{d.getFullYear()}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, lineHeight: 1.25, marginBottom: 8 }}>
                              {w.title}
                            </div>
                            {w.content && (
                              <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.65, marginBottom: 10 }}>
                                {expt(w.content)}
                              </div>
                            )}
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                              {words.toLocaleString()} words
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })
              }
            </div>
          )}

          {/* ── PIECES ── */}
          {section === 'pieces' && (
            <div>
              {filtered.length === 0
                ? <Empty search={search} fallback="No pieces published yet." />
                : filtered.map(w => {
                    const words = wc(w.content)
                    return (
                      <Link key={w.id} href={`/writings/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--rule)', transition: 'opacity 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, lineHeight: 1.25, marginBottom: 10 }}>
                            {w.title}
                          </div>
                          {w.content && (
                            <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 12 }}>
                              {expt(w.content, 220)}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                              {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                              {words.toLocaleString()} words
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })
              }
            </div>
          )}

          {/* ── BOOK ── */}
          {section === 'book' && (
            selectedMs
              ? <ManuscriptView
                  manuscript={selectedMs}
                  chapters={writings.filter(w => w.manuscript_id === selectedMs.id)}
                  onBack={() => setSelectedMs(null)}
                />
              : <ManuscriptShelf
                  manuscripts={manuscripts}
                  writings={writings}
                  loaded={msLoaded}
                  onSelect={setSelectedMs}
                />
          )}
        </div>
      </div>

      <ChatPanel
        agent="writing"
        label="Writing Agent"
        placeholder="What should happen in the next chapter? Review my prose…"
        extraBody={selectedMs ? { manuscriptId: selectedMs.id } : undefined}
      />
    </div>
  )
}

// ── Manuscript shelf (book section default view) ──────────────────────

function ManuscriptShelf({ manuscripts, writings, loaded, onSelect }: {
  manuscripts: Manuscript[]
  writings: W[]
  loaded: boolean
  onSelect: (m: Manuscript) => void
}) {
  if (!loaded) return (
    <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>Loading…</p>
  )

  if (manuscripts.length === 0) return (
    <div style={{ paddingTop: 8 }}>
      <p style={{ fontSize: 14, color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: 20 }}>
        No manuscripts yet.
      </p>
      <Link href="/write/book" className="btn btn-primary">Create your first book →</Link>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <Link href="/write/book" className="btn btn-sm">+ New manuscript</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {manuscripts.map(m => {
          const chapters = writings.filter(w => w.manuscript_id === m.id)
          const words = chapters.reduce((s, w) => s + wc(w.content), 0)
          const pct = Math.round((words / (m.target_words || 80000)) * 100)
          return (
            <div key={m.id} className="card" style={{ cursor: 'pointer' }}
              onClick={() => onSelect(m)}>
              {m.genre && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  {m.genre}
                </span>
              )}
              <div style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 600, lineHeight: 1.2, marginBottom: 6, letterSpacing: '-0.02em' }}>
                {m.title}
              </div>
              {m.description && (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.5 }}>
                  {m.description.length > 100 ? m.description.slice(0, 100) + '…' : m.description}
                </div>
              )}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>
                {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} · {words.toLocaleString()} words
              </div>
              <div className="prog" style={{ marginBottom: 4 }}>
                <div className="prog-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                {pct}% toward {(m.target_words || 80000).toLocaleString()} words
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Single manuscript chapter list ────────────────────────────────────

function ManuscriptView({ manuscript, chapters, onBack }: {
  manuscript: Manuscript
  chapters: W[]
  onBack: () => void
}) {
  const totalWords = chapters.reduce((s, w) => s + wc(w.content), 0)
  const pct = Math.round((totalWords / (manuscript.target_words || 80000)) * 100)
  const firstChapter = chapters[0]

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', padding: 0, marginBottom: 28,
      }}>← all books</button>

      {/* Manuscript header */}
      <div style={{ marginBottom: 32 }}>
        {manuscript.genre && (
          <span className="mono-label" style={{ marginBottom: 6 }}>{manuscript.genre.toUpperCase()}</span>
        )}
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 6 }}>
          {manuscript.title}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>
          {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} words written
        </div>
        <div className="prog" style={{ marginBottom: 6 }}>
          <div className="prog-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginBottom: 24 }}>
          <span>{pct}% of {(manuscript.target_words || 80000).toLocaleString()} words</span>
          <Link href={`/write/book/${manuscript.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            manage →
          </Link>
        </div>
      </div>

      <hr className="rule" style={{ marginBottom: 24 }} />

      {/* Chapter list */}
      {chapters.length === 0 ? (
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: 16 }}>No chapters published yet.</p>
          <Link href={`/write/book/${manuscript.id}`} className="btn btn-primary btn-sm">Start writing →</Link>
        </div>
      ) : (
        <>
          {chapters.map((w, i) => {
            const words = wc(w.content)
            return (
              <Link key={w.id} href={`/writings/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  gap: 16, padding: '14px 0', borderBottom: '1px solid var(--rule)', transition: 'opacity 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.65')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>
                      Ch. {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{w.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                      {words.toLocaleString()} w
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                      {new Date(w.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Chapter one excerpt */}
          {firstChapter?.content && (
            <div style={{ marginTop: 52, paddingTop: 40, borderTop: '1px solid var(--rule)' }}>
              <span className="mono-label">CHAPTER ONE — EXCERPT</span>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.85, color: 'var(--ink-2)' }}>
                <span style={{
                  float: 'left', fontFamily: 'var(--serif)', fontSize: 68, lineHeight: 0.78,
                  paddingRight: 10, paddingTop: 8, color: 'var(--ink)', fontWeight: 700,
                }}>
                  {expt(firstChapter.content, 1).charAt(0)}
                </span>
                {expt(firstChapter.content, 520)}
              </div>
              <div style={{ clear: 'both', marginTop: 20 }}>
                <Link href={`/writings/${firstChapter.id}`}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                  continue reading →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Empty({ search, fallback }: { search: string; fallback: string }) {
  return (
    <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>
      {search ? `No results for "${search}".` : fallback}
    </p>
  )
}
