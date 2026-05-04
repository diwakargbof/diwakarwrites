'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ChatPanel from '@/components/ChatPanel'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'

const TODAY = new Date().toISOString().split('T')[0]
const TARGETS = {
  sleep: 7, steps: 13000, water: 3700, protein: 140,
  calories: 1900, fiber: 25, meditation: 20, pages_read: 30, pages_written: 2,
}
const MOODS = ['', '😞', '😐', '🙂', '😊', '😄']
const MOOD_LABELS = ['', 'rough', 'meh', 'okay', 'good', 'great']

type Log = {
  date: string
  sleep_hours: number
  sleep_time: string | null
  wake_time: string | null
  steps: number
  water_ml: number
  weight_kg: number | null
  chess_games: number
  chess_wins: number
  mood: number | null
  meditation_min: number
  pages_read: number
  pages_written: number
  face_care: boolean
  oral_care: boolean
  content_created: boolean
}

type Food = {
  id: string
  description: string
  calories: number
  protein_g: number
  fiber_g: number
  created_at: string
}

type HeatData = {
  date: string; score: number
  sleep_hours: number; steps: number; water_ml: number; weight_kg: number | null
  chess_games: number; chess_wins: number; mood: number | null
  meditation_min: number; pages_read: number; pages_written: number
  face_care: boolean; oral_care: boolean; content_created: boolean
}

const EMPTY_LOG: Log = {
  date: TODAY, sleep_hours: 0, sleep_time: null, wake_time: null,
  steps: 0, water_ml: 0, weight_kg: null,
  chess_games: 0, chess_wins: 0, mood: null,
  meditation_min: 0, pages_read: 0, pages_written: 0,
  face_care: false, oral_care: false, content_created: false,
}

function computeSleepHours(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let sleepMins = sh * 60 + sm
  let wakeMins  = wh * 60 + wm
  if (wakeMins <= sleepMins) wakeMins += 24 * 60 // crossed midnight
  return Math.round((wakeMins - sleepMins) / 6) / 10 // one decimal
}

// ── Shared sub-components ─────────────────────────────────────────────────

function Ring({ value, max, label }: { value: number; max: number; label: string }) {
  const size = 72, r = 28, circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={4}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle"
          style={{ fontFamily: 'var(--mono)', fontSize: 12, fill: 'var(--ink)', fontWeight: 500 }}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{label}</span>
    </div>
  )
}

function Sparkline({ values, width = 120, height = 40, color = 'var(--accent)' }: {
  values: number[]; width?: number; height?: number; color?: string
}) {
  if (values.length < 2) return null
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1
  const pad = 4
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = (height - pad) - ((v - min) / range) * (height - pad * 2) + pad
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = values[values.length - 1]
  const lastX = width
  const lastY = (height - pad) - ((last - min) / range) * (height - pad * 2) + pad
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  )
}

function TrendChart({ title, data, target, unit, fmt }: {
  title: string; data: number[]; target?: number; unit: string; fmt?: (v: number) => string
}) {
  const format = fmt || ((v: number) => `${Math.round(v)}${unit}`)
  const nonZero = data.filter(v => v > 0)
  if (nonZero.length < 3) return (
    <div className="card card-flat">
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>not enough data yet</div>
    </div>
  )
  const max = Math.max(...data, target || 0)
  const W = 260, H = 56
  const yOf = (v: number) => H - (max ? (v / max) * H : 0)
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const latest = data[data.length - 1]
  const avg = Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length)
  return (
    <div className="card card-flat">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{format(latest)}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        {target !== undefined && (
          <line x1={0} y1={yOf(target)} x2={W} y2={yOf(target)} stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="4 3" />
        )}
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={W} cy={yOf(latest)} r={3} fill="var(--accent)" />
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        <span>avg {format(avg)}</span>
        {target !== undefined && <span>target {format(target)}</span>}
      </div>
    </div>
  )
}

function NumInput({ value, onCommit, width = 72 }: { value: number; onCommit: (n: number) => void; width?: number }) {
  const [v, setV] = useState(value ? String(value) : '')
  useEffect(() => setV(value ? String(value) : ''), [value])
  return (
    <input value={v} onChange={e => setV(e.target.value)}
      onBlur={() => onCommit(parseFloat(v) || 0)}
      onKeyDown={e => e.key === 'Enter' && onCommit(parseFloat(v) || 0)}
      className="inp" style={{ width, fontFamily: 'var(--mono)', textAlign: 'right' }} />
  )
}

// ── Inline content brainstorm chat ────────────────────────────────────────

function ContentChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const transport = useRef(new DefaultChatTransport({ api: '/api/chat/content' })).current
  const { messages, sendMessage, status, setMessages } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function getText(m: UIMessage) {
    return m.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map(p => p.text).join('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 6, padding: '8px 16px',
          fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span>▶</span> Brainstorm ideas
      </button>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 8,
      overflow: 'hidden', marginTop: 4,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: 'var(--paper-2)',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#b07a2a', fontSize: 13 }}>▶</span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500 }}>Content brainstorm</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', padding: '2px 6px' }}>clear</button>
          )}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ maxHeight: 320, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
            Let&apos;s make something. Tell me what&apos;s on your mind — a rough idea, a theme, a platform — and I&apos;ll help you shape it.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            padding: '8px 12px',
            borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
            background: m.role === 'user' ? '#b07a2a' : 'var(--paper-2)',
            color: m.role === 'user' ? '#fff' : 'var(--ink)',
            fontSize: 13, lineHeight: 1.6,
            fontFamily: m.role === 'user' ? 'var(--sans)' : 'var(--serif)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {getText(m)}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: '10px 10px 10px 2px', background: 'var(--paper-2)' }}>
            <span style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ink-3)', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="What do you want to make today?"
          disabled={isLoading}
          style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 12, padding: '7px 10px', border: '1px solid var(--rule)', borderRadius: 6, background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none' }}
        />
        <button type="submit" disabled={isLoading || !input.trim()} style={{
          background: '#b07a2a', color: '#fff', border: 'none', borderRadius: 6,
          padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12,
          opacity: isLoading || !input.trim() ? 0.5 : 1,
        }}>
          {isLoading ? '…' : '↑'}
        </button>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const [tab, setTab] = useState<'today' | 'calendar'>('today')
  const [log, setLog] = useState<Log>(EMPTY_LOG)
  const [food, setFood] = useState<Food[]>([])
  const [foodInput, setFoodInput] = useState('')
  const [addingFood, setAddingFood] = useState(false)
  const [heatmap, setHeatmap] = useState<HeatData[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => { loadToday(); loadHeatmap() }, [])

  async function loadToday() {
    const { data: h } = await supabase.from('habit_logs').select('*').eq('date', TODAY).single()
    if (h) setLog({ ...EMPTY_LOG, ...h })
    const { data: f } = await supabase.from('food_entries').select('*').eq('date', TODAY).order('created_at')
    if (f) setFood(f as Food[])
  }

  async function loadHeatmap() {
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const fromStr = from.toISOString().split('T')[0]
    const [{ data: logs }, { data: foodDates }] = await Promise.all([
      supabase.from('habit_logs')
        .select('date,sleep_hours,steps,water_ml,weight_kg,chess_games,chess_wins,mood,meditation_min,pages_read,pages_written,face_care,oral_care,content_created')
        .gte('date', fromStr).order('date'),
      supabase.from('food_entries').select('date').gte('date', fromStr),
    ])
    const foodSet = new Set((foodDates || []).map((f: { date: string }) => f.date))
    if (logs) setHeatmap(logs.map(d => ({
      date: d.date,
      sleep_hours: d.sleep_hours || 0,
      steps: d.steps || 0,
      water_ml: d.water_ml || 0,
      weight_kg: d.weight_kg ?? null,
      chess_games: d.chess_games || 0,
      chess_wins: d.chess_wins || 0,
      mood: d.mood ?? null,
      meditation_min: d.meditation_min || 0,
      pages_read: d.pages_read || 0,
      pages_written: d.pages_written || 0,
      face_care: d.face_care || false,
      oral_care: d.oral_care || false,
      content_created: d.content_created || false,
      score: (
        Math.min((d.sleep_hours || 0) / TARGETS.sleep, 1) +
        Math.min((d.steps || 0) / TARGETS.steps, 1) +
        Math.min((d.water_ml || 0) / TARGETS.water, 1) +
        (foodSet.has(d.date) ? 1 : 0) +
        Math.min((d.meditation_min || 0) / TARGETS.meditation, 1) +
        Math.min((d.pages_read || 0) / TARGETS.pages_read, 1)
      ) / 6,
    })))
  }

  function update(field: keyof Log, value: number | boolean | string | null) {
    setLog(prev => {
      const next = { ...prev, [field]: value }
      supabase.from('habit_logs').upsert(next, { onConflict: 'date' }).then(({ error }) => {
        if (error) console.error('habit_logs upsert failed:', error)
      })
      return next
    })
  }

  function logChess(win: boolean) {
    setLog(prev => {
      const next = { ...prev, chess_games: prev.chess_games + 1, chess_wins: prev.chess_wins + (win ? 1 : 0) }
      supabase.from('habit_logs').upsert(next, { onConflict: 'date' }).then(({ error }) => {
        if (error) console.error('habit_logs upsert failed:', error)
      })
      return next
    })
  }

  function undoChess() {
    setLog(prev => {
      if (prev.chess_games === 0) return prev
      const next = { ...prev, chess_games: prev.chess_games - 1, chess_wins: Math.min(prev.chess_wins, prev.chess_games - 1) }
      supabase.from('habit_logs').upsert(next, { onConflict: 'date' }).then(({ error }) => {
        if (error) console.error('habit_logs upsert failed:', error)
      })
      return next
    })
  }

  async function logFood() {
    if (!foodInput.trim()) return
    const entry = { date: TODAY, meal_type: 'meal', description: foodInput, ...estimate(foodInput) }
    const { data } = await supabase.from('food_entries').insert(entry).select().single()
    if (data) setFood(p => [...p, data as Food])
    setFoodInput(''); setAddingFood(false)
  }

  async function deleteFood(id: string) {
    await supabase.from('food_entries').delete().eq('id', id)
    setFood(p => p.filter(f => f.id !== id))
  }

  const totals = food.reduce((a, f) => ({
    cal: a.cal + (f.calories || 0), prot: a.prot + (f.protein_g || 0), fiber: a.fiber + (f.fiber_g || 0),
  }), { cal: 0, prot: 0, fiber: 0 })

  const recent30 = heatmap.slice(-30)
  const sleepTrend      = recent30.map(d => d.sleep_hours)
  const stepsTrend      = recent30.map(d => d.steps)
  const chessTrend      = recent30.map(d => d.chess_games)
  const meditationTrend = recent30.map(d => d.meditation_min)
  const pagesReadTrend  = recent30.map(d => d.pages_read)
  const weightHistory   = heatmap.filter(d => d.weight_kg !== null).map(d => d.weight_kg as number)
  const weightTrend     = weightHistory.slice(-30)

  const selectedDay = selectedDate ? heatmap.find(d => d.date === selectedDate) : null

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Habits</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="tabs">
        {(['today', 'calendar'] as const).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── TODAY ── */}
      {tab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mood */}
          <div className="card">
            <span className="mono-label">HOW ARE YOU TODAY?</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className={`pill ${log.mood === n ? 'on' : ''}`}
                  onClick={() => update('mood', log.mood === n ? null : n)}>
                  {MOODS[n]} {MOOD_LABELS[n]}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div className="card">
            <span className="mono-label">TODAY&apos;S NUTRITION</span>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
              <Ring value={totals.cal}   max={TARGETS.calories} label="calories" />
              <Ring value={totals.prot}  max={TARGETS.protein}  label="protein" />
              <Ring value={totals.fiber} max={TARGETS.fiber}    label="fiber" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { v: totals.cal,               t: TARGETS.calories, u: 'kcal' },
                { v: Math.round(totals.prot),  t: TARGETS.protein,  u: 'g protein' },
                { v: Math.round(totals.fiber), t: TARGETS.fiber,    u: 'g fiber' },
              ].map(({ v, t, u }) => (
                <div key={u} style={{ textAlign: 'center' }}>
                  <div className="num num-sm">{v}</div>
                  <div className="num-target">/ {t} {u}</div>
                  <div className="prog" style={{ marginTop: 6 }}>
                    <div className="prog-fill" style={{ width: `${Math.min(v / t * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sleep / Steps / Water */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="card">
              <span className="mono-label">SLEEP</span>
              <div className="num">
                {log.sleep_hours || 0}
                <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>h</span>
              </div>
              <div className="num-target">/ {TARGETS.sleep}h target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.sleep_hours || 0) / TARGETS.sleep * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {([
                  { label: 'Bedtime', field: 'sleep_time' as const },
                  { label: 'Wake up', field: 'wake_time'  as const },
                ]).map(({ label, field }) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>{label}</span>
                    <input
                      type="time"
                      value={log[field] ?? ''}
                      onChange={e => {
                        const val = e.target.value || null
                        setLog(prev => {
                          const next = { ...prev, [field]: val }
                          if (next.sleep_time && next.wake_time) {
                            next.sleep_hours = computeSleepHours(next.sleep_time, next.wake_time)
                          }
                          supabase.from('habit_logs').upsert(next, { onConflict: 'date' }).then(({ error }) => {
                            if (error) console.error('habit_logs upsert failed:', error)
                          })
                          return next
                        })
                      }}
                      style={{
                        fontFamily: 'var(--mono)', fontSize: 12,
                        padding: '4px 8px', border: '1px solid var(--rule)',
                        borderRadius: 4, background: 'var(--paper-2)',
                        color: 'var(--ink)', outline: 'none', cursor: 'pointer',
                        colorScheme: 'light dark',
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <span className="mono-label">STEPS</span>
              <div className="num">{(log.steps || 0).toLocaleString()}</div>
              <div className="num-target">/ {TARGETS.steps.toLocaleString()} target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.steps || 0) / TARGETS.steps * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {[1000, 2000, 5000].map(n => (
                  <button key={n} className="btn btn-sm" onClick={() => update('steps', (log.steps || 0) + n)}>+{n / 1000}k</button>
                ))}
                <NumInput value={log.steps || 0} onCommit={v => update('steps', v)} />
              </div>
            </div>

            <div className="card">
              <span className="mono-label">WATER</span>
              <div className="num">{((log.water_ml || 0) / 1000).toFixed(1)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>L</span></div>
              <div className="num-target">/ {TARGETS.water / 1000}L target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.water_ml || 0) / TARGETS.water * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[250, 500, 750].map(n => (
                  <button key={n} className="btn btn-sm" onClick={() => update('water_ml', (log.water_ml || 0) + n)}>+{n}ml</button>
                ))}
                <button className="btn btn-sm" onClick={() => update('water_ml', 0)} style={{ color: 'var(--ink-4)' }}>reset</button>
              </div>
            </div>
          </div>

          {/* Meditation + Reading */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Meditation */}
            <div className="card">
              <span className="mono-label">MEDITATION</span>
              <div className="num">{log.meditation_min || 0}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>min</span></div>
              <div className="num-target">/ {TARGETS.meditation}min target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.meditation_min || 0) / TARGETS.meditation * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {[5, 10, 15, 20, 30].map(n => (
                  <button key={n} className="btn btn-sm"
                    onClick={() => update('meditation_min', (log.meditation_min || 0) + n)}>
                    +{n}
                  </button>
                ))}
                <button className="btn btn-sm btn-ghost" onClick={() => update('meditation_min', 0)} style={{ color: 'var(--ink-4)' }}>reset</button>
              </div>
              {log.meditation_min >= TARGETS.meditation && (
                <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: '#22a06b' }}>
                  ✓ target hit
                </div>
              )}
            </div>

            {/* Pages read */}
            <div className="card">
              <span className="mono-label">PAGES READ</span>
              <div className="num">{log.pages_read || 0}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>pp</span></div>
              <div className="num-target">/ {TARGETS.pages_read}pp target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.pages_read || 0) / TARGETS.pages_read * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {[10, 25, 50].map(n => (
                  <button key={n} className="btn btn-sm"
                    onClick={() => update('pages_read', (log.pages_read || 0) + n)}>
                    +{n}
                  </button>
                ))}
                <NumInput value={log.pages_read || 0} onCommit={v => update('pages_read', Math.round(v))} width={64} />
              </div>
            </div>
          </div>

          {/* Pages written + Self-care */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Pages written */}
            <div className="card">
              <span className="mono-label">PAGES WRITTEN</span>
              <div className="num">{log.pages_written || 0}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>pp</span></div>
              <div className="num-target">/ {TARGETS.pages_written}pp target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.pages_written || 0) / TARGETS.pages_written * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {[1, 2, 5].map(n => (
                  <button key={n} className="btn btn-sm"
                    onClick={() => update('pages_written', (log.pages_written || 0) + n)}>
                    +{n}
                  </button>
                ))}
                <NumInput value={log.pages_written || 0} onCommit={v => update('pages_written', v)} width={64} />
              </div>
            </div>

            {/* Self-care */}
            <div className="card">
              <span className="mono-label">SELF-CARE</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {([
                  { field: 'face_care',  emoji: '🧴', label: 'Face care' },
                  { field: 'oral_care',  emoji: '🪥', label: 'Oral care' },
                ] as const).map(({ field, emoji, label }) => (
                  <button key={field}
                    onClick={() => update(field, !log[field])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${log[field] ? '#22a06b' : 'var(--rule)'}`,
                      background: log[field] ? 'rgba(34,160,107,0.08)' : 'var(--paper-2)',
                      transition: 'all 0.15s', textAlign: 'left', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: log[field] ? '#22a06b' : 'var(--ink-2)', fontWeight: log[field] ? 500 : 400 }}>
                      {label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: log[field] ? '#22a06b' : 'var(--ink-4)' }}>
                      {log[field] ? '✓' : '○'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weight + Chess */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card">
              <span className="mono-label">WEIGHT</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="num num-sm">
                    {log.weight_kg !== null && log.weight_kg > 0 ? log.weight_kg : '—'}
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}> kg</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <NumInput value={log.weight_kg || 0} onCommit={v => update('weight_kg', v > 0 ? v : null)} width={80} />
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                      {weightHistory.length > 0 ? `prev: ${weightHistory[weightHistory.length - 1]}kg` : 'enter today\'s weight'}
                    </div>
                  </div>
                </div>
                {weightHistory.length >= 3 && <Sparkline values={weightHistory.slice(-14)} width={96} height={48} />}
              </div>
            </div>

            <div className="card">
              <span className="mono-label">CHESS</span>
              <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', marginBottom: 12 }}>
                <div>
                  <div className="num num-sm">{log.chess_games}</div>
                  <div className="num-target">games today</div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                  <span style={{ color: 'var(--accent)' }}>{log.chess_wins}W</span>
                  <span style={{ color: 'var(--ink-4)' }}> · {log.chess_games - log.chess_wins}L</span>
                  {log.chess_games > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                      {Math.round((log.chess_wins / log.chess_games) * 100)}% win rate
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" onClick={() => logChess(true)} style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>+ Win</button>
                <button className="btn btn-sm" onClick={() => logChess(false)}>+ Loss</button>
                {log.chess_games > 0 && <button className="btn btn-sm btn-ghost" onClick={undoChess} style={{ color: 'var(--ink-4)' }}>undo</button>}
              </div>
            </div>
          </div>

          {/* Content creation */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span className="mono-label" style={{ marginBottom: 4 }}>CONTENT CREATION</span>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Did you create something today?</div>
              </div>
              <button
                onClick={() => update('content_created', !log.content_created)}
                style={{
                  padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
                  border: `1px solid ${log.content_created ? '#22a06b' : 'var(--rule)'}`,
                  background: log.content_created ? 'rgba(34,160,107,0.08)' : 'var(--paper-2)',
                  color: log.content_created ? '#22a06b' : 'var(--ink-2)',
                  transition: 'all 0.15s',
                }}
              >
                {log.content_created ? '✓ Done' : '○ Not yet'}
              </button>
            </div>
            <ContentChat />
          </div>

          {/* Food log */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="mono-label" style={{ marginBottom: 0 }}>FOOD LOG</span>
              <button className="btn btn-sm" onClick={() => setAddingFood(p => !p)}>+ Add meal</button>
            </div>
            {addingFood && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="quick-input" value={foodInput} onChange={e => setFoodInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && logFood()}
                  placeholder="e.g. 3 eggs, oats, banana, 200ml milk" autoFocus />
                <button className="btn btn-primary btn-sm" onClick={logFood}>Log</button>
                <button className="btn btn-sm" onClick={() => setAddingFood(false)}>✕</button>
              </div>
            )}
            {food.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No meals logged yet.</p>
              : <div className="row-list">
                  {food.map(f => (
                    <div key={f.id} className="row-item" style={{ gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14 }}>{f.description}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {f.calories} kcal · {f.protein_g}g protein · {f.fiber_g}g fiber
                        </div>
                      </div>
                      <button onClick={() => deleteFood(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14, padding: '2px 6px' }}>✕</button>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Workout */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="mono-label" style={{ marginBottom: 4 }}>WORKOUT</span>
              <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>Log today&apos;s training session</div>
            </div>
            <Link href="/habits/workout" className="btn btn-primary">Open →</Link>
          </div>
        </div>
      )}

      {/* ── CALENDAR ── */}
      {tab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <HeatmapView data={heatmap} selected={selectedDate} onSelect={setSelectedDate} />

          {selectedDate && (
            <div className="card card-flat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className="mono-label" style={{ marginBottom: 0 }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(null)}>✕</button>
              </div>
              {selectedDay ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { label: 'sleep',      val: `${selectedDay.sleep_hours}h` },
                    { label: 'steps',      val: selectedDay.steps.toLocaleString() },
                    { label: 'water',      val: `${(selectedDay.water_ml / 1000).toFixed(1)}L` },
                    { label: 'weight',     val: selectedDay.weight_kg ? `${selectedDay.weight_kg}kg` : '—' },
                    { label: 'meditation', val: selectedDay.meditation_min > 0 ? `${selectedDay.meditation_min}min` : '—' },
                    { label: 'pages read', val: selectedDay.pages_read > 0 ? `${selectedDay.pages_read}pp` : '—' },
                    { label: 'pages written', val: selectedDay.pages_written > 0 ? `${selectedDay.pages_written}pp` : '—' },
                    { label: 'chess',      val: selectedDay.chess_games > 0 ? `${selectedDay.chess_games} (${selectedDay.chess_wins}W)` : '—' },
                    { label: 'mood',       val: selectedDay.mood ? `${MOODS[selectedDay.mood]} ${MOOD_LABELS[selectedDay.mood]}` : '—' },
                    { label: 'face care',  val: selectedDay.face_care ? '✓' : '—' },
                    { label: 'oral care',  val: selectedDay.oral_care ? '✓' : '—' },
                    { label: 'content',    val: selectedDay.content_created ? '✓' : '—' },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 15 }}>{val}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No data logged for this day.</p>
              )}
            </div>
          )}

          <div>
            <span className="mono-label">30-DAY TRENDS</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <TrendChart title="Sleep (h)" data={sleepTrend} target={TARGETS.sleep} unit="h" />
              <TrendChart title="Steps" data={stepsTrend} target={TARGETS.steps} unit="" fmt={v => `${(v / 1000).toFixed(1)}k`} />
              <TrendChart title="Meditation (min)" data={meditationTrend} target={TARGETS.meditation} unit="min" />
              <TrendChart title="Pages read" data={pagesReadTrend} target={TARGETS.pages_read} unit="pp" />
              {weightTrend.length >= 3 && <TrendChart title="Weight (kg)" data={weightTrend} unit="kg" fmt={v => `${v.toFixed(1)}kg`} />}
              {chessTrend.some(v => v > 0) && <TrendChart title="Chess games" data={chessTrend} unit="" />}
            </div>
          </div>
        </div>
      )}

      <ChatPanel agent="fitness" label="Fitness Coach" placeholder="How's my protein this week? What should I train today?" />
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────

function HeatmapView({ data, selected, onSelect }: {
  data: HeatData[]; selected: string | null; onSelect: (d: string | null) => void
}) {
  const scoreMap = new Map(data.map(d => [d.date, d.score]))
  const weeks: string[][] = []
  const now = new Date()
  const start = new Date(now); start.setDate(start.getDate() - 363 - start.getDay())
  const cur = new Date(start)
  while (cur <= now) {
    const w: string[] = []
    for (let d = 0; d < 7; d++) { w.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
    weeks.push(w)
  }

  const level = (date: string) => {
    if (date > TODAY) return ''
    const s = scoreMap.get(date)
    if (!s) return ''
    if (s > 0.8) return 'l4'; if (s > 0.6) return 'l3'; if (s > 0.3) return 'l2'; return 'l1'
  }

  const monthLabels: { label: string; col: number }[] = []
  weeks.forEach((week, wi) => {
    const d = new Date(week[0] + 'T12:00:00')
    if (d.getDate() <= 7) {
      const label = d.toLocaleDateString('en', { month: 'short' })
      if (!monthLabels.find(m => m.label === label)) monthLabels.push({ label, col: wi })
    }
  })

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div>
      <span className="mono-label">LAST 52 WEEKS — click any day to inspect · 6 habits scored</span>
      <div style={{ paddingLeft: 20, marginBottom: 3, height: 14, position: 'relative' }}>
        {monthLabels.map(({ label, col }) => (
          <span key={`${label}-${col}`} style={{ position: 'absolute', left: col * 15, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>{label}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 1 }}>
          {days.map((d, i) => (
            <div key={i} style={{ height: 12, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-4)', lineHeight: '12px', width: 10 }}>{d}</div>
          ))}
        </div>
        <div className="heatmap">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map(date => (
                <div key={date} className={`hm-cell ${level(date)}`} title={date}
                  onClick={() => date <= TODAY ? onSelect(date === selected ? null : date) : undefined}
                  style={{ cursor: date <= TODAY ? 'pointer' : 'default', outline: selected === date ? '2px solid var(--accent)' : 'none', outlineOffset: '1px' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 10, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
        <span>less</span>
        {(['', 'l1', 'l2', 'l3', 'l4'] as const).map(l => <div key={l} className={`hm-cell ${l}`} />)}
        <span>more</span>
        <span style={{ marginLeft: 12 }}>sleep · steps · water · food · meditation · reading</span>
      </div>
    </div>
  )
}

// ── Food estimator ────────────────────────────────────────────────────────

function estimate(text: string) {
  const t = text.toLowerCase()
  let cal = 0, protein_g = 0, fiber_g = 0
  const n = (pat: RegExp) => parseInt(t.match(pat)?.[1] || '1')
  if (t.includes('egg'))    { const c = n(/(\d+)\s*egg/); cal += 70 * c; protein_g += 6 * c }
  if (t.includes('oats') || t.includes('oatmeal')) { cal += 150; protein_g += 5; fiber_g += 4 }
  if (t.includes('banana')) { cal += 90; fiber_g += 3 }
  if (t.includes('milk'))   { cal += 120; protein_g += 8 }
  if (t.includes('rice'))   { cal += 200; fiber_g += 1 }
  if (t.includes('dal') || t.includes('lentil')) { cal += 150; protein_g += 10; fiber_g += 6 }
  if (t.includes('roti') || t.includes('chapati')) { const c = n(/(\d+)\s*roti/); cal += 80 * c; fiber_g += 2 * c }
  if (t.includes('chicken'))  { cal += 250; protein_g += 30 }
  if (t.includes('paneer'))   { cal += 180; protein_g += 14 }
  if (t.includes('whey') || t.includes('protein shake')) { cal += 130; protein_g += 25 }
  if (t.includes('curd') || t.includes('yogurt')) { cal += 100; protein_g += 8 }
  if (t.includes('apple'))  { cal += 80; fiber_g += 4 }
  if (t.includes('bread'))  { const c = n(/(\d+)\s*bread/); cal += 80 * c; protein_g += 3 * c }
  if (t.includes('peanut butter') || t.includes('pb')) { cal += 190; protein_g += 8; fiber_g += 2 }
  if (t.includes('coffee'))  { cal += 10 }
  if (t.includes('almonds') || t.includes('nuts')) { cal += 160; protein_g += 6; fiber_g += 3 }
  if (t.includes('salmon') || t.includes('fish')) { cal += 200; protein_g += 25 }
  if (t.includes('rajma') || t.includes('kidney bean')) { cal += 210; protein_g += 14; fiber_g += 8 }
  if (t.includes('samosa'))  { cal += 260; protein_g += 4; fiber_g += 2 }
  if (t.includes('dosa'))    { cal += 150; protein_g += 3; fiber_g += 1 }
  if (t.includes('idli'))    { const c = n(/(\d+)\s*idli/); cal += 40 * c; protein_g += 2 * c }
  return { calories: cal || 250, protein_g: protein_g || 8, fiber_g: fiber_g || 2 }
}
