'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

type Todo = {
  id: string
  date: string
  text: string
  done: boolean
  created_at: string
}

export default function TodayPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('date', TODAY)
      .order('created_at')
    if (data) setTodos(data as Todo[])
  }

  async function addTodo() {
    const text = input.trim()
    if (!text) return
    const { data } = await supabase
      .from('todos')
      .insert({ date: TODAY, text })
      .select()
      .single()
    if (data) {
      setTodos(p => [...p, data as Todo])
      setInput('')
      inputRef.current?.focus()
    }
  }

  async function toggle(id: string, done: boolean) {
    await supabase.from('todos').update({ done }).eq('id', id)
    setTodos(p => p.map(t => t.id === id ? { ...t, done } : t))
  }

  async function remove(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(p => p.filter(t => t.id !== id))
  }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Today</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            className="inp"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..."
            style={{ flex: 1, fontFamily: 'var(--sans)' }}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={addTodo}>Add</button>
        </div>
      </div>

      {todos.length === 0 && (
        <p style={{ color: 'var(--ink-4)', fontSize: 14, fontStyle: 'italic' }}>
          Nothing on the list yet.
        </p>
      )}

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          {pending.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i < pending.length - 1 ? '1px solid var(--rule)' : 'none',
            }}>
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggle(t.id, true)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 15, fontFamily: 'var(--serif)' }}>{t.text}</span>
              <button onClick={() => remove(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14, padding: '2px 6px' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <span className="mono-label">DONE — {done.length}</span>
          <div className="card">
            {done.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < done.length - 1 ? '1px solid var(--rule)' : 'none',
                opacity: 0.5,
              }}>
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggle(t.id, false)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 14, fontFamily: 'var(--serif)', textDecoration: 'line-through' }}>
                  {t.text}
                </span>
                <button onClick={() => remove(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14, padding: '2px 6px' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
