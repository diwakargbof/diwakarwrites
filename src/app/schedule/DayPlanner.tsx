'use client'

import { useState, useEffect, useCallback } from 'react'

type Category = 'health' | 'work' | 'creative' | 'personal' | 'meal' | 'leisure' | 'meeting'

type TimeBlock = {
  id: string
  startTime: string
  endTime: string
  title: string
  category: Category
  fixed: boolean
  walkpad?: boolean
  notes?: string
}

type DayPlan = {
  blocks: TimeBlock[]
  completedBlockIds: string[]
  generatedAt: string
}

type Meeting = {
  id: string
  date: string
  title: string
  start_time: string
  end_time: string
  notes?: string
  walkpad_friendly: boolean
}

type Goal = {
  id: string
  goal: string
  category: string
  target_date?: string
  priority: number
}

const CAT_COLOR: Record<Category, string> = {
  health:   '#22c55e',
  work:     '#3b82f6',
  creative: '#a855f7',
  personal: '#f59e0b',
  meal:     '#f97316',
  leisure:  '#14b8a6',
  meeting:  '#ef4444',
}

const CAT_BG: Record<Category, string> = {
  health:   'rgba(34,197,94,0.07)',
  work:     'rgba(59,130,246,0.07)',
  creative: 'rgba(168,85,247,0.07)',
  personal: 'rgba(245,158,11,0.07)',
  meal:     'rgba(249,115,22,0.07)',
  leisure:  'rgba(20,184,166,0.07)',
  meeting:  'rgba(239,68,68,0.09)',
}

function fmt(t: string) {
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
}

function diffMins(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

function durLabel(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function getDefaultDate() {
  const now = new Date()
  // After 8 PM, default to tomorrow for planning ahead
  if (now.getHours() >= 20) {
    return new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}

const inp: React.CSSProperties = {
  font: '400 13px var(--sans)',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: 'var(--r)',
  padding: '7px 10px',
  width: '100%',
  outline: 'none',
}

const btn: React.CSSProperties = {
  font: '500 13px var(--sans)',
  padding: '7px 14px',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r)',
  cursor: 'pointer',
  width: '100%',
}

export default function DayPlanner() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(getDefaultDate)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState<'meetings' | 'goals'>('meetings')
  const [notif, setNotif] = useState<NotificationPermission | 'unsupported'>('default')

  // Meeting form
  const [mDate, setMDate] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  })
  const [mTitle, setMTitle] = useState('')
  const [mStart, setMStart] = useState('10:30')
  const [mEnd, setMEnd] = useState('11:30')
  const [mNotes, setMNotes] = useState('')
  const [mWalkpad, setMWalkpad] = useState(false)

  // Goal form
  const [gText, setGText] = useState('')
  const [gCat, setGCat] = useState('personal')
  const [gDate, setGDate] = useState('')
  const [gPriority, setGPriority] = useState(3)

  // Client-side meeting reminders — fires a local notification 10 min before each meeting
  useEffect(() => {
    if (!meetings.length || Notification.permission !== 'granted') return
    const today = new Date().toISOString().split('T')[0]
    const todayMeetings = meetings.filter(m => m.date === today)
    const timers: ReturnType<typeof setTimeout>[] = []

    for (const m of todayMeetings) {
      const [h, min] = String(m.start_time).slice(0, 5).split(':').map(Number)
      const meetingMs = new Date().setHours(h, min, 0, 0)
      const reminderMs = meetingMs - 10 * 60 * 1000
      const delay = reminderMs - Date.now()
      if (delay < 0) continue // already passed

      timers.push(
        setTimeout(() => {
          new Notification(`meeting in 10 min`, {
            body: `${m.title}${m.walkpad_friendly ? ' — walkpad ok' : ''}`,
            tag: `meeting-${m.id}`,
            requireInteraction: true,
          })
        }, delay)
      )
    }
    return () => timers.forEach(clearTimeout)
  }, [meetings])

  const loadPlan = useCallback(async (d: string) => {
    const res = await fetch(`/api/schedule/day-plan?date=${d}`)
    if (res.ok) {
      const data = await res.json()
      setPlan(data.plan ?? null)
    }
  }, [])

  const loadMeetings = useCallback(async () => {
    const res = await fetch('/api/schedule/meetings')
    if (res.ok) setMeetings(await res.json())
  }, [])

  const loadGoals = useCallback(async () => {
    const res = await fetch('/api/schedule/goals')
    if (res.ok) setGoals(await res.json())
  }, [])

  useEffect(() => {
    loadMeetings()
    loadGoals()
    if (!('Notification' in window)) setNotif('unsupported')
    else setNotif(Notification.permission)
  }, [loadMeetings, loadGoals])

  useEffect(() => { loadPlan(date) }, [date, loadPlan])

  async function savePlan(p: DayPlan) {
    await fetch('/api/schedule/day-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, plan: p }),
    })
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) { alert('Schedule generation failed — check console'); return }
      const { blocks } = await res.json()
      const newPlan: DayPlan = { blocks, completedBlockIds: [], generatedAt: new Date().toISOString() }
      setPlan(newPlan)
      await savePlan(newPlan)
    } finally {
      setGenerating(false)
    }
  }

  async function toggle(id: string) {
    if (!plan) return
    const completed = plan.completedBlockIds.includes(id)
      ? plan.completedBlockIds.filter(x => x !== id)
      : [...plan.completedBlockIds, id]
    const updated = { ...plan, completedBlockIds: completed }
    setPlan(updated)
    await savePlan(updated)
  }

  async function addMeeting(e: React.FormEvent) {
    e.preventDefault()
    if (!mTitle.trim()) return
    await fetch('/api/schedule/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: mDate, title: mTitle, start_time: mStart, end_time: mEnd, notes: mNotes, walkpad_friendly: mWalkpad }),
    })
    setMTitle(''); setMNotes(''); setMWalkpad(false)
    loadMeetings()
  }

  async function deleteMeeting(id: string) {
    await fetch(`/api/schedule/meetings?id=${id}`, { method: 'DELETE' })
    loadMeetings()
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!gText.trim()) return
    await fetch('/api/schedule/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: gText, category: gCat, target_date: gDate || null, priority: gPriority }),
    })
    setGText(''); setGDate('')
    loadGoals()
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/schedule/goals?id=${id}`, { method: 'DELETE' })
    loadGoals()
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) { alert('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — see setup instructions.'); return }

    const perm = await Notification.requestPermission()
    setNotif(perm)
    if (perm !== 'granted') return

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
  }

  // Stats
  const catMins: Partial<Record<Category, number>> = {}
  if (plan) {
    for (const b of plan.blocks) {
      catMins[b.category] = (catMins[b.category] ?? 0) + diffMins(b.startTime, b.endTime)
    }
  }
  const doneMins = plan
    ? plan.completedBlockIds.reduce((s, id) => {
        const b = plan.blocks.find(x => x.id === id)
        return s + (b ? diffMins(b.startTime, b.endTime) : 0)
      }, 0)
    : 0

  const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toLowerCase()

  const isToday = date === today

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* ── Timeline ─────────────────────────────────────── */}
      <div style={{ flex: '1 1 480px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
              {isToday ? "today's schedule" : "day planner"}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>{dayLabel}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ ...inp, width: 'auto', fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <button
              onClick={generate}
              disabled={generating}
              style={{
                ...btn,
                width: 'auto',
                padding: '7px 16px',
                opacity: generating ? 0.7 : 1,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'claude is thinking...' : plan ? 'regenerate' : 'generate my day'}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!plan && !generating && (
          <div style={{ textAlign: 'center', padding: '56px 24px', border: '1px dashed var(--rule)', borderRadius: 10 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-2)', marginBottom: 8 }}>
              no schedule yet for {dayLabel}
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 24, fontFamily: 'var(--sans)', lineHeight: 1.6 }}>
              add your 3-month goals and any meetings first,<br />then let Claude build your day.
            </p>
            <button onClick={generate} style={{ ...btn, width: 'auto', padding: '9px 24px' }}>
              generate my day
            </button>
          </div>
        )}

        {generating && (
          <div style={{ textAlign: 'center', padding: '56px 24px', border: '1px dashed var(--rule)', borderRadius: 10 }}>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
              Claude is reading your goals and building your day...
            </p>
          </div>
        )}

        {/* Blocks */}
        {plan && !generating && (
          <div>
            {plan.blocks.map(block => {
              const done = plan.completedBlockIds.includes(block.id)
              const mins = diffMins(block.startTime, block.endTime)
              const color = CAT_COLOR[block.category] ?? '#888'
              const bg = CAT_BG[block.category] ?? 'transparent'

              return (
                <div
                  key={block.id}
                  style={{
                    borderLeft: `3px solid ${done ? 'var(--rule)' : color}`,
                    background: done ? 'transparent' : bg,
                    padding: '10px 14px',
                    marginBottom: 3,
                    borderRadius: '0 6px 6px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    opacity: done ? 0.45 : 1,
                    transition: 'opacity 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
                        {fmt(block.startTime)} → {fmt(block.endTime)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>
                        {durLabel(mins)}
                      </span>
                      {block.walkpad && (
                        <span style={{ fontSize: 10, color: 'var(--ink-3)', background: 'var(--paper-2)', padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--sans)' }}>
                          walkpad
                        </span>
                      )}
                      {block.category === 'meeting' && (
                        <span style={{ fontSize: 10, color: color, background: CAT_BG.meeting, padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--sans)', fontWeight: 500 }}>
                          meeting
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 14,
                      fontFamily: 'var(--sans)',
                      fontWeight: done ? 400 : 500,
                      color: done ? 'var(--ink-3)' : 'var(--ink)',
                      textDecoration: done ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}>
                      {block.title}
                    </p>
                    {block.notes && (
                      <p style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--sans)', marginTop: 3, lineHeight: 1.4 }}>
                        {block.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(block.id)}
                    title={done ? 'mark undone' : 'mark done'}
                    style={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      marginLeft: 12,
                      marginTop: 2,
                      border: `2px solid ${done ? color : 'var(--rule)'}`,
                      background: done ? color : 'transparent',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      transition: 'all 0.15s',
                    }}
                  >
                    {done ? '✓' : ''}
                  </button>
                </div>
              )
            })}

            {/* Day stats */}
            <div style={{ marginTop: 28, padding: '16px 18px', background: 'var(--paper-2)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontFamily: 'var(--sans)', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontWeight: 500 }}>
                where did my day go
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 14 }}>
                {(Object.entries(catMins) as [Category, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, mins]) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[cat], flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>
                        {cat} — {durLabel(mins)}
                      </span>
                    </div>
                  ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
                {plan.completedBlockIds.length} of {plan.blocks.length} blocks done · {durLabel(doneMins)} completed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex' }}>
            {(['meetings', 'goals'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tab === t ? 'var(--accent)' : 'var(--ink-3)',
                  borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  transition: 'color 0.12s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Meetings tab */}
        {tab === 'meetings' && (
          <div>
            <form onSubmit={addMeeting} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>date</label>
              <input type="date" value={mDate} onChange={e => setMDate(e.target.value)} style={inp} />
              <input
                placeholder="meeting title"
                value={mTitle}
                onChange={e => setMTitle(e.target.value)}
                style={inp}
                required
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>start</label>
                  <input type="time" value={mStart} onChange={e => setMStart(e.target.value)} style={{ ...inp, marginTop: 4 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>end</label>
                  <input type="time" value={mEnd} onChange={e => setMEnd(e.target.value)} style={{ ...inp, marginTop: 4 }} />
                </div>
              </div>
              <input
                placeholder="notes (optional)"
                value={mNotes}
                onChange={e => setMNotes(e.target.value)}
                style={inp}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
                <input type="checkbox" checked={mWalkpad} onChange={e => setMWalkpad(e.target.checked)} />
                walkpad-friendly
              </label>
              <button type="submit" style={btn}>add meeting</button>
            </form>

            {meetings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>upcoming</p>
                {meetings.map(m => (
                  <div key={m.id} style={{ background: 'var(--paper-2)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--sans)', marginBottom: 3 }}>{m.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
                        {m.date} · {String(m.start_time).slice(0, 5)} – {String(m.end_time).slice(0, 5)}
                      </p>
                      {m.walkpad_friendly && (
                        <p style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', marginTop: 2 }}>walkpad ok</p>
                      )}
                      {m.notes && (
                        <p style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', marginTop: 2 }}>{m.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMeeting(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 15, padding: '0 0 0 8px', lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>no upcoming meetings</p>
            )}
          </div>
        )}

        {/* Goals tab */}
        {tab === 'goals' && (
          <div>
            <form onSubmit={addGoal} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <textarea
                placeholder="what do you want to achieve in the next 3 months?"
                value={gText}
                onChange={e => setGText(e.target.value)}
                style={{ ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'var(--sans)' }}
                required
              />
              <select value={gCat} onChange={e => setGCat(e.target.value)} style={inp}>
                <option value="health">health</option>
                <option value="career">career</option>
                <option value="creative">creative</option>
                <option value="personal">personal</option>
                <option value="financial">financial</option>
              </select>
              <input
                type="date"
                value={gDate}
                onChange={e => setGDate(e.target.value)}
                placeholder="target date (optional)"
                style={inp}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--sans)', flexShrink: 0 }}>priority</span>
                {[1, 2, 3, 4, 5].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setGPriority(p)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: '1.5px solid var(--rule)',
                      background: gPriority >= p ? 'var(--accent)' : 'transparent',
                      color: gPriority >= p ? '#fff' : 'var(--ink-4)',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button type="submit" style={btn}>add goal</button>
            </form>

            {goals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>active goals</p>
                {goals.map(g => (
                  <div key={g.id} style={{ background: 'var(--paper-2)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', lineHeight: 1.4, marginBottom: 4 }}>{g.goal}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', background: 'var(--paper)', padding: '1px 7px', borderRadius: 10 }}>{g.category}</span>
                        {g.target_date && (
                          <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>by {g.target_date}</span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>
                          {'●'.repeat(g.priority)}{'○'.repeat(5 - g.priority)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGoal(g.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 15, padding: '0 0 0 8px', lineHeight: 1, flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>no goals yet — add what matters for the next 3 months</p>
            )}
          </div>
        )}

        {/* Notifications */}
        <div style={{ padding: '14px 16px', background: 'var(--paper-2)', borderRadius: 8 }}>
          <p style={{ fontSize: 11, fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 8, fontWeight: 500 }}>
            notifications
          </p>
          {notif === 'granted' ? (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
              active — 9 PM planning reminder + meeting alerts
            </p>
          ) : notif === 'denied' ? (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
              blocked in browser — go to site settings to allow
            </p>
          ) : notif === 'unsupported' ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>
              not supported in this browser
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--sans)', lineHeight: 1.5, marginBottom: 10 }}>
                get a 9 PM nudge to plan tomorrow, and a ping 10 min before each meeting
              </p>
              <button onClick={enableNotifications} style={btn}>enable notifications</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
