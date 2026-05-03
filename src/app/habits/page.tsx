'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ChatPanel from '@/components/ChatPanel'

const TODAY = new Date().toISOString().split('T')[0]
const TARGETS = { sleep: 7, steps: 13000, water: 3700, protein: 140, calories: 1900, fiber: 25 }
const MOODS = ['', '😞', '😐', '🙂', '😊', '😄']
const MOOD_LABELS = ['', 'rough', 'meh', 'okay', 'good', 'great']

type Log = {
  date: string
  sleep_hours: number
  steps: number
  water_ml: number
  weight_kg: number | null
  chess_games: number
  chess_wins: number
  mood: number | null
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
  date: string
  score: number
  sleep_hours: number
  steps: number
  water_ml: number
  weight_kg: number | null
  chess_games: number
  chess_wins: number
  mood: number | null
}

const EMPTY_LOG: Log = {
  date: TODAY, sleep_hours: 0, steps: 0, water_ml: 0,
  weight_kg: null, chess_games: 0, chess_wins: 0, mood: null,
}

// ── Components ──────────────────────────────────────────────────────────

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
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" />
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
          <line x1={0} y1={yOf(target)} x2={W} y2={yOf(target)}
            stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="4 3" />
        )}
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round" />
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

// ── Main page ────────────────────────────────────────────────────────────

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
        .select('date,sleep_hours,steps,water_ml,weight_kg,chess_games,chess_wins,mood')
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
      score: (
        Math.min((d.sleep_hours || 0) / TARGETS.sleep, 1) +
        Math.min((d.steps || 0) / TARGETS.steps, 1) +
        Math.min((d.water_ml || 0) / TARGETS.water, 1) +
        (foodSet.has(d.date) ? 1 : 0)
      ) / 4,
    })))
  }

  // Upsert helper — always merges with current log state
  function update(field: keyof Log, value: number | null) {
    setLog(prev => {
      const next = { ...prev, [field]: value }
      supabase.from('habit_logs').upsert(next, { onConflict: 'date' })
      return next
    })
  }

  function logChess(win: boolean) {
    setLog(prev => {
      const next = { ...prev, chess_games: prev.chess_games + 1, chess_wins: prev.chess_wins + (win ? 1 : 0) }
      supabase.from('habit_logs').upsert(next, { onConflict: 'date' })
      return next
    })
  }

  function undoChess() {
    setLog(prev => {
      if (prev.chess_games === 0) return prev
      const next = { ...prev, chess_games: prev.chess_games - 1, chess_wins: Math.min(prev.chess_wins, prev.chess_games - 1) }
      supabase.from('habit_logs').upsert(next, { onConflict: 'date' })
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

  // Derived trend arrays from heatmap data
  const recent30 = heatmap.slice(-30)
  const sleepTrend  = recent30.map(d => d.sleep_hours)
  const stepsTrend  = recent30.map(d => d.steps)
  const chessTrend  = recent30.map(d => d.chess_games)
  const weightHistory = heatmap.filter(d => d.weight_kg !== null).map(d => d.weight_kg as number)
  const weightTrend   = weightHistory.slice(-30)

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
              <Ring value={totals.cal}  max={TARGETS.calories} label="calories" />
              <Ring value={totals.prot} max={TARGETS.protein}  label="protein" />
              <Ring value={totals.fiber} max={TARGETS.fiber}   label="fiber" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { v: totals.cal,              t: TARGETS.calories, u: 'kcal' },
                { v: Math.round(totals.prot), t: TARGETS.protein,  u: 'g protein' },
                { v: Math.round(totals.fiber), t: TARGETS.fiber,   u: 'g fiber' },
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
              <div className="num">{log.sleep_hours || 0}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>h</span></div>
              <div className="num-target">/ {TARGETS.sleep}h target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min((log.sleep_hours || 0) / TARGETS.sleep * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(h => (
                  <button key={h} onClick={() => update('sleep_hours', h)} style={{
                    fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 6px',
                    border: '1px solid var(--rule)', borderRadius: 3, cursor: 'pointer',
                    background: log.sleep_hours === h ? 'var(--accent)' : 'var(--paper)',
                    color: log.sleep_hours === h ? '#fff' : 'var(--ink-3)',
                  }}>{h}</button>
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

          {/* Weight + Chess */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Weight */}
            <div className="card">
              <span className="mono-label">WEIGHT</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="num num-sm">
                    {log.weight_kg !== null && log.weight_kg > 0 ? log.weight_kg : '—'}
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}> kg</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <NumInput
                      value={log.weight_kg || 0}
                      onCommit={v => update('weight_kg', v > 0 ? v : null)}
                      width={80}
                    />
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                      {weightHistory.length > 0
                        ? `prev: ${weightHistory[weightHistory.length - 1]}kg`
                        : 'enter today\'s weight'}
                    </div>
                  </div>
                </div>
                {weightHistory.length >= 3 && (
                  <Sparkline values={weightHistory.slice(-14)} width={96} height={48} />
                )}
              </div>
            </div>

            {/* Chess */}
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
                <button className="btn btn-sm" onClick={() => logChess(true)}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>+ Win</button>
                <button className="btn btn-sm" onClick={() => logChess(false)}>+ Loss</button>
                {log.chess_games > 0 && (
                  <button className="btn btn-sm btn-ghost" onClick={undoChess}
                    style={{ color: 'var(--ink-4)' }}>undo</button>
                )}
              </div>
            </div>
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
                      <button onClick={() => deleteFood(f.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-4)', fontSize: 14, padding: '2px 6px',
                      }}>✕</button>
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

          {/* Day detail panel */}
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
                    { label: 'sleep',  val: `${selectedDay.sleep_hours}h` },
                    { label: 'steps',  val: selectedDay.steps.toLocaleString() },
                    { label: 'water',  val: `${(selectedDay.water_ml / 1000).toFixed(1)}L` },
                    { label: 'weight', val: selectedDay.weight_kg ? `${selectedDay.weight_kg}kg` : '—' },
                    { label: 'chess',  val: selectedDay.chess_games > 0 ? `${selectedDay.chess_games} games (${selectedDay.chess_wins}W)` : '—' },
                    { label: 'mood',   val: selectedDay.mood ? `${MOODS[selectedDay.mood]} ${MOOD_LABELS[selectedDay.mood]}` : '—' },
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

          {/* Trend charts */}
          <div>
            <span className="mono-label">30-DAY TRENDS</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <TrendChart title="Sleep (h)" data={sleepTrend} target={TARGETS.sleep} unit="h" />
              <TrendChart title="Steps" data={stepsTrend} target={TARGETS.steps} unit=""
                fmt={v => `${(v / 1000).toFixed(1)}k`} />
              {weightTrend.length >= 3 && (
                <TrendChart title="Weight (kg)" data={weightTrend} unit="kg" fmt={v => `${v.toFixed(1)}kg`} />
              )}
              {chessTrend.some(v => v > 0) && (
                <TrendChart title="Chess games" data={chessTrend} unit="" />
              )}
            </div>
          </div>
        </div>
      )}

      <ChatPanel
        agent="fitness"
        label="Fitness Coach"
        placeholder="How's my protein this week? What should I train today?"
      />
    </div>
  )
}

// ── Heatmap ─────────────────────────────────────────────────────────────

function HeatmapView({ data, selected, onSelect }: {
  data: HeatData[]
  selected: string | null
  onSelect: (d: string | null) => void
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

  // Month label at week where 1st of month falls
  const monthLabels: { label: string; col: number }[] = []
  weeks.forEach((week, wi) => {
    const d = new Date(week[0] + 'T12:00:00')
    if (d.getDate() <= 7) {
      const label = d.toLocaleDateString('en', { month: 'short' })
      if (!monthLabels.find(m => m.label === label)) {
        monthLabels.push({ label, col: wi })
      }
    }
  })

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div>
      <span className="mono-label">LAST 52 WEEKS — click any day to inspect · 4 habits scored</span>

      {/* Month labels */}
      <div style={{ paddingLeft: 20, marginBottom: 3, height: 14, position: 'relative' }}>
        {monthLabels.map(({ label, col }) => (
          <span key={`${label}-${col}`} style={{
            position: 'absolute', left: col * 15,
            fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
          }}>{label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 1 }}>
          {days.map((d, i) => (
            <div key={i} style={{ height: 12, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-4)', lineHeight: '12px', width: 10 }}>{d}</div>
          ))}
        </div>
        <div className="heatmap">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map(date => (
                <div key={date}
                  className={`hm-cell ${level(date)}`}
                  title={date}
                  onClick={() => date <= TODAY ? onSelect(date === selected ? null : date) : undefined}
                  style={{
                    cursor: date <= TODAY ? 'pointer' : 'default',
                    outline: selected === date ? '2px solid var(--accent)' : 'none',
                    outlineOffset: '1px',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 10, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
        <span>less</span>
        {(['', 'l1', 'l2', 'l3', 'l4'] as const).map(l => <div key={l} className={`hm-cell ${l}`} />)}
        <span>more</span>
        <span style={{ marginLeft: 12 }}>scored on: sleep · steps · water · food</span>
      </div>
    </div>
  )
}

// ── Food estimator ──────────────────────────────────────────────────────

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
