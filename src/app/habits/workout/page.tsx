'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Mobility', 'Rest']
const REP_OPTS    = [5, 6, 8, 10, 12, 15, 20, 25]
const WEIGHT_OPTS = [0, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100]
const DIST_OPTS   = [2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 21]
const RUN_DUR     = [15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90]
const DUR_OPTS    = [30, 45, 60, 75, 90, 120]

type SetEntry = { reps: number; weight: number }
type Exercise  = { name: string; sets: SetEntry[]; note: string }
type WorkoutSession = {
  id: string; date: string; type: string; exercises: unknown[]; duration_mins: number | null; notes: string | null
}
type RunSession = {
  id: string; date: string; distance_km: number; duration_mins: number; notes: string | null
}

function PillPicker({ opts, value, onChange, fmt }: {
  opts: number[]; value: number | null; onChange: (v: number) => void; fmt?: (v: number) => string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {opts.map(o => (
        <button key={o} className={`pill ${value === o ? 'on' : ''}`}
          style={{ padding: '3px 10px', fontSize: 12 }}
          onClick={() => onChange(o)}>
          {fmt ? fmt(o) : o}
        </button>
      ))}
    </div>
  )
}

export default function WorkoutPage() {
  const [tab, setTab] = useState<'today' | 'runs' | 'history'>('today')

  // workout
  const [workoutType, setWorkoutType] = useState('Push')
  const [exercises,   setExercises]   = useState<Exercise[]>([])
  const [duration,    setDuration]    = useState<number | null>(null)
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [existingId,  setExistingId]  = useState<string | null>(null)
  const [history,     setHistory]     = useState<WorkoutSession[]>([])
  const [collapsedEx,   setCollapsedEx]   = useState<Set<number>>(new Set())
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set())

  // runs
  const [runs,       setRuns]       = useState<RunSession[]>([])
  const [runDist,    setRunDist]    = useState<number | null>(null)
  const [runDur,     setRunDur]     = useState<number | null>(null)
  const [runNotes,   setRunNotes]   = useState('')
  const [savingRun,  setSavingRun]  = useState(false)

  useEffect(() => { loadToday() }, [])
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])
  useEffect(() => { if (tab === 'runs')    loadRuns()    }, [tab])

  async function loadToday() {
    const { data } = await supabase.from('workout_sessions').select('*').eq('date', TODAY).single()
    if (!data) return
    setExistingId(data.id)
    setWorkoutType(data.type)
    setDuration(data.duration_mins ?? null)
    setNotes(data.notes || '')
    // migrate old format { sets: number, reps, weight } → new { sets: SetEntry[] }
    const exs: Exercise[] = (data.exercises || []).map((e: Record<string, unknown>) => {
      if (typeof e.sets === 'number') {
        return {
          name: String(e.name || ''),
          sets: Array.from({ length: Number(e.sets) || 1 }, () => ({
            reps: Number(e.reps) || 10, weight: Number(e.weight) || 0,
          })),
          note: String(e.note || ''),
        }
      }
      return e as Exercise
    })
    setExercises(exs)
  }

  async function loadHistory() {
    const { data } = await supabase.from('workout_sessions').select('*')
      .order('date', { ascending: false }).limit(40)
    if (data) setHistory(data as WorkoutSession[])
  }

  async function loadRuns() {
    const { data } = await supabase.from('run_sessions').select('*')
      .order('date', { ascending: false }).limit(40)
    if (data) setRuns(data as RunSession[])
  }

  // ── Exercise mutations ────────────────────────────────────────────────────

  function addExercise() {
    setExercises(p => [...p, {
      name: '',
      sets: [{ reps: 10, weight: 20 }, { reps: 10, weight: 20 }, { reps: 10, weight: 20 }],
      note: '',
    }])
  }

  function toggleCollapseEx(ei: number) {
    setCollapsedEx(prev => {
      const next = new Set(prev)
      if (next.has(ei)) next.delete(ei); else next.add(ei)
      return next
    })
  }

  function toggleCollapseSet(ei: number, si: number) {
    const key = `${ei}-${si}`
    setCollapsedSets(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function removeEx(ei: number) {
    setExercises(p => p.filter((_, i) => i !== ei))
    setCollapsedEx(prev => {
      const next = new Set<number>()
      prev.forEach(i => { if (i < ei) next.add(i); else if (i > ei) next.add(i - 1) })
      return next
    })
  }

  function moveEx(i: number, dir: -1 | 1) {
    setExercises(p => {
      const a = [...p]; const j = i + dir
      if (j < 0 || j >= a.length) return a
      ;[a[i], a[j]] = [a[j], a[i]]; return a
    })
  }

  function updateExName(ei: number, v: string) {
    setExercises(p => p.map((e, i) => i === ei ? { ...e, name: v } : e))
  }

  function updateExNote(ei: number, v: string) {
    setExercises(p => p.map((e, i) => i === ei ? { ...e, note: v } : e))
  }

  function addSet(ei: number) {
    setExercises(p => p.map((e, i) => {
      if (i !== ei) return e
      const last = e.sets[e.sets.length - 1] || { reps: 10, weight: 20 }
      return { ...e, sets: [...e.sets, { ...last }] }
    }))
  }

  function removeSet(ei: number, si: number) {
    setExercises(p => p.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }))
  }

  function updateSet(ei: number, si: number, field: keyof SetEntry, v: number) {
    setExercises(p => p.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: v }),
    }))
  }

  // ── Save / delete ─────────────────────────────────────────────────────────

  async function saveSession() {
    setSaving(true)
    const payload = {
      date: TODAY, type: workoutType,
      exercises: exercises.filter(e => e.name.trim()),
      duration_mins: duration, notes: notes.trim() || null,
    }
    if (existingId) {
      await supabase.from('workout_sessions').update(payload).eq('id', existingId)
    } else {
      const { data } = await supabase.from('workout_sessions').insert(payload).select().single()
      if (data) setExistingId(data.id)
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function saveRun() {
    if (!runDist || !runDur) return
    setSavingRun(true)
    const { data } = await supabase.from('run_sessions')
      .insert({ date: TODAY, distance_km: runDist, duration_mins: runDur, notes: runNotes.trim() || null })
      .select().single()
    if (data) setRuns(p => [data as RunSession, ...p])
    setRunDist(null); setRunDur(null); setRunNotes(''); setSavingRun(false)
  }

  async function deleteRun(id: string) {
    await supabase.from('run_sessions').delete().eq('id', id)
    setRuns(p => p.filter(r => r.id !== id))
  }

  // ── Utils ─────────────────────────────────────────────────────────────────

  function fmtPace(km: number, mins: number) {
    const mpk = mins / km
    return `${Math.floor(mpk)}:${String(Math.round((mpk % 1) * 60)).padStart(2, '0')}/km`
  }

  const totalVolume = exercises.reduce((sum, e) =>
    sum + e.sets.reduce((s2, set) => s2 + set.reps * set.weight, 0), 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-wrap">
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
        {(['today', 'runs', 'history'] as const).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════ TODAY ══ */}
      {tab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Session type */}
          <div className="card">
            <span className="mono-label">SESSION TYPE</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {WORKOUT_TYPES.map(t => (
                <button key={t} className={`pill ${workoutType === t ? 'on' : ''}`} onClick={() => setWorkoutType(t)}>{t}</button>
              ))}
            </div>
          </div>

          {/* Exercises */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="mono-label" style={{ marginBottom: 0 }}>EXERCISES</span>
                {totalVolume > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 12 }}>
                    {totalVolume.toLocaleString()}kg total volume
                  </span>
                )}
              </div>
              <button className="btn btn-sm" onClick={addExercise}>+ Add</button>
            </div>

            {exercises.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No exercises yet.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {exercises.map((ex, ei) => {
                const exCollapsed = collapsedEx.has(ei)
                const exVol = ex.sets.reduce((s, set) => s + set.reps * set.weight, 0)
                return (
                <div key={ei} style={{ padding: 16, background: 'var(--paper-2)', borderRadius: 8 }}>

                  {/* Exercise name row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: exCollapsed ? 0 : 16 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', minWidth: 22 }}>#{ei + 1}</span>
                    <input
                      value={ex.name} onChange={e => updateExName(ei, e.target.value)}
                      placeholder="Exercise name (e.g. Bench Press)"
                      className="inp"
                      style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500 }}
                    />
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <button onClick={() => toggleCollapseEx(ei)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: '2px 4px' }}>
                        {exCollapsed ? '▸' : '▾'}
                      </button>
                      {ei > 0 && (
                        <button onClick={() => moveEx(ei, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 12, padding: '2px 4px' }}>↑</button>
                      )}
                      {ei < exercises.length - 1 && (
                        <button onClick={() => moveEx(ei, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 12, padding: '2px 4px' }}>↓</button>
                      )}
                      <button onClick={() => removeEx(ei)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, padding: '0 4px' }}>×</button>
                    </div>
                  </div>

                  {/* Collapsed summary */}
                  {exCollapsed && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', paddingLeft: 22 }}>
                      {ex.sets.length} sets{exVol > 0 ? ` · ${exVol.toLocaleString()}kg vol` : ''}
                      {ex.note ? ` · ${ex.note}` : ''}
                    </div>
                  )}

                  {/* Per-set rows */}
                  {!exCollapsed && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {ex.sets.map((set, si) => {
                          const setKey = `${ei}-${si}`
                          const setCollapsed = collapsedSets.has(setKey)
                          return (
                            <div key={si} style={{ paddingLeft: 12, borderLeft: '2px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', fontWeight: 500 }}>
                                  Set {si + 1}
                                  {set.reps > 0 && (
                                    <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>
                                      {' '}· {set.weight > 0 ? `${set.reps} reps @ ${set.weight}kg` : `${set.reps} reps BW`}
                                    </span>
                                  )}
                                </span>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <button onClick={() => toggleCollapseSet(ei, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 11, padding: '1px 4px' }}>
                                    {setCollapsed ? '▸' : '▾'}
                                  </button>
                                  {ex.sets.length > 1 && (
                                    <button onClick={() => removeSet(ei, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, padding: 0 }}>−</button>
                                  )}
                                </div>
                              </div>

                              {!setCollapsed && (
                                <>
                                  <div>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.07em', marginBottom: 5 }}>REPS</div>
                                    <PillPicker opts={REP_OPTS} value={set.reps} onChange={v => updateSet(ei, si, 'reps', v)} />
                                  </div>

                                  <div>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.07em', marginBottom: 5 }}>WEIGHT kg &mdash; 0 = bodyweight</div>
                                    <PillPicker opts={WEIGHT_OPTS} value={set.weight} onChange={v => updateSet(ei, si, 'weight', v)} fmt={v => v === 0 ? 'BW' : String(v)} />
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}

                        <button className="btn btn-ghost btn-sm" onClick={() => addSet(ei)}
                          style={{ alignSelf: 'flex-start', marginLeft: 12, color: 'var(--ink-3)' }}>
                          + add set
                        </button>
                      </div>

                      {/* Note */}
                      <input value={ex.note} onChange={e => updateExNote(ei, e.target.value)}
                        placeholder="Note (RPE, PR!, slow eccentric…)"
                        className="inp"
                        style={{ marginTop: 12, fontSize: 12 }} />

                      {/* Volume summary */}
                      {ex.sets.some(s => s.weight > 0) && (
                        <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                          {ex.sets.length} sets · {exVol.toLocaleString()}kg volume
                        </div>
                      )}
                    </>
                  )}
                </div>
              )})}

            </div>

            {exercises.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={addExercise} style={{ marginTop: 14, color: 'var(--ink-3)' }}>
                + add another exercise
              </button>
            )}
          </div>

          {/* Duration */}
          <div className="card">
            <span className="mono-label">DURATION (min)</span>
            <PillPicker opts={DUR_OPTS} value={duration} onChange={setDuration} />
          </div>

          {/* Session notes */}
          <div className="card">
            <span className="mono-label">SESSION NOTES</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="How did it feel? PRs? Recovery, energy level, what to fix next time…"
              className="inp"
              style={{ resize: 'vertical', minHeight: 64, lineHeight: 1.55, fontSize: 13 }} />
          </div>

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={saveSession} disabled={saving} style={{ minWidth: 140 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : existingId ? 'Update session' : 'Save session'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ RUNS ══ */}
      {tab === 'runs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Log a run */}
          <div className="card">
            <span className="mono-label">LOG A RUN</span>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.07em', marginBottom: 6 }}>DISTANCE (km)</div>
              <PillPicker opts={DIST_OPTS} value={runDist} onChange={setRunDist} fmt={v => `${v}km`} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.07em', marginBottom: 6 }}>DURATION (min)</div>
              <PillPicker opts={RUN_DUR} value={runDur} onChange={setRunDur} fmt={v => `${v}m`} />
            </div>

            {runDist && runDur && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
                pace: {fmtPace(runDist, runDur)} · ~{Math.round(runDist * 70)} kcal burned
              </div>
            )}

            <input value={runNotes} onChange={e => setRunNotes(e.target.value)}
              placeholder="Notes (route, how it felt…)"
              className="inp" style={{ marginBottom: 14, fontSize: 13 }} />

            <button className="btn btn-primary" onClick={saveRun} disabled={!runDist || !runDur || savingRun}>
              {savingRun ? 'Saving…' : 'Log run'}
            </button>
          </div>

          {/* Stats */}
          {runs.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'total runs', val: String(runs.length) },
                { label: 'total km',   val: runs.reduce((s, r) => s + r.distance_km, 0).toFixed(1) },
                { label: 'avg pace',   val: (() => {
                  const d = runs.reduce((s, r) => s + r.distance_km, 0)
                  const t = runs.reduce((s, r) => s + r.duration_mins, 0)
                  return d > 0 ? fmtPace(d, t) : '—'
                })() },
              ].map(({ label, val }) => (
                <div key={label} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500 }}>{val}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Run list */}
          {runs.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No runs logged yet.</p>
          ) : (
            <div className="card">
              <span className="mono-label">ALL RUNS</span>
              {runs.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: r.notes ? 4 : 0 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                        {r.date === TODAY ? 'today' : new Date(r.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{r.distance_km}km</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-2)' }}>{r.duration_mins}min</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>{fmtPace(r.distance_km, r.duration_mins)}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>~{Math.round(r.distance_km * 70)} kcal</span>
                    </div>
                    {r.notes && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{r.notes}</div>}
                  </div>
                  <button onClick={() => deleteRun(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, padding: '0 2px' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ HISTORY ══ */}
      {tab === 'history' && (
        <div>
          {history.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>No sessions logged yet.</p>
          )}
          {history.map((s, idx) => {
            const exs = (s.exercises || []) as Record<string, unknown>[]
            const vol = exs.reduce((sum, e) => {
              if (typeof e.sets === 'number') return sum + Number(e.sets) * Number(e.reps || 0) * Number(e.weight || 0)
              return sum + (e.sets as SetEntry[]).reduce((s2, set) => s2 + set.reps * set.weight, 0)
            }, 0)
            return (
              <div key={s.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--rule)', opacity: idx === 0 ? 1 : 0.85 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {s.date === TODAY ? 'today' : new Date(s.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{s.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    {s.duration_mins && <span>{s.duration_mins}min</span>}
                    {vol > 0 && <span>{vol.toLocaleString()}kg vol</span>}
                    <span>{exs.length} exercises</span>
                  </div>
                </div>
                {exs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: s.notes ? 10 : 0 }}>
                    {exs.map((e, j) => {
                      const summary = typeof e.sets === 'number'
                        ? (e.weight ? `${e.sets}×${e.reps}@${e.weight}` : `${e.sets}×${e.reps}`)
                        : (e.sets as SetEntry[]).map(s => s.weight > 0 ? `${s.reps}@${s.weight}` : `${s.reps}`).join(', ')
                      return (
                        <span key={j} style={{
                          fontFamily: 'var(--mono)', fontSize: 11,
                          background: 'var(--paper-2)', borderRadius: 4, padding: '3px 9px',
                          color: 'var(--ink-2)', border: '1px solid var(--rule)',
                        }}>
                          {String(e.name)} {summary}
                        </span>
                      )
                    })}
                  </div>
                )}
                {s.notes && (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 6 }}>{s.notes}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
