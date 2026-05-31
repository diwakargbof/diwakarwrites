'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

type Habits = {
  wake_time: string | null
  sleep_time: string | null
  sleep_hours: number | null
  steps: number | null
  water_ml: number | null
  weight_kg: number | null
  mood: number | null
  meditation_min: number | null
  pages_read: number | null
  pages_written: number | null
  face_care: boolean | null
  oral_care: boolean | null
  dream_notes: string | null
}
type Food = { description: string; calories: number; protein_g: number; fiber_g: number }
type Parsed = { habits: Habits; foods: Food[]; note?: string }

type Phase = 'idle' | 'recording' | 'working' | 'review' | 'saving' | 'done' | 'error'

const HABIT_LABELS: Record<keyof Habits, string> = {
  wake_time: 'Wake time', sleep_time: 'Sleep time', sleep_hours: 'Sleep', steps: 'Steps',
  water_ml: 'Water', weight_kg: 'Weight', mood: 'Mood', meditation_min: 'Meditation',
  pages_read: 'Pages read', pages_written: 'Pages written', face_care: 'Skincare',
  oral_care: 'Oral care', dream_notes: 'Dream',
}
const MOOD_WORDS = ['', 'rough', 'meh', 'okay', 'good', 'great']

function fmtHabit(key: keyof Habits, v: number | string | boolean): string {
  if (key === 'water_ml') return `${v} ml`
  if (key === 'sleep_hours') return `${v} h`
  if (key === 'meditation_min') return `${v} min`
  if (key === 'weight_kg') return `${v} kg`
  if (key === 'mood') return `${MOOD_WORDS[Number(v)] || v} (${v}/5)`
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  return String(v)
}

export default function VoiceLogger() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState('')
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Allow other components (e.g. NavBar "Log" button) to open the logger
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-voice-log', handler)
    return () => window.removeEventListener('open-voice-log', handler)
  }, [])

  const reset = useCallback(() => {
    setPhase('idle'); setStatus(''); setTranscript(''); setParsed(null); setError('')
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    reset()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => { void handleAudio(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })) }
      recorderRef.current = rec
      rec.start()
      setPhase('recording')
    } catch {
      setError('Microphone access denied or unavailable.')
      setPhase('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset])

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop()
    stopStream()
  }, [stopStream])

  async function handleAudio(blob: Blob) {
    setPhase('working')
    setStatus('Transcribing…')
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'log.webm')
      const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const tJson = await tRes.json()
      if (!tRes.ok || !tJson.text) throw new Error(tJson.error || 'Transcription failed')
      setTranscript(tJson.text)

      setStatus('Understanding…')
      const pRes = await fetch('/api/voice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: tJson.text }),
      })
      const pJson = await pRes.json()
      if (!pRes.ok || !pJson.parsed) throw new Error(pJson.error || 'Could not understand that')
      setParsed(pJson.parsed as Parsed)
      setPhase('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('error')
    }
  }

  function removeFood(i: number) {
    if (!parsed) return
    setParsed({ ...parsed, foods: parsed.foods.filter((_, idx) => idx !== i) })
  }

  async function save() {
    if (!parsed) return
    setPhase('saving')
    try {
      // Build a partial habit_logs row from non-null fields (upsert only touches these columns)
      const habitRow: Record<string, unknown> = { date: TODAY }
      for (const [k, v] of Object.entries(parsed.habits)) {
        if (v !== null && v !== undefined) habitRow[k] = v
      }
      if (Object.keys(habitRow).length > 1) {
        const { error: hErr } = await supabase.from('habit_logs').upsert(habitRow, { onConflict: 'date' })
        if (hErr) throw hErr
      }
      if (parsed.foods.length) {
        const rows = parsed.foods.map(f => ({
          date: TODAY, meal_type: 'meal', description: f.description,
          calories: Math.round(f.calories) || 0,
          protein_g: Math.round(f.protein_g) || 0,
          fiber_g: Math.round(f.fiber_g) || 0,
        }))
        const { error: fErr } = await supabase.from('food_entries').insert(rows)
        if (fErr) throw fErr
      }
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setPhase('error')
    }
  }

  function close() {
    if (phase === 'recording') stopRecording()
    stopStream()
    setOpen(false)
    setTimeout(reset, 250)
  }

  const habitEntries = parsed
    ? (Object.entries(parsed.habits) as [keyof Habits, number | string | boolean | null][])
        .filter(([, v]) => v !== null && v !== undefined)
    : []
  const nothingFound = parsed && habitEntries.length === 0 && parsed.foods.length === 0

  return (
    <>
      {/* Floating trigger — mobile only (desktop uses the nav "Log" button) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Voice log"
        className="voice-fab"
        style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 60, alignItems: 'center', gap: 8,
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 999, padding: '11px 18px', cursor: 'pointer',
          fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
          boxShadow: '0 6px 22px rgba(0,0,0,0.18)',
        }}
      >
        <span style={{ fontSize: 15 }}>🎙</span> Log
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.32)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--paper)', width: '100%', maxWidth: 440,
              borderRadius: '14px 14px 0 0', padding: '22px 22px 28px',
              maxHeight: '82vh', overflowY: 'auto',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span className="mono-label" style={{ marginBottom: 0 }}>VOICE LOG · TODAY</span>
              <button onClick={close} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
            </div>

            {/* IDLE */}
            {phase === 'idle' && (
              <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-2)', marginBottom: 6 }}>
                  Just say your day out loud.
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 22 }}>
                  “Woke at 7, 8k steps, 2 litres of water, oats and 3 eggs, meditated 20 minutes, mood good, weight 67.”
                </p>
                <button onClick={startRecording} className="btn btn-primary" style={{ borderRadius: 999, padding: '12px 24px' }}>
                  ● Start recording
                </button>
              </div>
            )}

            {/* RECORDING */}
            {phase === 'recording' && (
              <div style={{ textAlign: 'center', padding: '18px 0 4px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 26, animation: 'vl-pulse 1.3s ease-in-out infinite',
                }}>🎙</div>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', marginBottom: 20 }}>listening…</p>
                <button onClick={stopRecording} className="btn btn-primary" style={{ borderRadius: 999, padding: '12px 24px' }}>
                  ■ Stop &amp; process
                </button>
              </div>
            )}

            {/* WORKING / SAVING */}
            {(phase === 'working' || phase === 'saving') && (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-2)' }}>
                  {phase === 'saving' ? 'Saving…' : status || 'Working…'}
                </div>
              </div>
            )}

            {/* REVIEW */}
            {phase === 'review' && parsed && (
              <div>
                {parsed.note && (
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-2)', marginBottom: 14, fontStyle: 'italic' }}>
                    “{parsed.note}”
                  </p>
                )}

                {nothingFound && (
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                    I couldn’t pick anything loggable out of that. Try again?
                  </p>
                )}

                {habitEntries.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <span className="mono-label">HABITS</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {habitEntries.map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                          <span style={{ color: 'var(--ink-3)' }}>{HABIT_LABELS[k]}</span>
                          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{fmtHabit(k, v as number | string | boolean)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsed.foods.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span className="mono-label">FOOD</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {parsed.foods.map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, gap: 8 }}>
                          <span style={{ color: 'var(--ink)', flex: 1 }}>{f.description}</span>
                          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>
                            {Math.round(f.calories)} kcal · {Math.round(f.protein_g)}p
                          </span>
                          <button onClick={() => removeFood(i)} style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 15 }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details style={{ marginBottom: 16 }}>
                  <summary style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    transcript
                  </summary>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>{transcript}</p>
                </details>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={startRecording} className="btn" style={{ flex: 1 }}>Redo</button>
                  <button onClick={save} className="btn btn-primary" style={{ flex: 2 }} disabled={!!nothingFound}>
                    Save to today
                  </button>
                </div>
              </div>
            )}

            {/* DONE */}
            {phase === 'done' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>✓</div>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', marginBottom: 18 }}>Logged for today.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={reset} className="btn">Log more</button>
                  <button onClick={close} className="btn btn-primary">Done</button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {phase === 'error' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 13.5, color: 'var(--accent)', marginBottom: 18 }}>{error}</p>
                <button onClick={reset} className="btn btn-primary">Try again</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes vl-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196,80,46,0.45); }
          50% { box-shadow: 0 0 0 14px rgba(196,80,46,0); }
        }
      `}</style>
    </>
  )
}
