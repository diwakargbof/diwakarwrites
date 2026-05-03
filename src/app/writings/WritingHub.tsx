'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type W = {
  id: string
  title: string
  content: string
  created_at: string
  section: string
}

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

function expt(html: string, n = 180) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t
}

type Section = 'pieces' | 'diary' | 'book'

export default function WritingHub({ writings }: { writings: W[] }) {
  const [section, setSection] = useState<Section>('pieces')
  const [search, setSearch] = useState('')

  const pieces = useMemo(() => writings.filter(w => !w.section || w.section === 'pieces'), [writings])
  const diary  = useMemo(() => writings.filter(w => w.section === 'diary'), [writings])
  const book   = useMemo(() => writings.filter(w => w.section === 'book'), [writings])

  const totalWords = useMemo(() => writings.reduce((s, w) => s + wc(w.content), 0), [writings])

  const base    = section === 'diary' ? diary : section === 'pieces' ? pieces : book
  const filtered = search.trim()
    ? base.filter(w => w.title.toLowerCase().includes(search.toLowerCase()) || w.content.toLowerCase().includes(search.toLowerCase()))
    : base

  const bookWords = book.reduce((s, w) => s + wc(w.content), 0)

  const navItems: { key: Section; label: string; count: number }[] = [
    { key: 'pieces', label: 'pieces',   count: pieces.length },
    { key: 'diary',  label: 'diary',    count: diary.length },
    { key: 'book',   label: 'the book', count: book.length },
  ]

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
              <button key={s.key} onClick={() => setSection(s.key)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '8px 10px', borderRadius: 5, marginBottom: 1,
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
                { label: 'chapters',      val: book.length },
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

        {/* ── Main ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── DIARY ── */}
          {section === 'diary' && (
            filtered.length === 0
              ? <Empty search={search} fallback="No diary entries published yet." />
              : <div>
                  {filtered.map(w => {
                    const d = new Date(w.created_at)
                    const words = wc(w.content)
                    return (
                      <Link key={w.id} href={`/writings/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{
                          display: 'flex', gap: 28, padding: '26px 0',
                          borderBottom: '1px solid var(--rule)',
                          transition: 'opacity 0.12s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                          {/* Date column */}
                          <div style={{ flexShrink: 0, width: 52, paddingTop: 2 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, lineHeight: 1, color: 'var(--ink)' }}>
                              {String(d.getDate()).padStart(2, '0')}
                            </div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>
                              {d.toLocaleDateString('en', { month: 'short' }).toUpperCase()}<br />
                              {d.getFullYear()}
                            </div>
                          </div>

                          {/* Body */}
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
                  })}
                </div>
          )}

          {/* ── PIECES ── */}
          {section === 'pieces' && (
            filtered.length === 0
              ? <Empty search={search} fallback="No pieces published yet." />
              : <div>
                  {filtered.map(w => {
                    const words = wc(w.content)
                    return (
                      <Link key={w.id} href={`/writings/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--rule)', transition: 'opacity 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
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
                  })}
                </div>
          )}

          {/* ── BOOK ── */}
          {section === 'book' && (
            book.length === 0
              ? <Empty search={search} fallback="No chapters published yet." />
              : <>
                  {/* Book header */}
                  <div style={{ marginBottom: 36 }}>
                    <span className="mono-label">MANUSCRIPT IN PROGRESS</span>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 6 }}>
                      Work in Progress
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>
                      {book.length} chapter{book.length !== 1 ? 's' : ''} · {bookWords.toLocaleString()} words written
                    </div>
                    <div className="prog" style={{ marginBottom: 6 }}>
                      <div className="prog-fill" style={{ width: `${Math.min((bookWords / 80000) * 100, 100)}%` }} />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                      {Math.round((bookWords / 80000) * 100)}% toward 80,000-word target
                    </div>
                  </div>

                  <hr className="rule" style={{ marginBottom: 28 }} />

                  {/* Chapter list */}
                  {filtered.map((w, i) => {
                    const words = wc(w.content)
                    return (
                      <Link key={w.id} href={`/writings/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{
                          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                          gap: 16, padding: '14px 0', borderBottom: '1px solid var(--rule)',
                          transition: 'opacity 0.12s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.65')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
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
                  {book[0]?.content && (
                    <div style={{ marginTop: 52, paddingTop: 40, borderTop: '1px solid var(--rule)' }}>
                      <span className="mono-label">CHAPTER ONE — EXCERPT</span>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.85, color: 'var(--ink-2)' }}>
                        <span style={{
                          float: 'left', fontFamily: 'var(--serif)', fontSize: 68, lineHeight: 0.78,
                          paddingRight: 10, paddingTop: 8, color: 'var(--ink)', fontWeight: 700,
                        }}>
                          {expt(book[0].content, 1).charAt(0)}
                        </span>
                        {expt(book[0].content, 520)}
                      </div>
                      <div style={{ clear: 'both', marginTop: 20 }}>
                        <Link href={`/writings/${book[0].id}`} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                          continue reading →
                        </Link>
                      </div>
                    </div>
                  )}
                </>
          )}
        </div>
      </div>
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
