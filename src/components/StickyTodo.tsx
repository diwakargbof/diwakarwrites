'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

type Todo = { id: string; text: string; done: boolean }

export default function StickyTodo() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    supabase.from('todos').select('id,text,done').eq('date', TODAY).order('created_at')
      .then(({ data }) => { if (data) setTodos(data as Todo[]) })
  }, [])

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

  return (
    <div style={{
      background: '#fef9e7',
      borderRadius: 4,
      padding: '16px 18px',
      boxShadow: '2px 3px 12px rgba(0,0,0,0.07)',
      marginBottom: 24,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#a0893a', letterSpacing: '0.1em', marginBottom: 12 }}>
        TODAY&apos;S LIST
      </div>

      {todos.length === 0 && !input && (
        <p style={{ fontSize: 13, color: '#c4a85a', fontStyle: 'italic', fontFamily: 'var(--serif)', margin: '0 0 10px' }}>
          nothing yet
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: todos.length ? 10 : 0 }}>
        {todos.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id, !t.done)}
              style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#a0893a', flexShrink: 0 }}
            />
            <span
              onClick={() => remove(t.id)}
              title="click to remove"
              style={{
                flex: 1, fontSize: 13, fontFamily: 'var(--sans)',
                color: t.done ? '#c4a85a' : '#5a4a2a',
                textDecoration: t.done ? 'line-through' : 'none',
                cursor: 'pointer',
                lineHeight: 1.4,
              }}>
              {t.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="add a task…"
          style={{
            flex: 1, fontSize: 12, fontFamily: 'var(--sans)',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid #d4b96a',
            outline: 'none', padding: '2px 0',
            color: '#5a4a2a',
          }}
        />
        <button
          onClick={add}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: '#a0893a', lineHeight: 1, padding: '0 2px',
          }}>
          +
        </button>
      </div>
    </div>
  )
}
