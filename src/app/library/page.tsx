'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Book = { id: string; title: string; author: string; status: 'reading' | 'read' | 'want_to_read'; rating?: number; progress_pages?: number; total_pages?: number }
type Film = { id: string; title: string; year?: number; rating?: number; review?: string; watched_at?: string }
type Show = { id: string; title: string; status: string; current_season?: number; current_episode?: number; rating?: number }

function Stars({ value, onChange }: { value?: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`star ${(hover || value || 0) >= n ? 'on' : ''}`}
          onClick={() => onChange?.(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>★</span>
      ))}
    </div>
  )
}

export default function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'films' | 'shows'>('books')
  const [books, setBooks] = useState<Book[]>([])
  const [films, setFilms] = useState<Film[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', year: '', total_pages: '' })

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

  const setForm1 = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function addBook() {
    if (!form.title.trim()) return
    const { data } = await supabase.from('books').insert({
      title: form.title, author: form.author,
      total_pages: parseInt(form.total_pages) || null, status: 'want_to_read',
    }).select().single()
    if (data) { setBooks(p => [data as Book, ...p]); setAdding(false); setForm({ title: '', author: '', year: '', total_pages: '' }) }
  }

  async function addFilm() {
    if (!form.title.trim()) return
    const { data } = await supabase.from('films').insert({
      title: form.title, year: parseInt(form.year) || null,
      watched_at: new Date().toISOString().split('T')[0],
    }).select().single()
    if (data) { setFilms(p => [data as Film, ...p]); setAdding(false); setForm({ title: '', author: '', year: '', total_pages: '' }) }
  }

  async function addShow() {
    if (!form.title.trim()) return
    const { data } = await supabase.from('shows').insert({
      title: form.title, status: 'watching', current_season: 1, current_episode: 1,
    }).select().single()
    if (data) { setShows(p => [data as Show, ...p]); setAdding(false); setForm({ title: '', author: '', year: '', total_pages: '' }) }
  }

  async function rateBook(id: string, rating: number) {
    await supabase.from('books').update({ rating }).eq('id', id)
    setBooks(p => p.map(b => b.id === id ? { ...b, rating } : b))
  }
  async function rateFilm(id: string, rating: number) {
    await supabase.from('films').update({ rating }).eq('id', id)
    setFilms(p => p.map(f => f.id === id ? { ...f, rating } : f))
  }
  async function setBookStatus(id: string, status: Book['status']) {
    await supabase.from('books').update({ status }).eq('id', id)
    setBooks(p => p.map(b => b.id === id ? { ...b, status } : b))
  }
  async function updateProgress(id: string, pages: number) {
    await supabase.from('books').update({ progress_pages: pages }).eq('id', id)
    setBooks(p => p.map(b => b.id === id ? { ...b, progress_pages: pages } : b))
  }

  const reading = books.filter(b => b.status === 'reading')
  const read = books.filter(b => b.status === 'read')
  const want = books.filter(b => b.status === 'want_to_read')

  const inp = (placeholder: string, k: string, type = 'text') => (
    <input placeholder={placeholder} value={(form as Record<string, string>)[k]}
      onChange={e => setForm1(k, e.target.value)} type={type}
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
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setAdding(false) }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" style={{ marginBottom: 4, alignSelf: 'center' }} onClick={() => setAdding(p => !p)}>
          + Add
        </button>
      </div>

      {/* Add forms */}
      {adding && tab === 'books' && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 8 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
            {inp('Film title', 'title')} {inp('Year', 'year', 'number')}
          </div>
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

      {/* Books */}
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
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                              {[10, 25, 50].map(n => (
                                <button key={n} className="btn btn-sm" onClick={() => updateProgress(b.id, (b.progress_pages || 0) + n)}>+{n}p</button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                        <Stars value={b.rating} onChange={n => rateBook(b.id, n)} />
                        <button className="btn btn-sm" onClick={() => setBookStatus(b.id, 'read')}>Mark read ✓</button>
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
                    <div>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{b.title}</span>
                      {b.author && <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 8 }}>— {b.author}</span>}
                    </div>
                    <Stars value={b.rating} onChange={n => rateBook(b.id, n)} />
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
                    <div>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{b.title}</span>
                      {b.author && <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 8 }}>— {b.author}</span>}
                    </div>
                    <button className="btn btn-sm" onClick={() => setBookStatus(b.id, 'reading')}>Start reading</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {books.length === 0 && <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No books yet. Add one to start.</p>}
        </div>
      )}

      {/* Films */}
      {tab === 'films' && (
        <div>
          {films.length === 0
            ? <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No films logged yet.</p>
            : <div className="row-list">
                {films.map(f => (
                  <div key={f.id} className="row-item">
                    <div>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{f.title}</span>
                      {f.year && <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-3)', marginLeft: 8 }}>{f.year}</span>}
                      {f.review && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>{f.review}</div>}
                    </div>
                    <Stars value={f.rating} onChange={n => rateFilm(f.id, n)} />
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Shows */}
      {tab === 'shows' && (
        <div>
          {shows.length === 0
            ? <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No shows tracked yet.</p>
            : <div className="row-list">
                {shows.map(s => (
                  <div key={s.id} className="row-item">
                    <div>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{s.title}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 10 }}>
                        S{s.current_season}E{s.current_episode}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: s.status === 'watching' ? 'var(--accent)' : 'var(--ink-3)' }}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  )
}
