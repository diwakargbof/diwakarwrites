'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Book = {
  id: string; title: string; author: string
  status: 'reading' | 'read' | 'want_to_read'
  rating?: number; progress_pages?: number; total_pages?: number
}
type Film = {
  id: string; title: string; year?: number
  rating?: number; review?: string; watched_at?: string
}
type Show = {
  id: string; title: string
  status: 'watching' | 'finished' | 'dropped' | 'want_to_watch'
  current_season?: number; current_episode?: number; rating?: number
}

function Stars({ value, onChange }: { value?: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`star ${(hover || value || 0) >= n ? 'on' : ''}`}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>★</span>
      ))}
    </div>
  )
}

const SHOW_STATUSES: Show['status'][] = ['watching', 'finished', 'dropped', 'want_to_watch']
const STATUS_LABELS: Record<Show['status'], string> = {
  watching: 'watching', finished: 'finished', dropped: 'dropped', want_to_watch: 'want to watch',
}
const STATUS_COLOR: Record<Show['status'], string> = {
  watching: 'var(--accent)', finished: 'var(--ink-3)', dropped: 'var(--ink-4)', want_to_watch: 'var(--ink-3)',
}

export default function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'films' | 'shows'>('books')
  const [books, setBooks] = useState<Book[]>([])
  const [films, setFilms] = useState<Film[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', year: '', total_pages: '', review: '' })

  useEffect(() => { load() }, [tab])

  async function load() {
    if (tab === 'books') {
      const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
      if (data) setBooks(data as Book[])
    } else if (tab === 'films') {
      const { data } = await supabase.from('films').select('*').order('created_at', { ascending: false })
      if (data) setFilms(data as Film[])
    } else {
      const { data } = await supabase.from('shows').select('*').order('created_at', { ascending: false })
      if (data) setShows(data as Show[])
    }
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // ── Books ────────────────────────────────────────────────────────────

  async function addBook() {
    if (!form.title.trim()) return
    const { data } = await supabase.from('books').insert({
      title: form.title, author: form.author,
      total_pages: parseInt(form.total_pages) || null, status: 'want_to_read',
    }).select().single()
    if (data) { setBooks(p => [data as Book, ...p]); setAdding(false); setForm({ title: '', author: '', year: '', total_pages: '', review: '' }) }
  }

  async function rateBook(id: string, rating: number) {
    await supabase.from('books').update({ rating }).eq('id', id)
    setBooks(p => p.map(b => b.id === id ? { ...b, rating } : b))
  }

  async function setBookStatus(id: string, status: Book['status']) {
    await supabase.from('books').update({ status }).eq('id', id)
    setBooks(p => p.map(b => b.id === id ? { ...b, status } : b))
  }

  async function updateProgress(id: string, pages: number) {
    await supabase.from('books').update({ progress_pages: pages }).eq('id', id)
    setBooks(p => p.map(b => b.id === id ? { ...b, progress_pages: pages } : b))
  }

  async function deleteBook(id: string) {
    await supabase.from('books').delete().eq('id', id)
    setBooks(p => p.filter(b => b.id !== id))
  }

  // ── Films ────────────────────────────────────────────────────────────

  async function addFilm() {
    if (!form.title.trim()) return
    const { data } = await supabase.from('films').insert({
      title: form.title, year: parseInt(form.year) || null,
      review: form.review.trim() || null,
      watched_at: new Date().toISOString().split('T')[0],
    }).select().single()
    if (data) { setFilms(p => [data as Film, ...p]); setAdding(false); setForm({ title: '', author: '', year: '', total_pages: '', review: '' }) }
  }

  async function rateFilm(id: string, rating: number) {
    await supabase.from('films').update({ rating }).eq('id', id)
    setFilms(p => p.map(f => f.id === id ? { ...f, rating } : f))
  }

  async function updateFilmReview(id: string, review: string) {
    await supabase.from('films').update({ review }).eq('id', id)
    setFilms(p => p.map(f => f.id === id ? { ...f, review } : f))
  }

  async function deleteFilm(id: string) {
    await supabase.from('films').delete().eq('id', id)
    setFilms(p => p.filter(f => f.id !== id))
  }

  // ── Shows ────────────────────────────────────────────────────────────

  async function addShow() {
    if (!form.title.trim()) return
    const { data } = await supabase.from('shows').insert({
      title: form.title, status: 'watching', current_season: 1, current_episode: 1,
    }).select().single()
    if (data) { setShows(p => [data as Show, ...p]); setAdding(false); setForm({ title: '', author: '', year: '', total_pages: '', review: '' }) }
  }

  async function updateShow(id: string, updates: Partial<Show>) {
    await supabase.from('shows').update(updates).eq('id', id)
    setShows(p => p.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  async function deleteShow(id: string) {
    await supabase.from('shows').delete().eq('id', id)
    setShows(p => p.filter(s => s.id !== id))
  }

  // ── Partitions ───────────────────────────────────────────────────────

  const reading  = books.filter(b => b.status === 'reading')
  const read     = books.filter(b => b.status === 'read')
  const want     = books.filter(b => b.status === 'want_to_read')

  const inp = (placeholder: string, k: string, type = 'text') => (
    <input placeholder={placeholder} value={(form as Record<string, string>)[k]}
      onChange={e => f(k, e.target.value)} type={type}
      className="inp" style={{ fontFamily: type === 'number' ? 'var(--mono)' : 'var(--sans)' }} />
  )

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Library</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Books, films, and shows</p>
      </div>

      <div className="tabs">
        {(['books', 'films', 'shows'] as const).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); setAdding(false) }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm"
          style={{ marginBottom: 4, alignSelf: 'center' }}
          onClick={() => setAdding(p => !p)}>+ Add</button>
      </div>

      {/* ── Add forms ── */}
      {adding && tab === 'books' && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 8 }}>
            {inp('Title', 'title')} {inp('Author', 'author')} {inp('Pages', 'total_pages', 'number')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addBook}>Add book</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {adding && tab === 'films' && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
            {inp('Film title', 'title')} {inp('Year', 'year', 'number')}
          </div>
          <textarea placeholder="Your thoughts (optional)" value={form.review}
            onChange={e => f('review', e.target.value)}
            className="inp" style={{ resize: 'vertical', minHeight: 52, fontSize: 13, lineHeight: 1.5 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addFilm}>Add film</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {adding && tab === 'shows' && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inp('Show title', 'title')}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addShow}>Add show</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Books ── */}
      {tab === 'books' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          {reading.length > 0 && (
            <section>
              <span className="mono-label">CURRENTLY READING</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reading.map(b => (
                  <div key={b.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 19, marginBottom: 2 }}>{b.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>{b.author}</div>
                        {b.total_pages && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)', marginBottom: 5 }}>
                              <span>p. {b.progress_pages || 0} of {b.total_pages}</span>
                              <span>{Math.round(((b.progress_pages || 0) / b.total_pages) * 100)}%</span>
                            </div>
                            <div className="prog">
                              <div className="prog-fill" style={{ width: `${Math.min(((b.progress_pages || 0) / b.total_pages) * 100, 100)}%` }} />
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                              {[10, 25, 50].map(n => (
                                <button key={n} className="btn btn-sm"
                                  onClick={() => updateProgress(b.id, (b.progress_pages || 0) + n)}>+{n}p</button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                        <Stars value={b.rating} onChange={n => rateBook(b.id, n)} />
                        <button className="btn btn-sm" onClick={() => setBookStatus(b.id, 'read')}>Mark read ✓</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => deleteBook(b.id)}
                          style={{ color: 'var(--ink-4)', fontSize: 12 }}>remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <span className="mono-label">READ</span>
              <div className="row-list">
                {read.map(b => (
                  <div key={b.id} className="row-item">
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{b.title}</span>
                      {b.author && <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 8 }}>— {b.author}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Stars value={b.rating} onChange={n => rateBook(b.id, n)} />
                      <button onClick={() => deleteBook(b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {want.length > 0 && (
            <section>
              <span className="mono-label">WANT TO READ</span>
              <div className="row-list">
                {want.map(b => (
                  <div key={b.id} className="row-item">
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{b.title}</span>
                      {b.author && <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 8 }}>— {b.author}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button className="btn btn-sm" onClick={() => setBookStatus(b.id, 'reading')}>Start reading</button>
                      <button onClick={() => deleteBook(b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {books.length === 0 && (
            <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No books yet. Add one above.</p>
          )}
        </div>
      )}

      {/* ── Films ── */}
      {tab === 'films' && (
        <div>
          {films.length === 0
            ? <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No films logged yet.</p>
            : <div className="row-list">
                {films.map(f => (
                  <div key={f.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--rule)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: f.review ? 6 : 0 }}>
                          <span style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{f.title}</span>
                          {f.year && <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{f.year}</span>}
                        </div>
                        {/* Inline review — click to edit */}
                        <FilmReview value={f.review || ''} onSave={v => updateFilmReview(f.id, v)} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                        <Stars value={f.rating} onChange={n => rateFilm(f.id, n)} />
                        <button onClick={() => deleteFilm(f.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14 }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Shows ── */}
      {tab === 'shows' && (
        <div>
          {shows.length === 0
            ? <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No shows tracked yet.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {shows.map(s => (
                  <div key={s.id} style={{ padding: '18px 0', borderBottom: '1px solid var(--rule)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {/* Title + progress */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
                          <span style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{s.title}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                            S{String(s.current_season || 1).padStart(2, '0')} E{String(s.current_episode || 1).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* Status cycle */}
                          <button className="pill"
                            style={{ color: STATUS_COLOR[s.status], borderColor: STATUS_COLOR[s.status] }}
                            onClick={() => {
                              const next = SHOW_STATUSES[(SHOW_STATUSES.indexOf(s.status) + 1) % SHOW_STATUSES.length]
                              updateShow(s.id, { status: next })
                            }}>
                            {STATUS_LABELS[s.status]}
                          </button>

                          {s.status === 'watching' && (
                            <>
                              <button className="btn btn-sm"
                                onClick={() => updateShow(s.id, { current_episode: (s.current_episode || 1) + 1 })}>
                                +1 ep
                              </button>
                              <button className="btn btn-sm"
                                onClick={() => updateShow(s.id, {
                                  current_season: (s.current_season || 1) + 1,
                                  current_episode: 1,
                                })}>
                                next season
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                        <Stars value={s.rating} onChange={n => updateShow(s.id, { rating: n })} />
                        <button onClick={() => deleteShow(s.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14 }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  )
}

// Inline click-to-edit review for films
function FilmReview({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
        className="inp" style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.5, flex: 1, minHeight: 44 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="btn btn-sm btn-primary" onClick={() => { onSave(draft); setEditing(false) }}>Save</button>
        <button className="btn btn-sm" onClick={() => { setDraft(value); setEditing(false) }}>✕</button>
      </div>
    </div>
  )

  if (value) return (
    <div onClick={() => setEditing(true)} style={{
      fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic',
      cursor: 'text', lineHeight: 1.55,
    }}>{value}</div>
  )

  return (
    <button onClick={() => setEditing(true)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-4)', padding: 0, fontStyle: 'italic' }}>
      + add thoughts
    </button>
  )
}
