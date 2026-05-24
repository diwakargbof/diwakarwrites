'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface FinanceCard {
  id: string
  concept: string
  content: string
  key_takeaway: string
  estimated_minutes: number
  read_at: string | null
  created_at: string
}

// Simple markdown renderer (bold + paragraphs only)
function renderContent(text: string) {
  const paragraphs = text.split(/\n\n+/)
  return paragraphs.map((para, i) => {
    // Process **bold**
    const parts = para.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      return <span key={j}>{part}</span>
    })
    return (
      <p key={i} style={{
        fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.8,
        color: 'var(--ink-2)', marginBottom: 18,
      }}>
        {rendered}
      </p>
    )
  })
}

export default function FinanceLearnPage() {
  const [card, setCard] = useState<FinanceCard | null>(null)
  const [history, setHistory] = useState<FinanceCard[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const loadCard = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/finance/card')
    if (res.ok) {
      const data = await res.json()
      setCard(data.card ?? null)
    }
    setLoading(false)
  }, [])

  const loadHistory = useCallback(async () => {
    // Re-fetch all cards to get history — call the DB directly via the price API pattern
    // We'll use a simple approach: the card GET already gives unread; for history we parse from the response
    // Instead, just fetch via supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await sb
      .from('finance_cards')
      .select('*')
      .not('read_at', 'is', null)
      .order('read_at', { ascending: false })
    setHistory((data ?? []) as FinanceCard[])
  }, [])

  useEffect(() => {
    loadCard()
    loadHistory()
  }, [loadCard, loadHistory])

  async function handleMarkRead() {
    if (!card) return
    setGenerating(true)
    const res = await fetch('/api/finance/card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id }),
    })
    if (res.ok) {
      const data = await res.json()
      // Add old card to history
      setHistory(h => [{ ...card, read_at: new Date().toISOString() }, ...h])
      setCard(data.card ?? null)
    }
    setGenerating(false)
  }

  async function handleStartLearning() {
    setGenerating(true)
    const res = await fetch('/api/finance/card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const data = await res.json()
      setCard(data.card ?? null)
    }
    setGenerating(false)
  }

  const totalLearned = history.length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/finance" style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)',
          textDecoration: 'none', letterSpacing: '0.08em',
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20,
        }}>
          ← finance
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700,
              color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4,
            }}>
              Finance University
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-3)' }}>
              One concept at a time. Mark it done, get the next.
            </p>
          </div>
          {totalLearned > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)',
              }}>
                {totalLearned}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                concepts learned
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: i === 1 ? 32 : 16,
              background: 'var(--paper-2)', borderRadius: 6,
              width: i === 1 ? '60%' : `${70 + i * 5}%`,
              opacity: 0.8,
            }} />
          ))}
        </div>
      )}

      {/* ── No card yet — first time ── */}
      {!loading && !generating && !card && totalLearned === 0 && (
        <div style={{
          border: '1px solid var(--rule)', borderRadius: 12,
          padding: '48px 40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700,
            color: 'var(--ink)', marginBottom: 12, letterSpacing: '-0.01em',
          }}>
            Start from zero
          </h2>
          <p style={{
            fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-3)',
            lineHeight: 1.7, maxWidth: 360, margin: '0 auto 28px',
          }}>
            You&apos;ll learn everything — what a stock is, how markets work, ETFs, mutual funds, why prices move — all from scratch, in 5-minute bite-sized concepts.
          </p>
          <button
            onClick={handleStartLearning}
            style={{
              fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
              padding: '12px 28px', border: 'none', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            Begin Learning →
          </button>
        </div>
      )}

      {/* ── Generating next card ── */}
      {generating && (
        <div style={{
          border: '1px solid var(--rule)', borderRadius: 12,
          padding: '48px 40px', textAlign: 'center',
        }}>
          <div style={{ marginBottom: 20 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'inline-block',
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent)', margin: '0 4px',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-3)',
          }}>
            Generating your next concept…
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 8,
          }}>
            (takes ~10 seconds)
          </div>
        </div>
      )}

      {/* ── Current card ── */}
      {!loading && !generating && card && (
        <div>
          {/* Card header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--accent)',
            }}>
              Today&apos;s concept
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
            }}>
              ≈ {card.estimated_minutes} min read
            </span>
          </div>

          {/* Card body */}
          <div style={{
            border: '1px solid var(--rule)', borderRadius: 12,
            padding: '32px 36px', marginBottom: 24,
            background: 'var(--paper)',
          }}>
            <h2 style={{
              fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700,
              color: 'var(--ink)', letterSpacing: '-0.02em',
              marginBottom: 28, lineHeight: 1.25,
            }}>
              {card.concept}
            </h2>

            <div>
              {renderContent(card.content)}
            </div>

            {/* Key takeaway */}
            {card.key_takeaway && (
              <div style={{
                marginTop: 28, padding: '16px 20px',
                background: 'var(--accent-pale)', borderRadius: 8,
                borderLeft: '3px solid var(--accent)',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                }}>
                  Key Takeaway
                </div>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600,
                  color: 'var(--ink)', lineHeight: 1.5,
                }}>
                  {card.key_takeaway}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
              {totalLearned > 0 && `${totalLearned} concept${totalLearned !== 1 ? 's' : ''} learned so far`}
            </div>
            <button
              onClick={handleMarkRead}
              style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                padding: '12px 24px', border: 'none', borderRadius: 8,
                background: 'var(--accent)', color: '#fff',
                cursor: 'pointer', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'opacity 0.15s',
              }}
            >
              Got it — Next Concept →
            </button>
          </div>
        </div>
      )}

      {/* ── Previously learned (history) ── */}
      {totalLearned > 0 && (
        <div style={{ marginTop: 48 }}>
          <button
            onClick={() => setHistoryOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '12px 0',
              borderTop: '1px solid var(--rule)',
              borderBottom: '1px solid var(--rule)',
              background: 'none', border: 'none', cursor: 'pointer',
            } as React.CSSProperties}
          >
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-4)',
            }}>
              Previously Learned ({totalLearned})
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
              {historyOpen ? '▲' : '▼'}
            </span>
          </button>

          {historyOpen && (
            <div style={{ marginTop: 12 }}>
              {history.map((h, i) => (
                <div key={h.id} style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  padding: '14px 0',
                  borderBottom: i < history.length - 1 ? '1px solid var(--rule)' : 'none',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                      ✓
                    </span>
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600,
                      color: 'var(--ink)', marginBottom: 3,
                    }}>
                      {h.concept}
                    </div>
                    {h.key_takeaway && (
                      <div style={{
                        fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-3)',
                        lineHeight: 1.5,
                      }}>
                        {h.key_takeaway}
                      </div>
                    )}
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 4,
                    }}>
                      {h.read_at ? new Date(h.read_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
