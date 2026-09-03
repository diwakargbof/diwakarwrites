'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BoardPost } from '@/lib/supabase'

type Node = BoardPost & { replies: Node[] }

const MESSAGE_MAX = 2000
const MAX_INDENT = 5

function buildThreads(posts: BoardPost[]): Node[] {
  const nodes = new Map<string, Node>()
  for (const post of posts) nodes.set(post.id, { ...post, replies: [] })

  const roots: Node[] = []
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : null
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }

  const oldestFirst = (a: Node, b: Node) => a.created_at.localeCompare(b.created_at)
  for (const node of nodes.values()) node.replies.sort(oldestFirst)
  roots.sort((a, b) => b.created_at.localeCompare(a.created_at)) // newest thread on top

  return roots
}

function countReplies(node: Node): number {
  return node.replies.reduce((total, child) => total + 1 + countReplies(child), 0)
}

function fmt(ts: string) {
  const d = new Date(ts)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || '??'
}

export default function BoardClient({ admin }: { admin: boolean }) {
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [name, setName] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/board', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setPosts(json.posts ?? [])
        setFailed(false)
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!admin) {
      const saved = localStorage.getItem('board_name')
      if (saved) setName(saved)
    }
    load()
  }, [admin, load])

  const submit = useCallback(
    async (message: string, parentId: string | null) => {
      const who = admin ? 'Diwakar' : name.trim()
      if (!who || !message.trim()) return false

      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: who, message, parent_id: parentId }),
      })
      if (!res.ok) return false

      const { post } = await res.json()
      setPosts(p => [...p, post])
      if (!admin) localStorage.setItem('board_name', who)
      setReplyTo(null)
      return true
    },
    [admin, name],
  )

  async function setVisibility(id: string, visibility: 'public' | 'private') {
    setPosts(p => p.map(post => (post.id === id ? { ...post, visibility } : post)))
    await fetch(`/api/board/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    })
  }

  async function remove(id: string) {
    if (!confirm('Delete this note and every reply under it?')) return
    const res = await fetch(`/api/board/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const threads = useMemo(() => buildThreads(posts), [posts])

  return (
    <div className="board-wrap">
      <header style={{ marginBottom: 30 }}>
        <h1 className="board-title">Board</h1>
        <p className="board-sub">
          {admin
            ? 'Your notes stay hidden from visitors unless you mark one public. Everything else here is open.'
            : 'An open wall. Leave a note, or reply to one.'}
        </p>
      </header>

      <Composer
        admin={admin}
        name={name}
        onName={setName}
        onSubmit={message => submit(message, null)}
      />

      {loading ? (
        <p className="board-empty">Loading the wall...</p>
      ) : failed ? (
        <p className="board-empty">The board is not answering right now. Try a refresh.</p>
      ) : threads.length === 0 ? (
        <p className="board-empty">Nothing here yet. Be the first.</p>
      ) : (
        <div className="board-threads">
          {threads.map(node => (
            <article key={node.id} className="board-thread">
              <Thread
                node={node}
                depth={0}
                admin={admin}
                name={name}
                replyTo={replyTo}
                onReplyTo={setReplyTo}
                onSubmit={submit}
                onVisibility={setVisibility}
                onDelete={remove}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/* One post, plus every reply hanging off it. */

function Thread({
  node, depth, admin, name, replyTo, onReplyTo, onSubmit, onVisibility, onDelete,
}: {
  node: Node
  depth: number
  admin: boolean
  name: string
  replyTo: string | null
  onReplyTo: (id: string | null) => void
  onSubmit: (message: string, parentId: string | null) => Promise<boolean>
  onVisibility: (id: string, visibility: 'public' | 'private') => void
  onDelete: (id: string) => void
}) {
  const replies = countReplies(node)
  const open = replyTo === node.id
  const isPublic = node.visibility === 'public'

  return (
    <div className={depth === 0 ? 'board-post board-post-root' : 'board-post'}>
      <div className="board-post-head">
        <span className={node.is_owner ? 'board-avatar is-owner' : 'board-avatar'}>
          {initials(node.name)}
        </span>
        <span className="board-name">{node.name}</span>
        {node.is_owner && <span className="board-tag">host</span>}
        {admin && node.is_owner && (
          <button
            className={isPublic ? 'board-vis is-public' : 'board-vis'}
            onClick={() => onVisibility(node.id, isPublic ? 'private' : 'public')}
            title={isPublic ? 'Visitors can see this — click to hide it' : 'Only you can see this — click to share it'}
          >
            {isPublic ? 'public' : 'private'}
          </button>
        )}
        <span className="board-time">{fmt(node.created_at)}</span>
      </div>

      <p className="board-message">{node.message}</p>

      <div className="board-actions">
        <button className="board-link" onClick={() => onReplyTo(open ? null : node.id)}>
          {open ? 'cancel' : 'reply'}
        </button>
        {depth === 0 && replies > 0 && (
          <span className="board-count">
            {replies} {replies === 1 ? 'reply' : 'replies'}
          </span>
        )}
        {admin && (
          <button className="board-link board-link-danger" onClick={() => onDelete(node.id)}>
            delete
          </button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <ReplyBox admin={admin} name={name} onSubmit={message => onSubmit(message, node.id)} />
        </div>
      )}

      {node.replies.length > 0 && (
        <div className={depth < MAX_INDENT ? 'board-replies' : undefined}>
          {node.replies.map(child => (
            <Thread
              key={child.id}
              node={child}
              depth={depth + 1}
              admin={admin}
              name={name}
              replyTo={replyTo}
              onReplyTo={onReplyTo}
              onSubmit={onSubmit}
              onVisibility={onVisibility}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Composer({
  admin, name, onName, onSubmit,
}: {
  admin: boolean
  name: string
  onName: (v: string) => void
  onSubmit: (message: string) => Promise<boolean>
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = !busy && message.trim().length > 0 && (admin || name.trim().length > 0)

  async function send() {
    if (!ready) return
    setBusy(true)
    const ok = await onSubmit(message)
    setBusy(false)
    if (ok) setMessage('')
  }

  return (
    <div className="board-composer">
      {admin ? (
        <div className="board-as">
          posting as <strong>Diwakar</strong> — hidden from visitors until you mark it public
        </div>
      ) : (
        <input
          className="inp board-name-input"
          value={name}
          onChange={e => onName(e.target.value)}
          placeholder="your name"
          maxLength={40}
        />
      )}

      <textarea
        className="inp"
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
        placeholder="What's on your mind?"
        rows={3}
        maxLength={MESSAGE_MAX}
        style={{ resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.6 }}
      />

      <div className="board-composer-foot">
        <span className="board-hint">Ctrl/Cmd + Enter to post</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={send}
          disabled={!ready}
          style={{ opacity: ready ? 1 : 0.45 }}
        >
          {busy ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  )
}

function ReplyBox({
  admin, name, onSubmit,
}: {
  admin: boolean
  name: string
  onSubmit: (message: string) => Promise<boolean>
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = !busy && message.trim().length > 0 && (admin || name.trim().length > 0)

  async function send() {
    if (!ready) return
    setBusy(true)
    const ok = await onSubmit(message)
    setBusy(false)
    if (ok) setMessage('')
  }

  const placeholder = admin
    ? 'Reply...'
    : name.trim()
      ? `Reply as ${name.trim()}...`
      : 'Add your name above first...'

  return (
    <div className="board-replybox">
      <textarea
        className="inp"
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
        placeholder={placeholder}
        rows={2}
        maxLength={MESSAGE_MAX}
        autoFocus
        style={{ resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.6 }}
      />
      <div className="board-composer-foot">
        <span className="board-hint">Ctrl/Cmd + Enter to reply</span>
        <button
          className="btn btn-sm btn-primary"
          onClick={send}
          disabled={!ready}
          style={{ opacity: ready ? 1 : 0.45 }}
        >
          {busy ? 'Sending...' : 'Reply'}
        </button>
      </div>
    </div>
  )
}
