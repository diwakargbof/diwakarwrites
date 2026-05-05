'use client'

import { useState, useEffect, ReactNode } from 'react'

const AUTH_KEY = 'dw_auth'

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH_KEY) === '1')
  }, [])

  if (authed === null) return null

  if (authed) return <>{children}</>

  async function attempt() {
    const pw = input.trim()
    if (!pw) return
    setChecking(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (res.ok) {
        localStorage.setItem(AUTH_KEY, '1')
        setAuthed(true)
      } else {
        setError(true)
        setInput('')
        setTimeout(() => setError(false), 800)
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 14,
      padding: '40px 24px',
    }}>
      <p style={{
        fontFamily: 'var(--serif)',
        fontSize: 26,
        fontWeight: 500,
        color: 'var(--ink)',
        margin: 0,
      }}>
        hey there, wanderer.
      </p>
      <p style={{
        fontFamily: 'var(--mono)',
        fontSize: 12,
        color: 'var(--ink-3)',
        margin: 0,
        letterSpacing: '0.02em',
      }}>
        if you&apos;re diwakar, you know what to do.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          animation: error ? 'gate-shake 0.4s ease' : undefined,
        }}
      >
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="don't even try to guess"
          autoFocus
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            padding: '8px 14px',
            border: `1px solid ${error ? 'var(--accent)' : 'var(--rule)'}`,
            borderRadius: 'var(--r)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            outline: 'none',
            width: 220,
            transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={attempt}
          disabled={checking}
          className="btn btn-primary"
        >
          {checking ? '…' : 'let me in'}
        </button>
      </div>
      {error && (
        <p style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--accent)',
          margin: 0,
          letterSpacing: '0.02em',
        }}>
          nope. try again, genius.
        </p>
      )}
    </div>
  )
}
