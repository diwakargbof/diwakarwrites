'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Post = {
  id: string
  name: string
  message: string
  created_at: string
}

const KNOWN_NAMES = ['Diwakar']

export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('board_name')
    if (saved) setName(saved)
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('board_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setPosts(data as Post[])
  }

  async function post() {
    const n = name.trim()
    const m = message.trim()
    if (!n || !m) return
    setPosting(true)
    const { data } = await supabase
      .from('board_posts')
      .insert({ name: n, message: m })
      .select()
      .single()
    if (data) {
      setPosts(p => [data as Post, ...p])
      setMessage('')
      localStorage.setItem('board_name', n)
    }
    setPosting(false)
  }

  function fmt(ts: string) {
    const d = new Date(ts)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const canPost = !posting && name.trim().length > 0 && message.trim().length > 0

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Board</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
          leave a note — anyone can write here
        </p>
      </div>

      {/* Compose */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {KNOWN_NAMES.map(n => (
              <button key={n}
                className={`pill ${name === n ? 'on' : ''}`}
                onClick={() => setName(name === n ? '' : n)}
                style={{ fontSize: 12 }}>
                {n}
              </button>
            ))}
            <input
              className="inp"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="your name"
              style={{ flex: 1, minWidth: 120, fontFamily: 'var(--sans)', fontSize: 13 }}
            />
          </div>
          <textarea
            className="inp"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post() }}
            placeholder="What's on your mind?"
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>⌘↵ to post</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={post}
              disabled={!canPost}
              style={{ opacity: canPost ? 1 : 0.45 }}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>No posts yet. Be the first.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(p => (
            <div key={p.id} className="card card-flat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{fmt(p.created_at)}</span>
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                {p.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
