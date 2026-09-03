'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login } from './actions'

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null)

  return (
    <div style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '48px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div className="kicker" style={{ marginBottom: 20 }}>
          <span className="kicker-dot" /> private
        </div>

        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400,
          letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10,
        }}>
          hey there, wanderer.
        </h1>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)',
          marginBottom: 28, letterSpacing: '0.02em',
        }}>
          if you&apos;re diwakar, you know what to do.
        </p>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="hidden" name="next" value={next} />
          <input
            type="password"
            name="password"
            placeholder="don't even try to guess"
            autoFocus
            autoComplete="current-password"
            className="inp"
            style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
          />
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? '…' : 'let me in'}
          </button>
        </form>

        {state?.error && (
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
            marginTop: 12, letterSpacing: '0.02em',
          }}>
            nope. try again, genius.
          </p>
        )}

        <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
          <Link href="/" style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none',
          }}>
            ← back to the public bit
          </Link>
        </div>
      </div>
    </div>
  )
}
