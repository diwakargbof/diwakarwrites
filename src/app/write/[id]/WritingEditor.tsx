'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Editor from '@/components/Editor'
import { Writing } from '@/lib/supabase'
import { saveWriting, deleteWriting } from './actions'

export default function WritingEditor({ writing }: { writing: Writing }) {
  const [title, setTitle] = useState(writing.title)
  const [content, setContent] = useState(writing.content)
  const [published, setPublished] = useState(writing.published)
  const [saved, setSaved] = useState(true)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  const markDirty = useCallback(() => setSaved(false), [])

  const handleSave = () => {
    startSave(async () => {
      await saveWriting({ id: writing.id, title, content, published })
      setSaved(true)
    })
  }

  const handleDelete = async () => {
    if (!confirm('Delete this writing? This cannot be undone.')) return
    await deleteWriting(writing.id)
    router.push('/write')
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <Link href="/write" className="text-sm text-gray-400 hover:text-gray-600">← All writings</Link>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => { setPublished(e.target.checked); markDirty() }}
              className="accent-black"
            />
            Publish
          </label>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); markDirty() }}
        placeholder="Title"
        className="w-full text-3xl font-bold placeholder-gray-300 focus:outline-none mb-6"
      />

      <Editor
        content={content}
        onChange={(html) => { setContent(html); markDirty() }}
      />
    </main>
  )
}
