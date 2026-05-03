'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Mobility', 'Rest']

type Exercise = { name: string; sets: number; reps: number; weight: number; note: string }
type Session = {
  id: string
  date: string
  type: string
  exercises: Exercise[]
  duration_mins: number | null
  notes: string | null
}

const BLANK_EX: Exercise = { name: '', sets: 3, reps: 10, weight: 0, note: '' }

export default function WorkoutPage() {
  const [tab, setTab] = useState<'today' | 'history'>('today')
  const [workoutType, setWorkoutType] = useState('Push')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [history, setHistory] = useState<Session[]>([])

  useEffect(() => {
    loadToday()
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  async function loadToday() {
    const { data } = await supabase.from('workout_sessions').select('*').eq('date', TODAY).single()
    if (data) {
      setExistingId(data.id)
      setWorkoutType(data.type)
      setExercises(data.exercises || [])
      setDuration(data.duration_mins ? String(data.duration_mins) : '')
      setNotes(data.notes || '')
    }
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('workout_sessions').select('*')
      .order('date', { ascending: false }).limit(40)
    if (data) setHistory(data as Session[])
  }

  function addExercise() {
    setExercises(p => [...p, { ...BLANK_EX }])
  }

  function updateEx(i: number, field: keyof Exercise, val: string | number) {
    setExercises(p => p.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  function removeEx(i: number) {
    setExercises(p => p.filter((_, idx) => idx !== i))
  }

  function moveEx(i: number, dir: -1 | 1) {
    setExercises(p => {
      const a = [...p]
      const j = i + dir
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]]
      return a
    })
  }

  async function saveSession() {
    setSaving(true)
    const payload = {
      date: TODAY,
      type: workoutType,
      exercises: exercises.filter(e => e.name.trim()),
      duration_mins: parseInt(duration) || null,
      notes: notes.trim() || null,
    }
    if (existingId) {
      await supabase.from('workout_sessions').update(payload).eq('id', existingId)
    } else {
      const { data } = await supabase.from('workout_sessions').insert(payload).select().single()
      if (data) setExistingId(data.id)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalVolume = exercises.reduce((sum, e) => sum + (e.sets * e.reps * (e.weight || 0)), 0)

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/habits" style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)',
          textDecoration: 'none', display: 'inline-block', marginBottom: 16,
        }}>← habits</Link>
        <h1 className="page-h" style={{ marginBottom: 6 }}>Workout</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="tabs">
        {(['today', 'history'] as const).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── TODAY ── */}
      {tab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Workout type */}
          <div className="card">
            <span className="mono-label">SESSION TYPE</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {WORKOUT_TYPES.map(t => (
                <button key={t} className={`pill ${workoutType === t ? 'on' : ''}`}
                  onClick={() => setWorkoutType(t)}>{t}</button>
              ))}
            </div>
          </div>

          {/* Exercise list */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="mono-label" style={{ marginBottom: 0 }}>EXERCISES</span>
                {exercises.length > 0 && totalVolume > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 12 }}>
                    {totalVolume.toLocaleString()}kg total volume
                  </span>
                )}
              </div>
              <button className="btn btn-sm" onClick={addExercise}>+ Add</button>
            </div>

            {exercises.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                No exercises yet. Add your first one.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{
                  padding: '14px 16px', background: 'var(--paper-2)',
                  borderRadius: 6, position: 'relative',
                }}>
                  {/* Controls row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>#{i + 1}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {i > 0 && (
                        <button onClick={() => moveEx(i, -1)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--ink-4)', fontSize: 12, padding: '2px 5px',
                        }}>↑</button>
                      )}
                      {i < exercises.length - 1 && (
                        <button onClick={() => moveEx(i, 1)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--ink-4)', fontSize: 12, padding: '2px 5px',
                        }}>↓</button>
                      )}
                      <button onClick={() => removeEx(i)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-4)', fontSize: 14, padding: '2px 6px',
                      }}>✕</button>
                    </div>
                  </div>

                  {/* Exercise name */}
                  <input value={ex.name} onChange={e => updateEx(i, 'name', e.target.value)}
                    placeholder="Exercise name  (e.g. Bench Press)"
                    className="inp"
                    style={{ marginBottom: 10, fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500 }} />

                  {/* Sets / Reps / Weight */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
                    {[
                      { key: 'sets',   label: 'SETS',    min: 1 },
                      { key: 'reps',   label: 'REPS',    min: 1 },
                      { key: 'weight', label: 'WEIGHT (kg)', min: 0 },
                    ].map(({ key, label, min }) => (
                      <div key={key}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginBottom: 5, letterSpacing: '0.06em' }}>{label}</div>
                        <input type="number" min={min} step={key === 'weight' ? 0.5 : 1}
                          value={(ex as Record<string, string | number>)[key]}
                          onChange={e => updateEx(i, key as keyof Exercise, parseFloat(e.target.value) || 0)}
                          className="inp"
                          style={{ fontFamily: 'var(--mono)', textAlign: 'center', fontSize: 16 }} />
                      </div>
                    ))}
                  </div>

                  {/* Volume indicator */}
                  {ex.sets > 0 && ex.reps > 0 && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginBottom: 8 }}>
                      {ex.sets} × {ex.reps} reps{ex.weight > 0 ? ` @ ${ex.weight}kg = ${ex.sets * ex.reps * ex.weight}kg volume` : ''}
                    </div>
                  )}

                  {/* Note */}
                  <input value={ex.note} onChange={e => updateEx(i, 'note', e.target.value)}
                    placeholder="Note  (e.g. RPE 8, PR!, slow eccentric, superset w/ …)"
                    className="inp"
                    style={{ fontSize: 12, color: 'var(--ink-2)', fontStyle: ex.note ? 'normal' : 'italic' }} />
                </div>
              ))}
            </div>

            {exercises.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={addExercise}
                style={{ marginTop: 12, color: 'var(--ink-3)' }}>+ add another</button>
            )}
          </div>

          {/* Duration + Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 14 }}>
            <div className="card">
              <span className="mono-label">DURATION</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min={0} value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder="60" className="inp"
                  style={{ fontFamily: 'var(--mono)', width: 64, textAlign: 'right', fontSize: 18 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>min</span>
              </div>
            </div>
            <div className="card">
              <span className="mono-label">SESSION NOTES</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="How did it feel? Any PRs? Recovery, energy level, what to fix next time…"
                className="inp"
                style={{ resize: 'vertical', minHeight: 64, lineHeight: 1.55, fontSize: 13 }} />
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={saveSession} disabled={saving}
              style={{ minWidth: 140 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : existingId ? 'Update session' : 'Save session'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                session logged
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <div>
          {history.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No sessions logged yet.</p>
          )}
          {history.map((s, i) => {
            const vol = s.exercises?.reduce((sum, e) => sum + (e.sets * e.reps * (e.weight || 0)), 0) || 0
            const isToday = s.date === TODAY
            return (
              <div key={s.id} style={{
                padding: '20px 0', borderBottom: '1px solid var(--rule)',
                opacity: i === 0 ? 1 : 0.85,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {isToday ? 'today' : new Date(s.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{s.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    {s.duration_mins && <span>{s.duration_mins}min</span>}
                    {vol > 0 && <span>{vol.toLocaleString()}kg vol</span>}
                    <span>{s.exercises?.length || 0} exercises</span>
                  </div>
                </div>

                {/* Exercise chips */}
                {s.exercises?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: s.notes ? 10 : 0 }}>
                    {s.exercises.map((e, j) => (
                      <span key={j} style={{
                        fontFamily: 'var(--mono)', fontSize: 11,
                        background: 'var(--paper-2)', borderRadius: 4, padding: '3px 9px',
                        color: 'var(--ink-2)', border: '1px solid var(--rule)',
                      }}>
                        {e.name}{e.weight > 0 ? ` ${e.sets}×${e.reps}@${e.weight}` : e.reps ? ` ${e.sets}×${e.reps}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {s.notes && (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 6 }}>
                    {s.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
