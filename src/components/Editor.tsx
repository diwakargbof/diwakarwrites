'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

type Props = { content: string; onChange: (html: string) => void }

export default function Editor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose-serif' },
    },
  })

  if (!editor) return null

  const ToolBtn = ({ label, action, active }: { label: string; action: () => void; active?: boolean }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); action() }}
      style={{
        fontFamily: 'var(--sans)',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        padding: '4px 10px',
        borderRadius: 4,
        border: 'none',
        cursor: 'pointer',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-3)',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 10px',
        borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)',
      }}>
        <ToolBtn label="B"       action={() => editor.chain().focus().toggleBold().run()}               active={editor.isActive('bold')} />
        <ToolBtn label="I"       action={() => editor.chain().focus().toggleItalic().run()}             active={editor.isActive('italic')} />
        <div style={{ width: 1, background: 'var(--rule)', margin: '2px 4px' }} />
        <ToolBtn label="H1"      action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} />
        <ToolBtn label="H2"      action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
        <ToolBtn label="H3"      action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} />
        <div style={{ width: 1, background: 'var(--rule)', margin: '2px 4px' }} />
        <ToolBtn label="• List"  action={() => editor.chain().focus().toggleBulletList().run()}         active={editor.isActive('bulletList')} />
        <ToolBtn label="1. List" action={() => editor.chain().focus().toggleOrderedList().run()}        active={editor.isActive('orderedList')} />
        <ToolBtn label='"'       action={() => editor.chain().focus().toggleBlockquote().run()}         active={editor.isActive('blockquote')} />
        <div style={{ width: 1, background: 'var(--rule)', margin: '2px 4px' }} />
        <ToolBtn label="—"       action={() => editor.chain().focus().setHorizontalRule().run()} />
      </div>

      {/* Content */}
      <div style={{ padding: '28px 32px', minHeight: '60vh' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
