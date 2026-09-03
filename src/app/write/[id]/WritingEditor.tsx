'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Editor from '@/components/Editor'
import { Writing } from '@/lib/supabase'
import { saveWriting, deleteWriting } from './actions'

const SECTIONS = [
  { value: 'pieces', label: 'Piece' },
  { value: 'diary', label: 'Diary' },
  { value: 'book', label: 'Book chapter' },
]

export default function WritingEditor({ writing }: { writing: Writing }) {
  const [title, setTitle] = useState(writing.title)
  const [content, setContent] = useState(writing.content)
  const [published, setPublished] = useState(writing.published)
  const [isPublic, setIsPublic] = useState(Boolean(writing.is_public))
  const [section, setSection] = useState((writing as Writing & { section?: string }).section ?? 'pieces')
  const [saved, setSaved] = useState(true)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  const markDirty = useCallback(() => setSaved(false), [])

  const handleSave = () => {
    startSave(async () => {
      await saveWriting({ id: writing.id, title, content, published, isPublic, section })
      setSaved(true)
    })
  }

  const handleDelete = async () => {
    if (!confirm('Delete this writing? This cannot be undone.')) return
    await deleteWriting(writing.id)
    router.push('/write')
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 12 }}>
        <Link href="/write" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}>
          ← all writings
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={section} onChange={e => { setSection(e.target.value); markDirty() }}
            style={{ fontFamily: 'var(--sans)', fontSize: 12, padding: '5px 10px', border: '1px solid var(--rule)', borderRadius: 'var(--r)', background: 'var(--paper)', color: 'var(--ink-2)', outline: 'none', cursor: 'pointer' }}>
            {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={published} onChange={e => { setPublished(e.target.checked); markDirty() }} style={{ accentColor: 'var(--accent)' }} />
            Publish
          </label>
          <label
            title="Anyone on the internet can read this piece"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none', color: isPublic ? 'var(--accent)' : 'var(--ink-3)', fontWeight: isPublic ? 600 : 400 }}
          >
            <input type="checkbox" checked={isPublic} onChange={e => { setIsPublic(e.target.checked); markDirty() }} style={{ accentColor: 'var(--accent)' }} />
            Public
          </label>
          <button onClick={handleSave} disabled={saving || saved} className="btn btn-primary"
            style={{ opacity: saved && !saving ? 0.5 : 1 }}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </button>
          <button onClick={handleDelete} style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: isPublic ? 'var(--accent)' : 'var(--ink-4)', marginBottom: 18 }}>
        {isPublic
          ? 'Public — this appears on the site for everyone.'
          : 'Private — only you can see this.'}
      </p>

      {/* Title */}
      <input type="text" value={title} onChange={e => { setTitle(e.target.value); markDirty() }}
        placeholder="Title"
        style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', marginBottom: 24 }} />

      {/* Editor */}
      <Editor content={content} onChange={html => { setContent(html); markDirty() }} />
    </div>
  )
}
