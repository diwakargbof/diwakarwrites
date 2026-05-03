'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]
const TARGETS = { sleep: 7, steps: 13000, water: 3700, protein: 140, calories: 1900, fiber: 25 }

type Log = { date: string; sleep_hours: number; steps: number; water_ml: number }
type Food = { id: string; description: string; calories: number; protein_g: number; fiber_g: number; created_at: string }

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

function NumInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [v, setV] = useState(String(value))
  useEffect(() => setV(String(value)), [value])
  return (
    <input value={v} onChange={e => setV(e.target.value)}
      onBlur={() => onCommit(parseFloat(v) || 0)}
      onKeyDown={e => e.key === 'Enter' && onCommit(parseFloat(v) || 0)}
      className="inp" style={{ width: 80, fontFamily: 'var(--mono)', textAlign: 'right' }} />
  )
}

export default function HabitsPage() {
  const [tab, setTab] = useState<'today' | 'calendar'>('today')
  const [log, setLog] = useState<Log>({ date: TODAY, sleep_hours: 0, steps: 0, water_ml: 0 })
  const [food, setFood] = useState<Food[]>([])
  const [foodInput, setFoodInput] = useState('')
  const [addingFood, setAddingFood] = useState(false)
  const [heatmap, setHeatmap] = useState<{ date: string; score: number }[]>([])

  useEffect(() => { loadToday(); loadHeatmap() }, [])

  async function loadToday() {
    const { data: h } = await supabase.from('habit_logs').select('*').eq('date', TODAY).single()
    if (h) setLog(h)
    const { data: f } = await supabase.from('food_entries').select('*').eq('date', TODAY).order('created_at')
    if (f) setFood(f as Food[])
  }

  async function loadHeatmap() {
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const { data } = await supabase.from('habit_logs').select('date,sleep_hours,steps,water_ml')
      .gte('date', from.toISOString().split('T')[0]).order('date')
    if (data) setHeatmap(data.map(d => ({
      date: d.date,
      score: ((d.sleep_hours / TARGETS.sleep) + (d.steps / TARGETS.steps) + (d.water_ml / TARGETS.water)) / 3,
    })))
  }

  const save = useCallback(async (field: string, value: number) => {
    await supabase.from('habit_logs').upsert({ ...log, [field]: value }, { onConflict: 'date' })
  }, [log])

  const update = (field: keyof Log, value: number) => {
    setLog(prev => { const n = { ...prev, [field]: value }; save(field, value); return n })
  }

  const totals = food.reduce((a, f) => ({
    cal: a.cal + (f.calories || 0), prot: a.prot + (f.protein_g || 0), fiber: a.fiber + (f.fiber_g || 0),
  }), { cal: 0, prot: 0, fiber: 0 })

  async function logFood() {
    if (!foodInput.trim()) return
    const entry = { date: TODAY, meal_type: 'meal', description: foodInput, ...estimate(foodInput) }
    const { data } = await supabase.from('food_entries').insert(entry).select().single()
    if (data) setFood(p => [...p, data as Food])
    setFoodInput(''); setAddingFood(false)
  }

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

      {tab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Macros overview */}
          <div className="card">
            <span className="mono-label">TODAY&apos;S NUTRITION</span>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
              <Ring value={totals.cal} max={TARGETS.calories} label="calories" />
              <Ring value={totals.prot} max={TARGETS.protein} label="protein" />
              <Ring value={totals.fiber} max={TARGETS.fiber} label="fiber" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { v: totals.cal, t: TARGETS.calories, u: 'kcal' },
                { v: Math.round(totals.prot), t: TARGETS.protein, u: 'g protein' },
                { v: Math.round(totals.fiber), t: TARGETS.fiber, u: 'g fiber' },
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
            {/* Sleep */}
            <div className="card">
              <span className="mono-label">SLEEP</span>
              <div className="num">{log.sleep_hours}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>h</span></div>
              <div className="num-target">/ {TARGETS.sleep}h target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min(log.sleep_hours / TARGETS.sleep * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(h => (
                  <button key={h} onClick={() => update('sleep_hours', h)}
                    style={{
                      fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 6px',
                      border: '1px solid var(--rule)', borderRadius: 3, cursor: 'pointer',
                      background: log.sleep_hours === h ? 'var(--accent)' : 'var(--paper)',
                      color: log.sleep_hours === h ? '#fff' : 'var(--ink-3)',
                    }}>{h}</button>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="card">
              <span className="mono-label">STEPS</span>
              <div className="num">{log.steps.toLocaleString()}</div>
              <div className="num-target">/ {TARGETS.steps.toLocaleString()} target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min(log.steps / TARGETS.steps * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {[1000, 2000, 5000].map(n => (
                  <button key={n} className="btn btn-sm" onClick={() => update('steps', log.steps + n)}>+{n / 1000}k</button>
                ))}
                <NumInput value={log.steps} onCommit={v => update('steps', v)} />
              </div>
            </div>

            {/* Water */}
            <div className="card">
              <span className="mono-label">WATER</span>
              <div className="num">{(log.water_ml / 1000).toFixed(1)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>L</span></div>
              <div className="num-target">/ {TARGETS.water / 1000}L target</div>
              <div className="prog" style={{ margin: '10px 0' }}>
                <div className="prog-fill" style={{ width: `${Math.min(log.water_ml / TARGETS.water * 100, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[250, 500, 750].map(n => (
                  <button key={n} className="btn btn-sm" onClick={() => update('water_ml', log.water_ml + n)}>+{n}ml</button>
                ))}
                <button className="btn btn-sm" onClick={() => update('water_ml', 0)} style={{ color: 'var(--ink-4)' }}>reset</button>
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
                      <div>
                        <div style={{ fontSize: 14 }}>{f.description}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {f.protein_g}g protein · {f.calories} kcal
                        </div>
                      </div>
                      <span className="row-meta">
                        {new Date(f.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
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

      {tab === 'calendar' && <HeatmapView data={heatmap} />}
    </div>
  )
}

function HeatmapView({ data }: { data: { date: string; score: number }[] }) {
  const map = new Map(data.map(d => [d.date, d.score]))
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
    const s = map.get(date)
    if (!s) return ''
    if (s > 0.8) return 'l4'; if (s > 0.6) return 'l3'; if (s > 0.3) return 'l2'; return 'l1'
  }
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div>
      <span className="mono-label">LAST 52 WEEKS — darker = more habits hit</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
          {days.map((d, i) => <div key={i} style={{ height: 12, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-4)', lineHeight: '12px' }}>{d}</div>)}
        </div>
        <div className="heatmap">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map(date => <div key={date} className={`hm-cell ${level(date)}`} title={date} />)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 10, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
        <span>less</span>
        {['', 'l1', 'l2', 'l3', 'l4'].map(l => <div key={l} className={`hm-cell ${l}`} />)}
        <span>more</span>
      </div>
    </div>
  )
}

function estimate(text: string) {
  const t = text.toLowerCase()
  let cal = 0, protein_g = 0, fiber_g = 0
  const n = (pat: RegExp) => parseInt(t.match(pat)?.[1] || '1')
  if (t.includes('egg')) { const c = n(/(\d+)\s*egg/); cal += 70 * c; protein_g += 6 * c }
  if (t.includes('oats') || t.includes('oatmeal')) { cal += 150; protein_g += 5; fiber_g += 4 }
  if (t.includes('banana')) { cal += 90; fiber_g += 3 }
  if (t.includes('milk')) { cal += 120; protein_g += 8 }
  if (t.includes('rice')) { cal += 200; fiber_g += 1 }
  if (t.includes('dal') || t.includes('lentil')) { cal += 150; protein_g += 10; fiber_g += 6 }
  if (t.includes('roti') || t.includes('chapati')) { const c = n(/(\d+)\s*roti/); cal += 80 * c; fiber_g += 2 * c }
  if (t.includes('chicken')) { cal += 250; protein_g += 30 }
  if (t.includes('paneer')) { cal += 180; protein_g += 14 }
  if (t.includes('whey') || t.includes('protein shake')) { cal += 130; protein_g += 25 }
  if (t.includes('curd') || t.includes('yogurt')) { cal += 100; protein_g += 8 }
  if (t.includes('apple')) { cal += 80; fiber_g += 4 }
  if (t.includes('bread')) { const c = n(/(\d+)\s*bread/); cal += 80 * c; protein_g += 3 * c }
  return { calories: cal || 250, protein_g: protein_g || 8, fiber_g: fiber_g || 2 }
}
