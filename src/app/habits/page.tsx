'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ChatPanel from '@/components/ChatPanel'
import PasswordGate from '@/components/PasswordGate'

const TODAY = new Date().toISOString().split('T')[0]
const TARGETS = {
  sleep: 7, steps: 13000, water: 3700, protein: 140,
  calories: 1900, fiber: 25, meditation: 20, pages_read: 30, pages_written: 2,
}
// Mifflin-St Jeor for 27Y, 68kg, 175.26cm (5'9") male
const BMR = 1645
function calcTDEE(steps: number, workoutType?: string, workoutMins?: number | null, runKm?: number): number {
  let burn = BMR
  burn += (steps || 0) * 0.04
  if (workoutMins && workoutType && workoutType !== 'Rest') {
    burn += workoutMins * (workoutType === 'Cardio' ? 9 : workoutType === 'Mobility' ? 3 : 5)
  }
  if (runKm) burn += runKm * 70
  return Math.round(burn)
}

const MOODS = ['', '😞', '😐', '🙂', '😊', '😄']
const MOOD_LABELS = ['', 'rough', 'meh', 'okay', 'good', 'great']

// Weight loss goal: 6 kg → 61.5 kg, started 2026-05-19
const GOAL_START_DATE = '2026-05-19'
const GOAL_KG = 6
const GOAL_DEFICIT_KCAL = GOAL_KG * 7700  // 46,200 kcal

type Log = {
  date: string
  sleep_hours: number
  sleep_time: string | null
  wake_time: string | null
  steps: number
  water_ml: number
  weight_kg: number | null
  mood: number | null
  meditation_min: number
  pages_read: number
  pages_written: number
  face_care: boolean
  oral_care: boolean
  dream_notes: string | null
}

type Food = {
  id: string
  description: string
  calories: number
  protein_g: number
  fiber_g: number
  created_at: string
}

type FoodItem = {
  id: string
  name: string
  serving_desc: string | null
  calories: number
  protein_g: number
  fiber_g: number
  use_count: number
}

type HeatData = {
  date: string; score: number
  sleep_hours: number; steps: number; water_ml: number; weight_kg: number | null
  mood: number | null
  meditation_min: number; pages_read: number; pages_written: number
  face_care: boolean; oral_care: boolean
}

const EMPTY_LOG: Log = {
  date: TODAY, sleep_hours: 0, sleep_time: null, wake_time: null,
  steps: 0, water_ml: 0, weight_kg: null,
  mood: null,
  meditation_min: 0, pages_read: 0, pages_written: 0,
  face_care: false, oral_care: false,
  dream_notes: null,
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

// ── Main page ─────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const [tab, setTab] = useState<'today' | 'calendar'>('today')
  const [log, setLog] = useState<Log>(EMPTY_LOG)
  const [food, setFood] = useState<Food[]>([])
  const [foodInput, setFoodInput] = useState('')
  const [addingFood, setAddingFood] = useState(false)
  const [loggingFood, setLoggingFood] = useState(false)
  // food library
  const [foodLibrary, setFoodLibrary]       = useState<FoodItem[]>([])
  const [libSearch,   setLibSearch]         = useState('')
  const [showLibrary, setShowLibrary]       = useState(false)
  const [savingToLib, setSavingToLib]       = useState(false)
  const [recentlyLogged, setRecentlyLogged] = useState<Food | null>(null)
  // add-to-library manual form
  const [libForm, setLibForm] = useState({ name: '', serving_desc: '', calories: '', protein_g: '', fiber_g: '' })
  const [addingToLib, setAddingToLib]       = useState(false)
  const [heatmap, setHeatmap] = useState<HeatData[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<{ type: string; duration_mins: number | null } | null>(null)
  const [todayRuns,    setTodayRuns]    = useState<{ distance_km: number; duration_mins: number }[]>([])
  const [netHistory,   setNetHistory]   = useState<{ date: string; foodCal: number; tdee: number; net: number }[]>([])
  const [isListening,  setIsListening]  = useState(false)

  useEffect(() => { loadToday(); loadHeatmap(); loadNetHistory(); loadFoodLibrary() }, [])

  async function loadToday() {
    const { data: h } = await supabase.from('habit_logs').select('*').eq('date', TODAY).single()
    if (h) setLog({ ...EMPTY_LOG, ...h })
    const [{ data: f }, { data: ws }, { data: rs }] = await Promise.all([
      supabase.from('food_entries').select('*').eq('date', TODAY).order('created_at'),
      supabase.from('workout_sessions').select('type,duration_mins').eq('date', TODAY).maybeSingle(),
      supabase.from('run_sessions').select('distance_km,duration_mins').eq('date', TODAY),
    ])
    if (f)  setFood(f as Food[])
    if (ws) setTodayWorkout(ws as { type: string; duration_mins: number | null })
    if (rs) setTodayRuns(rs as { distance_km: number; duration_mins: number }[])
  }

  async function loadHeatmap() {
    const from = new Date(); from.setFullYear(from.getFullYear() - 1)
    const fromStr = from.toISOString().split('T')[0]
    const [{ data: logs }, { data: foodDates }] = await Promise.all([
      supabase.from('habit_logs')
        .select('date,sleep_hours,steps,water_ml,weight_kg,mood,meditation_min,pages_read,pages_written,face_care,oral_care')
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
      mood: d.mood ?? null,
      meditation_min: d.meditation_min || 0,
      pages_read: d.pages_read || 0,
      pages_written: d.pages_written || 0,
      face_care: d.face_care || false,
      oral_care: d.oral_care || false,
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

  async function loadNetHistory() {
    const [{ data: allFood }, { data: allLogs }, { data: allWorkouts }, { data: allRuns }] = await Promise.all([
      supabase.from('food_entries').select('date,calories').order('date'),
      supabase.from('habit_logs').select('date,steps').order('date'),
      supabase.from('workout_sessions').select('date,type,duration_mins').order('date'),
      supabase.from('run_sessions').select('date,distance_km').order('date'),
    ])
    if (!allFood?.length) return
    const foodByDate = new Map<string, number>()
    for (const f of allFood) foodByDate.set(f.date, (foodByDate.get(f.date) || 0) + (f.calories || 0))
    const logByDate     = new Map((allLogs     || []).map(l => [l.date, l.steps || 0]))
    const workoutByDate = new Map((allWorkouts || []).map(w => [w.date, { type: w.type as string, mins: w.duration_mins as number | null }]))
    const runByDate     = new Map<string, number>()
    for (const r of allRuns || []) runByDate.set(r.date, (runByDate.get(r.date) || 0) + r.distance_km)
    const result = Array.from(foodByDate.entries()).map(([date, foodCal]) => {
      const w    = workoutByDate.get(date)
      const tdee = calcTDEE(logByDate.get(date) || 0, w?.type, w?.mins, runByDate.get(date) || 0)
      return { date, foodCal, tdee, net: foodCal - tdee }
    }).sort((a, b) => a.date.localeCompare(b.date))
    setNetHistory(result)
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

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported in this browser.'); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    setIsListening(true)
    rec.start()
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      const next = log.dream_notes ? log.dream_notes + ' ' + transcript : transcript
      update('dream_notes', next)
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend   = () => setIsListening(false)
  }

  async function logFood() {
    if (!foodInput.trim() || loggingFood) return
    setLoggingFood(true)
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: foodInput }),
      })
      const nutrition = await res.json()
      const entry = { date: TODAY, meal_type: 'meal', description: foodInput, ...nutrition }
      const { data } = await supabase.from('food_entries').insert(entry).select().single()
      if (data) {
        setFood(p => [...p, data as Food])
        setRecentlyLogged(data as Food)
      }
      setFoodInput(''); setAddingFood(false)
    } finally {
      setLoggingFood(false)
    }
  }

  async function deleteFood(id: string) {
    await supabase.from('food_entries').delete().eq('id', id)
    setFood(p => p.filter(f => f.id !== id))
  }

  async function loadFoodLibrary() {
    const { data } = await supabase
      .from('food_library')
      .select('*')
      .order('use_count', { ascending: false })
      .order('name')
    if (data) setFoodLibrary(data as FoodItem[])
  }

  async function addFromLibrary(item: FoodItem) {
    const entry = {
      date: TODAY, meal_type: 'meal',
      description: item.name + (item.serving_desc ? ` (${item.serving_desc})` : ''),
      calories: item.calories, protein_g: item.protein_g, fiber_g: item.fiber_g,
    }
    const { data } = await supabase.from('food_entries').insert(entry).select().single()
    if (data) setFood(p => [...p, data as Food])
    // increment use_count
    await supabase.from('food_library').update({ use_count: item.use_count + 1 }).eq('id', item.id)
    setFoodLibrary(lib => lib.map(i => i.id === item.id ? { ...i, use_count: i.use_count + 1 } : i))
    setLibSearch('')
  }

  async function saveToLibrary(f: Food) {
    setSavingToLib(true)
    const { data } = await supabase
      .from('food_library')
      .insert({ name: f.description, calories: f.calories, protein_g: f.protein_g, fiber_g: f.fiber_g })
      .select().single()
    if (data) setFoodLibrary(lib => [data as FoodItem, ...lib])
    setSavingToLib(false)
    setRecentlyLogged(null)
  }

  async function addToLibraryManually() {
    if (!libForm.name || !libForm.calories) return
    setAddingToLib(true)
    const { data } = await supabase.from('food_library').insert({
      name: libForm.name.trim(),
      serving_desc: libForm.serving_desc.trim() || null,
      calories: parseInt(libForm.calories) || 0,
      protein_g: parseInt(libForm.protein_g) || 0,
      fiber_g: parseInt(libForm.fiber_g) || 0,
    }).select().single()
    if (data) setFoodLibrary(lib => [data as FoodItem, ...lib])
    setLibForm({ name: '', serving_desc: '', calories: '', protein_g: '', fiber_g: '' })
    setAddingToLib(false)
  }

  async function deleteFromLibrary(id: string) {
    await supabase.from('food_library').delete().eq('id', id)
    setFoodLibrary(lib => lib.filter(i => i.id !== id))
  }

  const totals = food.reduce((a, f) => ({
    cal: a.cal + (f.calories || 0), prot: a.prot + (f.protein_g || 0), fiber: a.fiber + (f.fiber_g || 0),
  }), { cal: 0, prot: 0, fiber: 0 })

  const recent30 = heatmap.slice(-30)
  const sleepTrend      = recent30.map(d => d.sleep_hours)
  const stepsTrend      = recent30.map(d => d.steps)
  const meditationTrend = recent30.map(d => d.meditation_min)
  const pagesReadTrend  = recent30.map(d => d.pages_read)
  const weightHistory   = heatmap.filter(d => d.weight_kg !== null).map(d => d.weight_kg as number)
  const weightTrend     = weightHistory.slice(-30)

  const selectedDay = selectedDate ? heatmap.find(d => d.date === selectedDate) : null

  // ── Net calories ──────────────────────────────────────────────────────────
  const runKmToday  = todayRuns.reduce((s, r) => s + r.distance_km, 0)
  const todayTDEE   = calcTDEE(log.steps || 0, todayWorkout?.type, todayWorkout?.duration_mins, runKmToday)
  const todayNet    = totals.cal - todayTDEE

  const weekStartStr = (() => {
    const d = new Date(); const day = d.getDay()
    const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return mon.toISOString().split('T')[0]
  })()
  const monthStartStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  const pastDays  = netHistory.filter(d => d.date !== TODAY)
  const weekNet   = pastDays.filter(d => d.date >= weekStartStr).reduce((s, d) => s + d.net, 0) + todayNet
  const monthNet  = pastDays.filter(d => d.date >= monthStartStr).reduce((s, d) => s + d.net, 0) + todayNet
  const allTimeNet = pastDays.reduce((s, d) => s + d.net, 0) + todayNet

  // Weight loss goal: cumulative deficit since GOAL_START_DATE (negative net = deficit)
  const goalPastNet   = netHistory.filter(d => d.date >= GOAL_START_DATE && d.date !== TODAY).reduce((s, d) => s + d.net, 0)
  const goalTotalNet  = goalPastNet + todayNet
  const goalAccumulated = -goalTotalNet  // positive = deficit accumulated
  const goalRemaining   = GOAL_DEFICIT_KCAL - goalAccumulated
  const goalProgress    = Math.min(Math.max(goalAccumulated / GOAL_DEFICIT_KCAL, 0), 1)

  const burnBreakdown = [
    `BMR ${BMR}`,
    (log.steps || 0) > 0 ? `+ steps ${Math.round((log.steps || 0) * 0.04)}` : null,
    todayWorkout && todayWorkout.type !== 'Rest' && todayWorkout.duration_mins
      ? `+ ${todayWorkout.type.toLowerCase()} ${Math.round(todayWorkout.duration_mins * (todayWorkout.type === 'Cardio' ? 9 : todayWorkout.type === 'Mobility' ? 3 : 5))}`
      : null,
    runKmToday > 0 ? `+ run ${Math.round(runKmToday * 70)}` : null,
    `= ${todayTDEE.toLocaleString()} burned`,
  ].filter(Boolean).join('  ')

  return (
    <PasswordGate>
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

          {/* Net Calories */}
          <div className="card">
            <span className="mono-label">NET CALORIES</span>
            {food.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>Log food to see net calories.</p>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
                    {totals.cal.toLocaleString()} kcal eaten · {todayTDEE.toLocaleString()} kcal burned
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 600,
                      color: todayNet <= 0 ? '#22a06b' : 'var(--accent)',
                    }}>
                      {todayNet > 0 ? '+' : ''}{todayNet.toLocaleString()}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: todayNet <= 0 ? '#22a06b' : 'var(--accent)' }}>
                      kcal · {todayNet <= 0 ? 'deficit' : 'surplus'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 6 }}>
                    {burnBreakdown}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {([
                    { label: 'this week',  net: weekNet },
                    { label: 'this month', net: monthNet },
                    { label: 'all time',   net: allTimeNet },
                  ] as const).map(({ label, net }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600,
                        color: net <= 0 ? '#22a06b' : 'var(--accent)',
                      }}>
                        {net > 0 ? '+' : ''}{Math.abs(net) >= 1000 ? `${(net / 1000).toFixed(1)}k` : String(net)}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Weight Loss Goal */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span className="mono-label" style={{ marginBottom: 0 }}>WEIGHT LOSS GOAL</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>→ 61.5 kg (−{GOAL_KG} kg)</span>
            </div>
            <div className="h-goal-pair">
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: goalAccumulated >= 0 ? '#22a06b' : 'var(--accent)' }}>
                  {goalAccumulated >= 0 ? goalAccumulated.toLocaleString() : '0'}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 4 }}>kcal deficit</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                  so far since {GOAL_START_DATE}
                </div>
              </div>
              <div className="h-goal-split">
                <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--ink-2)' }}>
                  {GOAL_DEFICIT_KCAL.toLocaleString()}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 4 }}>kcal total</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                  needed to lose {GOAL_KG} kg
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="prog">
                <div className="prog-fill" style={{ width: `${goalProgress * 100}%`, background: '#22a06b' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
              <span>{(goalProgress * 100).toFixed(1)}% of goal</span>
              <span>{goalRemaining > 0 ? `${goalRemaining.toLocaleString()} kcal remaining` : 'goal reached!'}</span>
            </div>
            {goalAccumulated < 0 && (
              <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
                currently {Math.abs(Math.round(goalAccumulated)).toLocaleString()} kcal in surplus since goal start
              </div>
            )}
          </div>

          {/* Sleep / Steps / Water */}
          <div className="h-grid-3">
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
          <div className="h-grid-2">
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
          <div className="h-grid-2">
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
                  <NumInput value={log.weight_kg || 0} onCommit={v => update('weight_kg', v > 0 ? v : null)} width={80} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                    {weightHistory.length > 0 ? `prev: ${weightHistory[weightHistory.length - 1]}kg` : 'enter today\'s weight'}
                  </div>
                </div>
              </div>
              {weightHistory.length >= 3 && <Sparkline values={weightHistory.slice(-14)} width={96} height={48} />}
            </div>
          </div>

          {/* Food log */}
          <div className="card">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="mono-label" style={{ marginBottom: 0 }}>FOOD LOG</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" style={{ fontSize: 11, color: 'var(--ink-3)' }}
                  onClick={() => { setShowLibrary(p => !p); setAddingFood(false) }}>
                  📚 {foodLibrary.length > 0 ? foodLibrary.length : 'Library'}
                </button>
                <button className="btn btn-sm" onClick={() => { setAddingFood(p => !p); setShowLibrary(false); setLibSearch('') }}>
                  + Add meal
                </button>
              </div>
            </div>

            {/* ── Add meal panel ── */}
            {addingFood && (
              <div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid var(--rule)', overflow: 'hidden' }}>

                {/* Library quick-add (only shown if library has items) */}
                {foodLibrary.length > 0 && (() => {
                  const filtered = libSearch.trim()
                    ? foodLibrary.filter(i => i.name.toLowerCase().includes(libSearch.toLowerCase()))
                    : foodLibrary.slice(0, 6)
                  return (
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                      <input
                        className="quick-input"
                        value={libSearch}
                        onChange={e => setLibSearch(e.target.value)}
                        placeholder="Search saved foods…"
                        style={{ width: '100%', marginBottom: filtered.length ? 10 : 0, fontSize: 13 }}
                      />
                      {filtered.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {filtered.map(item => (
                            <div key={item.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '7px 10px', borderRadius: 6, background: 'var(--paper)',
                              cursor: 'pointer', transition: 'background 0.1s',
                            }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-pale)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--paper)')}
                            >
                              <div>
                                <span style={{ fontSize: 13, fontFamily: 'var(--sans)', color: 'var(--ink)' }}>{item.name}</span>
                                {item.serving_desc && (
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginLeft: 6 }}>
                                    {item.serving_desc}
                                  </span>
                                )}
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginLeft: 8 }}>
                                  {item.calories} kcal · {item.protein_g}g prot
                                </span>
                              </div>
                              <button
                                onClick={() => addFromLibrary(item)}
                                style={{
                                  background: 'var(--accent)', color: '#fff', border: 'none',
                                  borderRadius: 5, padding: '3px 10px', cursor: 'pointer',
                                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                                  flexShrink: 0,
                                }}
                              >
                                + Add
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {libSearch && filtered.length === 0 && (
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', padding: '4px 2px' }}>
                          No saved foods match "{libSearch}"
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Custom entry */}
                <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="quick-input" value={foodInput} onChange={e => setFoodInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && logFood()}
                    placeholder="or type new meal — AI estimates macros"
                    style={{ flex: 1, fontSize: 13 }}
                    autoFocus={foodLibrary.length === 0}
                  />
                  <button className="btn btn-primary btn-sm" onClick={logFood} disabled={loggingFood}>
                    {loggingFood ? '…' : 'Log'}
                  </button>
                  <button className="btn btn-sm" onClick={() => { setAddingFood(false); setLibSearch('') }} disabled={loggingFood}>✕</button>
                </div>
              </div>
            )}

            {/* ── Save-to-library prompt (after AI log) ── */}
            {recentlyLogged && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                padding: '8px 12px', borderRadius: 7, background: 'var(--accent-pale)',
                border: '1px solid var(--accent)',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', flex: 1 }}>
                  ✓ Logged &ldquo;{recentlyLogged.description}&rdquo; — save for next time?
                </span>
                <button
                  onClick={() => saveToLibrary(recentlyLogged)}
                  disabled={savingToLib}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                    padding: '4px 10px', borderRadius: 5,
                    background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: savingToLib ? 0.6 : 1,
                  }}
                >
                  {savingToLib ? '…' : 'Save'}
                </button>
                <button onClick={() => setRecentlyLogged(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-4)', fontSize: 14, padding: '2px 4px',
                }}>✕</button>
              </div>
            )}

            {/* ── Library management panel ── */}
            {showLibrary && (
              <div style={{
                marginBottom: 16, border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px', background: 'var(--paper-2)',
                  borderBottom: '1px solid var(--rule)',
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--ink-4)',
                }}>
                  Saved Foods Library
                </div>

                {/* Existing library items */}
                {foodLibrary.length === 0 ? (
                  <div style={{ padding: '14px 14px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                    No saved foods yet. Add your first one below.
                  </div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {foodLibrary.map(item => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', padding: '9px 14px',
                        borderBottom: '1px solid var(--rule)', gap: 10,
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontFamily: 'var(--sans)', color: 'var(--ink)' }}>{item.name}</span>
                          {item.serving_desc && (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginLeft: 6 }}>
                              {item.serving_desc}
                            </span>
                          )}
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                            {item.calories} kcal · {item.protein_g}g protein · {item.fiber_g}g fiber
                            {item.use_count > 0 && (
                              <span style={{ color: 'var(--ink-4)', marginLeft: 8 }}>used {item.use_count}×</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => deleteFromLibrary(item.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--ink-4)', fontSize: 14, padding: '2px 4px',
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add to library manually */}
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
                  }}>
                    Add food manually
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input
                      className="quick-input"
                      value={libForm.name}
                      onChange={e => setLibForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Name (e.g. Oats with milk)"
                      style={{ flex: '2 1 160px', fontSize: 12 }}
                    />
                    <input
                      className="quick-input"
                      value={libForm.serving_desc}
                      onChange={e => setLibForm(f => ({ ...f, serving_desc: e.target.value }))}
                      placeholder="Serving (e.g. 1 bowl)"
                      style={{ flex: '1 1 100px', fontSize: 12 }}
                    />
                    <input
                      className="quick-input"
                      value={libForm.calories}
                      onChange={e => setLibForm(f => ({ ...f, calories: e.target.value }))}
                      placeholder="kcal"
                      type="number" min="0"
                      style={{ flex: '0 1 70px', fontSize: 12 }}
                    />
                    <input
                      className="quick-input"
                      value={libForm.protein_g}
                      onChange={e => setLibForm(f => ({ ...f, protein_g: e.target.value }))}
                      placeholder="prot g"
                      type="number" min="0"
                      style={{ flex: '0 1 70px', fontSize: 12 }}
                    />
                    <input
                      className="quick-input"
                      value={libForm.fiber_g}
                      onChange={e => setLibForm(f => ({ ...f, fiber_g: e.target.value }))}
                      placeholder="fiber g"
                      type="number" min="0"
                      style={{ flex: '0 1 70px', fontSize: 12 }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={addToLibraryManually}
                      disabled={addingToLib || !libForm.name || !libForm.calories}
                      style={{ flexShrink: 0 }}
                    >
                      {addingToLib ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Today's logged meals ── */}
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
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span className="mono-label" style={{ marginBottom: 0 }}>WORKOUT</span>
              <Link href="/habits/workout" className="btn btn-sm">Log →</Link>
            </div>
            {!todayWorkout && todayRuns.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No session logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayWorkout && todayWorkout.type !== 'Rest' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 6,
                    border: '1px solid #22a06b', background: 'rgba(34,160,107,0.08)',
                  }}>
                    <span style={{ fontSize: 18 }}>🏋️</span>
                    <div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: '#22a06b' }}>
                        {todayWorkout.type}
                        {todayWorkout.duration_mins ? ` · ${todayWorkout.duration_mins} min` : ''}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>strength session</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, color: '#22a06b' }}>✓</span>
                  </div>
                )}
                {todayWorkout?.type === 'Rest' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 6,
                    border: '1px solid var(--rule)', background: 'var(--paper-2)',
                  }}>
                    <span style={{ fontSize: 18 }}>🛌</span>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-3)' }}>Rest day</div>
                  </div>
                )}
                {todayRuns.map((r, i) => {
                  const pace = r.duration_mins / r.distance_km
                  const paceMin = Math.floor(pace)
                  const paceSec = Math.round((pace - paceMin) * 60)
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 6,
                      border: '1px solid #22a06b', background: 'rgba(34,160,107,0.08)',
                    }}>
                      <span style={{ fontSize: 18 }}>🏃</span>
                      <div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: '#22a06b' }}>
                          {r.distance_km} km · {r.duration_mins} min
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                          {paceMin}:{paceSec.toString().padStart(2, '0')} /km pace
                        </div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, color: '#22a06b' }}>✓</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dreams */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="mono-label" style={{ marginBottom: 0 }}>DREAMS</span>
              <button
                onClick={startListening}
                disabled={isListening}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, cursor: isListening ? 'default' : 'pointer',
                  border: `1px solid ${isListening ? 'var(--accent)' : 'var(--rule)'}`,
                  background: isListening ? 'rgba(196,80,46,0.08)' : 'var(--paper-2)',
                  color: isListening ? 'var(--accent)' : 'var(--ink-3)',
                  fontFamily: 'var(--mono)', fontSize: 11,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 14 }}>{isListening ? '🔴' : '🎙️'}</span>
                {isListening ? 'listening…' : 'dictate'}
              </button>
            </div>
            <textarea
              value={log.dream_notes || ''}
              onChange={e => update('dream_notes', e.target.value || null)}
              placeholder="What did you dream about last night?"
              rows={4}
              style={{
                width: '100%', fontFamily: 'var(--sans)', fontSize: 13,
                padding: '10px 12px', border: '1px solid var(--rule)',
                borderRadius: 6, background: 'var(--paper-2)', color: 'var(--ink)',
                outline: 'none', resize: 'vertical', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            {log.dream_notes && (
              <button
                onClick={() => update('dream_notes', null)}
                style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}
              >
                clear
              </button>
            )}
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
                    { label: 'mood',       val: selectedDay.mood ? `${MOODS[selectedDay.mood]} ${MOOD_LABELS[selectedDay.mood]}` : '—' },
                    { label: 'face care',  val: selectedDay.face_care ? '✓' : '—' },
                    { label: 'oral care',  val: selectedDay.oral_care ? '✓' : '—' },
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
            <div className="h-grid-trends">
              <TrendChart title="Sleep (h)" data={sleepTrend} target={TARGETS.sleep} unit="h" />
              <TrendChart title="Steps" data={stepsTrend} target={TARGETS.steps} unit="" fmt={v => `${(v / 1000).toFixed(1)}k`} />
              <TrendChart title="Meditation (min)" data={meditationTrend} target={TARGETS.meditation} unit="min" />
              <TrendChart title="Pages read" data={pagesReadTrend} target={TARGETS.pages_read} unit="pp" />
              {weightTrend.length >= 3 && <TrendChart title="Weight (kg)" data={weightTrend} unit="kg" fmt={v => `${v.toFixed(1)}kg`} />}
            </div>
          </div>
        </div>
      )}

      <ChatPanel agent="fitness" label="Fitness Coach" placeholder="How's my protein this week? What should I train today?" />
    </div>
    </PasswordGate>
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

