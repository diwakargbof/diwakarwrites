'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

type Todo = { id: string; text: string; done: boolean }

export default function StickyTodo() {
  const [open, setOpen] = useState(false)
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('todos').select('id,text,done').eq('date', TODAY).order('created_at')
      .then(({ data }) => { if (data) setTodos(data as Todo[]) })
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function add() {
    const text = input.trim()
    if (!text) return
    const { data } = await supabase.from('todos').insert({ date: TODAY, text }).select('id,text,done').single()
    if (data) { setTodos(p => [...p, data as Todo]); setInput('') }
  }

  async function toggle(id: string, done: boolean) {
    await supabase.from('todos').update({ done }).eq('id', id)
    setTodos(p => p.map(t => t.id === id ? { ...t, done } : t))
  }

  async function remove(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(p => p.filter(t => t.id !== id))
  }

  const pending = todos.filter(t => !t.done).length

  return (
    <div ref={panelRef} style={{ position: 'fixed', bottom: 28, left: 28, zIndex: 50 }}>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: 0,
          width: 272,
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--paper-2)',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
              TODAY
            </span>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>
              ×
            </button>
          </div>

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto', padding: '8px 0' }}>
            {todos.length === 0 && (
              <p style={{ padding: '8px 14px', fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', fontFamily: 'var(--serif)', margin: 0 }}>
                nothing here yet
              </p>
            )}
            {todos.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px',
              }}>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id, !t.done)}
                  style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontSize: 13, fontFamily: 'var(--sans)',
                  color: t.done ? 'var(--ink-4)' : 'var(--ink)',
                  textDecoration: t.done ? 'line-through' : 'none',
                  lineHeight: 1.4,
                }}>
                  {t.text}
                </span>
                <button onClick={() => remove(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 12, padding: '0 2px', flexShrink: 0, opacity: 0.6 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', gap: 0, alignItems: 'center',
            borderTop: '1px solid var(--rule)',
            padding: '8px 14px',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="add a task…"
              style={{
                flex: 1, fontSize: 13, fontFamily: 'var(--sans)',
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--ink)', padding: '2px 0',
              }}
            />
            <button onClick={add}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-3)', padding: '0 0 0 6px', lineHeight: 1 }}>
              +
            </button>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Today's tasks"
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: open ? 'var(--accent)' : 'var(--paper)',
          border: '1px solid var(--rule)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: open ? '#fff' : 'var(--ink-2)',
          transition: 'background 0.15s, color 0.15s',
          position: 'relative',
        }}
      >
        ✓
        {pending > 0 && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent)', color: '#fff',
            borderRadius: '50%', width: 16, height: 16,
            fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {pending}
          </span>
        )}
      </button>
    </div>
  )
}
