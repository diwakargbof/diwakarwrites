'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]
const CATEGORIES = ['kotak', 'bazaar', 'personal'] as const
type Category = typeof CATEGORIES[number]
type Todo = { id: string; date: string; text: string; done: boolean; category: Category }

export default function StickyTodo() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Category>('personal')
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('todos').select('id,date,text,done,category').eq('date', TODAY).order('created_at'),
      supabase.from('todos').select('id,date,text,done,category').lt('date', TODAY).eq('done', false).order('date').order('created_at'),
    ]).then(([{ data: todayData }, { data: pastData }]) => {
      setTodos([...(pastData ?? []), ...(todayData ?? [])] as Todo[])
    })
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
    const { data } = await supabase.from('todos').insert({ date: TODAY, text, category: tab }).select('id,date,text,done,category').single()
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

  const visible  = todos.filter(t => t.category === tab)
  const past     = visible.filter(t => t.date < TODAY)
  const todayTs  = visible.filter(t => t.date === TODAY)
  const pending  = todos.filter(t => !t.done).length

  function TodoRow({ t }: { t: Todo }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px' }}>
        <input type="checkbox" checked={t.done} onChange={() => toggle(t.id, !t.done)}
          style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 13, fontFamily: 'var(--sans)', lineHeight: 1.4,
          color: t.done ? 'var(--ink-4)' : 'var(--ink)',
          textDecoration: t.done ? 'line-through' : 'none',
        }}>
          {t.text}
        </span>
        <button onClick={() => remove(t.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 12, padding: '0 2px', flexShrink: 0 }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div ref={panelRef} style={{ position: 'fixed', bottom: 28, left: 28, zIndex: 50 }}>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: 0,
          width: 272,
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          overflow: 'hidden',
        }}>
          {/* Category tabs */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            borderBottom: '1px solid var(--rule)',
          }}>
            {CATEGORIES.map(c => {
              const count = todos.filter(t => t.category === c && !t.done).length
              return (
                <button key={c} onClick={() => { setTab(c); setTimeout(() => inputRef.current?.focus(), 40) }}
                  style={{
                    background: tab === c ? 'var(--paper)' : 'var(--paper-2)',
                    border: 'none',
                    borderRight: c !== 'personal' ? '1px solid var(--rule)' : 'none',
                    borderBottom: tab === c ? '2px solid var(--accent)' : '2px solid transparent',
                    padding: '8px 4px',
                    cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: tab === c ? 'var(--ink)' : 'var(--ink-4)',
                    letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    transition: 'color 0.1s',
                  }}>
                  {c}
                  {count > 0 && (
                    <span style={{
                      background: tab === c ? 'var(--accent)' : 'var(--ink-4)',
                      color: '#fff', borderRadius: 8,
                      padding: '0 4px', fontSize: 8, fontWeight: 600, lineHeight: '14px',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div style={{ maxHeight: 260, overflowY: 'auto', paddingTop: 4 }}>
            {visible.length === 0 && (
              <p style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', fontFamily: 'var(--serif)', margin: 0 }}>
                nothing here
              </p>
            )}

            {past.length > 0 && (
              <>
                <div style={{ padding: '4px 14px 2px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>
                  UNFINISHED
                </div>
                {past.map(t => <TodoRow key={t.id} t={t} />)}
                {todayTs.length > 0 && <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />}
              </>
            )}

            {todayTs.length > 0 && (
              <>
                {past.length > 0 && (
                  <div style={{ padding: '4px 14px 2px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>
                    TODAY
                  </div>
                )}
                {todayTs.map(t => <TodoRow key={t.id} t={t} />)}
              </>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--rule)', padding: '8px 14px' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={`add to ${tab}…`}
              style={{
                flex: 1, fontSize: 13, fontFamily: 'var(--sans)',
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--ink)', padding: '2px 0',
              }}
            />
            <button onClick={add}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--ink-3)', padding: '0 0 0 6px', lineHeight: 1 }}>
              +
            </button>
          </div>
        </div>
      )}

      {/* Trigger */}
      <button onClick={() => setOpen(v => !v)} title="Tasks"
        style={{
          width: 42, height: 42, borderRadius: '50%',
          background: open ? '#b04030' : '#c4502e',
          border: 'none',
          boxShadow: '0 2px 12px rgba(196,80,46,0.45)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18,
          transition: 'background 0.15s',
          position: 'relative',
        }}>
        ☑
        {pending > 0 && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#1a1614', color: '#fff',
            borderRadius: '50%', width: 17, height: 17,
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
