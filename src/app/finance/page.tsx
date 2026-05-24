'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface Holding {
  id: string
  symbol: string
  name: string
  units: number
  buy_price: number
  buy_currency: string
  asset_type: string
}

interface Quote {
  price: number
  prevClose: number
  change: number
  changePct: number
  currency: string
}

interface Research {
  date: string
  brief: string
}

interface FinanceCard {
  id: string
  concept: string
  estimated_minutes: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PULSE_SYMBOLS = ['^NSEI', '^BSESN', '^GSPC', 'BTC-USD', 'GC=F', 'USDINR=X']

const PULSE_LABELS: Record<string, string> = {
  '^NSEI': 'NIFTY 50',
  '^BSESN': 'SENSEX',
  '^GSPC': 'S&P 500',
  'BTC-USD': 'BITCOIN',
  'GC=F': 'GOLD',
  'USDINR=X': 'USD/INR',
}

const ASSET_COLORS: Record<string, string> = {
  stock: '#C4502E',
  etf: '#2a7a4a',
  mf: '#7a6fc0',
  index: '#b07a2a',
  crypto: '#0a7a8a',
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function pctBadge(pct: number) {
  const up = pct >= 0
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
      color: up ? '#22a06b' : '#e03c31',
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  )
}

function sipFV(monthly: number, years: number, annualRate: number): number {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return monthly * n
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

function getSentiment(pct: number): { label: string; emoji: string; color: string; pos: number } {
  if (pct > 1.5)  return { label: 'Euphoria',    emoji: '🚀', color: '#22a06b', pos: 92 }
  if (pct > 0.5)  return { label: 'Greed',       emoji: '😤', color: '#5cb85c', pos: 72 }
  if (pct > -0.5) return { label: 'Neutral',     emoji: '😐', color: '#8A7F7C', pos: 50 }
  if (pct > -1.5) return { label: 'Fear',        emoji: '😟', color: '#e8a200', pos: 28 }
  return             { label: 'Panic',        emoji: '😨', color: '#e03c31', pos: 8  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MarketPulse({ prices }: { prices: Record<string, Quote | null> }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: 1,
      background: 'var(--rule)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 32,
    }}>
      {PULSE_SYMBOLS.map(sym => {
        const q = prices[sym]
        const label = PULSE_LABELS[sym]
        const isFx = sym === 'USDINR=X'
        const isGold = sym === 'GC=F'
        const isBtc = sym === 'BTC-USD'

        let displayPrice = '—'
        if (q) {
          if (isFx) displayPrice = `₹${q.price.toFixed(2)}`
          else if (isGold) displayPrice = `$${fmt(q.price, 0)}`
          else if (isBtc) displayPrice = `$${fmt(q.price, 0)}`
          else if (sym === '^GSPC') displayPrice = fmt(q.price, 0)
          else displayPrice = fmt(q.price, 0)
        }

        return (
          <div key={sym} style={{
            background: 'var(--paper)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-4)',
            }}>
              {label}
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600,
              color: 'var(--ink)', letterSpacing: '-0.02em',
            }}>
              {displayPrice}
            </span>
            {q && !isFx && pctBadge(q.changePct)}
            {!q && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>loading…</span>}
          </div>
        )
      })}
    </div>
  )
}

function SentimentMeter({ niftyPct }: { niftyPct?: number }) {
  if (niftyPct === undefined) return null
  const s = getSentiment(niftyPct)
  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px',
      marginBottom: 16,
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12,
      }}>
        Market Sentiment
      </div>
      {/* Track */}
      <div style={{
        position: 'relative', height: 6, borderRadius: 3, marginBottom: 12,
        background: 'linear-gradient(to right, #e03c31 0%, #e8a200 25%, #8A7F7C 50%, #5cb85c 75%, #22a06b 100%)',
      }}>
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${s.pos}%`,
          width: 14, height: 14, borderRadius: '50%',
          background: s.color, border: '2px solid var(--paper)',
          boxShadow: `0 0 0 2px ${s.color}`,
          transition: 'left 0.4s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>panic</span>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 20 }}>{s.emoji}</span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: s.color, marginTop: 2 }}>
            {s.label}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            Nifty {niftyPct >= 0 ? '+' : ''}{niftyPct.toFixed(2)}% today
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>euphoria</span>
      </div>
    </div>
  )
}

function LearnCardTeaser({ card, loading }: { card: FinanceCard | null; loading: boolean }) {
  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px',
      marginBottom: 16,
      background: 'var(--accent-pale)',
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10,
      }}>
        📚 Today's Lesson
      </div>
      {loading && (
        <div style={{ height: 40, background: 'var(--paper-2)', borderRadius: 4 }} />
      )}
      {!loading && card && (
        <>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600,
            color: 'var(--ink)', lineHeight: 1.35, marginBottom: 8,
          }}>
            {card.concept}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginBottom: 14,
          }}>
            ≈ {card.estimated_minutes} min read
          </div>
          <Link href="/finance/learn" style={{
            display: 'inline-block',
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
            color: 'var(--accent)', textDecoration: 'none',
            padding: '6px 12px', border: '1px solid var(--accent)',
            borderRadius: 6, letterSpacing: '0.04em',
            transition: 'background 0.12s, color 0.12s',
          }}>
            Study now →
          </Link>
        </>
      )}
      {!loading && !card && (
        <>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-2)',
            lineHeight: 1.5, marginBottom: 14,
          }}>
            Start your finance education — one concept a day, from absolute zero.
          </div>
          <Link href="/finance/learn" style={{
            display: 'inline-block',
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
            color: '#fff', textDecoration: 'none',
            padding: '7px 14px', background: 'var(--accent)',
            borderRadius: 6, letterSpacing: '0.04em',
          }}>
            Start learning →
          </Link>
        </>
      )}
    </div>
  )
}

function QuickLookup() {
  const [symbol, setSymbol] = useState('')
  const [result, setResult] = useState<Quote & { sym: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function lookup() {
    const s = symbol.trim().toUpperCase()
    if (!s) return
    setLoading(true); setErr(''); setResult(null)
    try {
      const res = await fetch(`/api/finance/prices?symbols=${encodeURIComponent(s)}`)
      const data = await res.json()
      const q = data[s]
      if (!q) setErr('Symbol not found. Try RELIANCE.NS, AAPL, ^NSEI, BTC-USD…')
      else setResult({ ...q, sym: s })
    } catch {
      setErr('Failed to fetch price.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px',
      marginBottom: 16,
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10,
      }}>
        🔍 Quick Price Lookup
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="e.g. TCS.NS, AAPL, ^NSEI"
          style={{
            flex: 1, fontFamily: 'var(--mono)', fontSize: 12,
            padding: '7px 10px', border: '1px solid var(--rule)',
            borderRadius: 6, background: 'var(--paper-2)',
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <button
          onClick={lookup}
          disabled={loading || !symbol.trim()}
          style={{
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
            padding: '7px 12px', borderRadius: 6, border: 'none',
            background: 'var(--ink)', color: 'var(--paper)', cursor: 'pointer',
            opacity: loading || !symbol.trim() ? 0.4 : 1,
          }}
        >
          {loading ? '…' : 'Go'}
        </button>
      </div>
      {err && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#e03c31', marginTop: 8 }}>
          {err}
        </div>
      )}
      {result && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'var(--paper-2)', borderRadius: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', marginBottom: 4 }}>
              {result.sym}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              {result.currency === 'USD' ? '$' : result.currency === 'INR' ? '₹' : ''}
              {result.price > 1000 ? fmt(result.price, 0) : result.price.toFixed(2)}
            </div>
          </div>
          {pctBadge(result.changePct)}
        </div>
      )}
    </div>
  )
}

function SIPCalculator() {
  const [monthly, setMonthly] = useState(5000)
  const [years, setYears] = useState(10)
  const [rate, setRate] = useState(12)

  const invested = monthly * years * 12
  const total = sipFV(monthly, years, rate)
  const gains = total - invested
  const gainPct = invested > 0 ? ((gains / invested) * 100) : 0
  const investedRatio = (invested / total) * 100

  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 10, padding: '24px 28px',
      marginBottom: 32,
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 20,
      }}>
        📈 SIP Calculator — Systematic Investment Plan
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        {[
          { label: 'Monthly SIP (₹)', value: monthly, setter: setMonthly, min: 500, max: 100000, step: 500 },
          { label: 'Duration (years)', value: years, setter: setYears, min: 1, max: 40, step: 1 },
          { label: 'Expected Return (%)', value: rate, setter: setRate, min: 1, max: 30, step: 0.5 },
        ].map(({ label, value, setter, min, max, step }) => (
          <div key={label}>
            <label style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-4)',
              display: 'block', marginBottom: 6,
            }}>
              {label}
            </label>
            <input
              type="number"
              value={value}
              min={min} max={max} step={step}
              onChange={e => setter(Number(e.target.value))}
              style={{
                width: '100%', fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600,
                padding: '8px 10px', border: '1px solid var(--rule)',
                borderRadius: 6, background: 'var(--paper-2)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20,
      }}>
        {[
          { label: 'Total Invested', value: `₹${fmt(invested)}`, color: 'var(--ink-3)' },
          { label: 'Estimated Gains', value: `₹${fmt(Math.round(gains))}`, color: '#22a06b' },
          { label: 'Final Value', value: `₹${fmt(Math.round(total))}`, color: 'var(--accent)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--paper-2)', borderRadius: 8, padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
            }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'var(--paper-2)', marginBottom: 6,
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${investedRatio}%`,
            background: 'var(--ink-3)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
          <span>Invested {investedRatio.toFixed(0)}%</span>
          <span style={{ color: '#22a06b' }}>Gains {(100 - investedRatio).toFixed(0)}% (+{gainPct.toFixed(0)}%)</span>
        </div>
      </div>

      <div style={{
        marginTop: 14, fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--ink-3)',
        fontStyle: 'italic', lineHeight: 1.5,
      }}>
        Based on {rate}% p.a. return compounded monthly. Past performance doesn't guarantee future returns.
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [prices, setPrices] = useState<Record<string, Quote | null>>({})
  const [research, setResearch] = useState<Research | null>(null)
  const [learnCard, setLearnCard] = useState<FinanceCard | null>(null)
  const [loadingHoldings, setLoadingHoldings] = useState(true)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [loadingResearch, setLoadingResearch] = useState(true)
  const [loadingCard, setLoadingCard] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    symbol: '', name: '', units: '', buy_price: '', buy_currency: 'INR', asset_type: 'stock',
  })
  const [addingHolding, setAddingHolding] = useState(false)

  // Load pulse prices (market overview)
  const loadPulsePrices = useCallback(async () => {
    const res = await fetch(`/api/finance/prices?symbols=${PULSE_SYMBOLS.map(encodeURIComponent).join(',')}`)
    if (res.ok) setPrices(await res.json())
  }, [])

  // Load portfolio holdings + their current prices
  const loadHoldings = useCallback(async () => {
    setLoadingHoldings(true)
    const { data } = await supabase.from('finance_holdings').select('*').order('created_at', { ascending: false })
    const h = (data ?? []) as Holding[]
    setHoldings(h)
    setLoadingHoldings(false)

    // Fetch live prices for held symbols
    if (h.length > 0) {
      setLoadingPrices(true)
      const syms = [...new Set(h.map(x => x.symbol))]
      const res = await fetch(`/api/finance/prices?symbols=${syms.map(encodeURIComponent).join(',')}`)
      if (res.ok) {
        const data = await res.json()
        setPrices(prev => ({ ...prev, ...data }))
      }
      setLoadingPrices(false)
    }
  }, [])

  useEffect(() => {
    loadHoldings()
    loadPulsePrices()

    // Daily research brief
    fetch('/api/finance/research')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setResearch(d); setLoadingResearch(false) })
      .catch(() => setLoadingResearch(false))

    // Current learn card
    fetch('/api/finance/card')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setLearnCard(d?.card ?? null); setLoadingCard(false) })
      .catch(() => setLoadingCard(false))

    // Refresh pulse every 5 min
    const id = setInterval(loadPulsePrices, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadHoldings, loadPulsePrices])

  async function addHolding() {
    if (!addForm.symbol || !addForm.name || !addForm.units || !addForm.buy_price) return
    setAddingHolding(true)
    await supabase.from('finance_holdings').insert({
      symbol: addForm.symbol.trim().toUpperCase(),
      name: addForm.name.trim(),
      units: parseFloat(addForm.units),
      buy_price: parseFloat(addForm.buy_price),
      buy_currency: addForm.buy_currency,
      asset_type: addForm.asset_type,
    })
    setAddForm({ symbol: '', name: '', units: '', buy_price: '', buy_currency: 'INR', asset_type: 'stock' })
    setShowAddForm(false)
    setAddingHolding(false)
    loadHoldings()
  }

  async function removeHolding(id: string) {
    await supabase.from('finance_holdings').delete().eq('id', id)
    setHoldings(h => h.filter(x => x.id !== id))
  }

  // Portfolio math
  const usdInrRate = prices['USDINR=X']?.price ?? 84
  const portfolioRows = holdings.map(h => {
    const q = prices[h.symbol]
    const currentPrice = q?.price ?? null
    const invested = h.units * h.buy_price
    const currentValue = currentPrice ? h.units * currentPrice : null
    const pnl = currentValue !== null ? currentValue - invested : null
    const pnlPct = pnl !== null && invested > 0 ? (pnl / invested) * 100 : null
    const investedINR = h.buy_currency === 'USD' ? invested * usdInrRate : invested
    const currentINR = currentValue !== null
      ? (h.buy_currency === 'USD' ? currentValue * usdInrRate : currentValue)
      : null
    return { ...h, currentPrice, invested, currentValue, pnl, pnlPct, investedINR, currentINR }
  })

  const totalInvestedINR = portfolioRows.reduce((s, r) => s + r.investedINR, 0)
  const totalCurrentINR = portfolioRows.reduce((s, r) => s + (r.currentINR ?? r.investedINR), 0)
  const totalPnLINR = totalCurrentINR - totalInvestedINR
  const totalPnLPct = totalInvestedINR > 0 ? (totalPnLINR / totalInvestedINR) * 100 : 0

  const niftyPct = prices['^NSEI']?.changePct

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 64px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 700,
          color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Finance
        </h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-3)' }}>
          Your portfolio, market pulse, and learning journey.
        </p>
      </div>

      {/* ── Market Pulse ── */}
      <MarketPulse prices={prices} />

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginBottom: 32 }}>

        {/* LEFT — Portfolio */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16,
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4,
              }}>
                Portfolio
              </div>
              {holdings.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--ink)',
                  }}>
                    ₹{fmt(Math.round(totalCurrentINR))}
                  </span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                    color: totalPnLINR >= 0 ? '#22a06b' : '#e03c31',
                  }}>
                    {totalPnLINR >= 0 ? '▲' : '▼'} ₹{fmt(Math.abs(Math.round(totalPnLINR)))} ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAddForm(v => !v)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                padding: '7px 14px', border: '1px solid var(--rule)',
                borderRadius: 6, background: showAddForm ? 'var(--ink)' : 'var(--paper)',
                color: showAddForm ? 'var(--paper)' : 'var(--ink)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {showAddForm ? '✕ Cancel' : '+ Add Holding'}
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div style={{
              border: '1px solid var(--rule)', borderRadius: 10, padding: '20px',
              marginBottom: 16, background: 'var(--paper-2)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                  { key: 'symbol', label: 'Ticker Symbol', placeholder: 'e.g. RELIANCE.NS, AAPL, ^NSEI' },
                  { key: 'name', label: 'Display Name', placeholder: 'e.g. Reliance Industries' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      display: 'block', marginBottom: 4,
                    }}>
                      {label}
                    </label>
                    <input
                      value={addForm[key as keyof typeof addForm]}
                      onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{
                        width: '100%', fontFamily: 'var(--mono)', fontSize: 13,
                        padding: '8px 10px', border: '1px solid var(--rule)',
                        borderRadius: 6, background: 'var(--paper)',
                        color: 'var(--ink)', outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { key: 'units', label: 'Units', placeholder: '10', type: 'number' },
                  { key: 'buy_price', label: 'Buy Price', placeholder: '2800', type: 'number' },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label style={{
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      display: 'block', marginBottom: 4,
                    }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      value={addForm[key as keyof typeof addForm]}
                      onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{
                        width: '100%', fontFamily: 'var(--mono)', fontSize: 13,
                        padding: '8px 10px', border: '1px solid var(--rule)',
                        borderRadius: 6, background: 'var(--paper)',
                        color: 'var(--ink)', outline: 'none',
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    display: 'block', marginBottom: 4,
                  }}>
                    Currency
                  </label>
                  <select
                    value={addForm.buy_currency}
                    onChange={e => setAddForm(f => ({ ...f, buy_currency: e.target.value }))}
                    style={{
                      width: '100%', fontFamily: 'var(--mono)', fontSize: 13,
                      padding: '8px 10px', border: '1px solid var(--rule)',
                      borderRadius: 6, background: 'var(--paper)',
                      color: 'var(--ink)', outline: 'none',
                    }}
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    display: 'block', marginBottom: 4,
                  }}>
                    Type
                  </label>
                  <select
                    value={addForm.asset_type}
                    onChange={e => setAddForm(f => ({ ...f, asset_type: e.target.value }))}
                    style={{
                      width: '100%', fontFamily: 'var(--mono)', fontSize: 13,
                      padding: '8px 10px', border: '1px solid var(--rule)',
                      borderRadius: 6, background: 'var(--paper)',
                      color: 'var(--ink)', outline: 'none',
                    }}
                  >
                    <option value="stock">Stock</option>
                    <option value="etf">ETF</option>
                    <option value="mf">Mutual Fund</option>
                    <option value="index">Index</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addHolding}
                disabled={addingHolding || !addForm.symbol || !addForm.name || !addForm.units || !addForm.buy_price}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                  padding: '9px 20px', border: 'none', borderRadius: 6,
                  background: 'var(--accent)', color: '#fff',
                  cursor: 'pointer', opacity: addingHolding ? 0.6 : 1,
                }}
              >
                {addingHolding ? 'Adding…' : 'Add to Portfolio'}
              </button>
            </div>
          )}

          {/* Holdings Table */}
          {loadingHoldings ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 52, background: 'var(--paper-2)', borderRadius: 8 }} />
              ))}
            </div>
          ) : holdings.length === 0 ? (
            <div style={{
              border: '1px dashed var(--rule)', borderRadius: 10,
              padding: '40px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-2)', marginBottom: 6 }}>
                No holdings yet
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-4)' }}>
                Add your first stock, ETF, or mutual fund to start tracking.
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 100px 100px 110px 28px',
                padding: '10px 16px',
                background: 'var(--paper-2)',
                borderBottom: '1px solid var(--rule)',
                gap: 8,
              }}>
                {['Asset', 'Units', 'Invested', 'Current', 'P&L', ''].map(h => (
                  <span key={h} style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {portfolioRows.map(row => {
                const ccy = row.buy_currency === 'USD' ? '$' : '₹'
                const accentColor = ASSET_COLORS[row.asset_type] ?? 'var(--ink-3)'
                return (
                  <div key={row.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 100px 100px 110px 28px',
                    padding: '12px 16px', gap: 8,
                    borderBottom: '1px solid var(--rule)',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                        {row.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                          {row.symbol}
                        </span>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 8,
                          color: accentColor, textTransform: 'uppercase',
                          padding: '1px 4px', border: `1px solid ${accentColor}`,
                          borderRadius: 3,
                        }}>
                          {row.asset_type}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                      {row.units}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                      {ccy}{fmt(row.invested, row.buy_currency === 'USD' ? 0 : 0)}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>
                      {loadingPrices ? '…' : row.currentValue !== null
                        ? `${ccy}${fmt(Math.round(row.currentValue))}`
                        : '—'}
                    </span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                      color: row.pnl === null ? 'var(--ink-4)' : row.pnl >= 0 ? '#22a06b' : '#e03c31',
                    }}>
                      {row.pnl === null ? '—' : (
                        <>
                          {row.pnl >= 0 ? '▲' : '▼'} {Math.abs(row.pnlPct ?? 0).toFixed(1)}%
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => removeHolding(row.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-4)', fontSize: 14, padding: 0,
                        lineHeight: 1, transition: 'color 0.1s',
                      }}
                      title="Remove holding"
                    >
                      ×
                    </button>
                  </div>
                )
              })}

              {/* Total row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 100px 100px 110px 28px',
                padding: '12px 16px', gap: 8,
                background: 'var(--paper-2)',
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                  Total (INR)
                </span>
                <span />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                  ₹{fmt(Math.round(totalInvestedINR))}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  ₹{fmt(Math.round(totalCurrentINR))}
                </span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  color: totalPnLINR >= 0 ? '#22a06b' : '#e03c31',
                }}>
                  {totalPnLINR >= 0 ? '▲' : '▼'} {Math.abs(totalPnLPct).toFixed(1)}%
                </span>
                <span />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Sidebar widgets */}
        <div>
          <LearnCardTeaser card={learnCard} loading={loadingCard} />
          <SentimentMeter niftyPct={niftyPct} />
          <QuickLookup />
        </div>
      </div>

      {/* ── Daily Brief ── */}
      <div style={{
        border: '1px solid var(--rule)', borderRadius: 10, padding: '24px 28px',
        marginBottom: 32,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-4)',
          }}>
            📰 Daily Market Brief
          </div>
          {research?.date && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
              {research.date}
            </span>
          )}
        </div>

        {loadingResearch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 16, background: 'var(--paper-2)', borderRadius: 4, width: '90%' }} />
            <div style={{ height: 16, background: 'var(--paper-2)', borderRadius: 4, width: '75%' }} />
            <div style={{ height: 16, background: 'var(--paper-2)', borderRadius: 4, width: '85%' }} />
            <div style={{ height: 14, background: 'var(--paper-2)', borderRadius: 4, width: '60%', marginTop: 4 }} />
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 8,
              fontStyle: 'italic',
            }}>
              Generating today&apos;s brief… (takes ~15 seconds)
            </div>
          </div>
        )}

        {!loadingResearch && research && (
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.75,
            color: 'var(--ink-2)',
            whiteSpace: 'pre-wrap',
          }}>
            {research.brief}
          </div>
        )}

        {!loadingResearch && !research && (
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-4)' }}>
            Could not load today&apos;s brief. Check back later.
          </div>
        )}
      </div>

      {/* ── SIP Calculator ── */}
      <SIPCalculator />

      {/* ── Finance Mentor Chat ── */}
      <FinanceChatPanel />
    </div>
  )
}

// ── Inline Finance Chat Panel ────────────────────────────────────────────────
// (avoids importing full ChatPanel since we need the 'finance' agent type)

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useMemo, useRef } from 'react'

function FinanceChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat/finance' }),
    [],
  )
  const { messages, sendMessage, status, setMessages } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  function getTextFromMessage(msg: UIMessage): string {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('')
  }

  const color = '#1a6b4a'

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 200,
            width: 52, height: 52, borderRadius: '50%',
            background: color, color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 22,
            boxShadow: '0 4px 20px rgba(0,0,0,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          title="Finance Mentor"
        >
          ₹
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 420, maxWidth: 'calc(100vw - 32px)',
          height: 580, maxHeight: 'calc(100vh - 80px)',
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          boxShadow: '0 8px 48px rgba(0,0,0,0.16)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--paper-2)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color, fontSize: 18 }}>₹</span>
              <div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>
                  Finance Mentor
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                  GPT-4o · knows your portfolio
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', padding: '3px 8px',
                }}>
                  clear
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-4)', fontSize: 20, padding: '0 4px', lineHeight: 1,
              }}>
                ×
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {messages.length === 0 && (
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-2)',
                lineHeight: 1.7, padding: '8px 0 16px',
                borderBottom: '1px solid var(--rule)', marginBottom: 16,
              }}>
                I know your portfolio and what you&apos;ve been learning. Ask me anything — what&apos;s an ETF, should you be worried about markets today, how to read a fund factsheet, or where to start investing.
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{
                marginBottom: 16, display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 13px',
                  borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: m.role === 'user' ? color : 'var(--paper-2)',
                  color: m.role === 'user' ? '#fff' : 'var(--ink)',
                  fontSize: 14, lineHeight: 1.6,
                  fontFamily: m.role === 'user' ? 'var(--sans)' : 'var(--serif)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {getTextFromMessage(m)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 3px', background: 'var(--paper-2)' }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--ink-3)', display: 'inline-block',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} style={{
            display: 'flex', gap: 8, padding: '12px 14px',
            borderTop: '1px solid var(--rule)', flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about markets, investing…"
              disabled={isLoading}
              style={{
                flex: 1, fontFamily: 'var(--sans)', fontSize: 13,
                padding: '8px 12px', border: '1px solid var(--rule)',
                borderRadius: 8, background: 'var(--paper-2)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                background: color, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 12,
                opacity: isLoading || !input.trim() ? 0.5 : 1,
              }}
            >
              {isLoading ? '…' : '↑'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
