'use client'

import { useEffect, useState } from 'react'

interface Quote { price: number; prevClose: number }
interface TickerData {
  msft: Quote | null
  btc: Quote | null
  nifty: Quote | null
  goldInr10g: number | null
  usdInr: number | null
}
interface Tidbit {
  type: string
  title: string
  body: string
  source: string | null
}

const TYPE_ICON: Record<string, string> = {
  science:     '⚗',
  literature:  '✦',
  philosophy:  '◈',
  history:     '◎',
  cinema:      '▷',
  mathematics: '∑',
  nature:      '◉',
  language:    '«»',
  art:         '◇',
}

function pct(q: Quote) {
  return ((q.price - q.prevClose) / q.prevClose) * 100
}

function Ticker({ label, value, change }: { label: string; value: string; change?: number }) {
  const up = change !== undefined && change >= 0
  const clr = change === undefined ? 'var(--ink-3)' : up ? '#22a06b' : '#e03c31'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500,
          color: 'var(--ink)', letterSpacing: '-0.02em',
        }}>
          {value}
        </span>
        {change !== undefined && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: clr, fontWeight: 500 }}>
            {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}

function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  const icon = TYPE_ICON[tidbit.type] ?? '◦'
  return (
    <div style={{
      marginTop: 20,
      paddingTop: 18,
      borderTop: '1px solid var(--rule)',
    }}>
      {/* Category label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 11, color: 'var(--accent)' }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
        }}>
          {tidbit.type}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600,
        color: 'var(--ink)', lineHeight: 1.35, marginBottom: 8,
        letterSpacing: '-0.01em',
      }}>
        {tidbit.title}
      </div>

      {/* Body */}
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 12, lineHeight: 1.65,
        color: 'var(--ink-2)',
      }}>
        {tidbit.body}
      </div>

      {/* Source */}
      {tidbit.source && (
        <div style={{
          marginTop: 10,
          fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
          fontStyle: 'italic',
          letterSpacing: '0.02em',
        }}>
          — {tidbit.source}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const [data, setData] = useState<TickerData | null>(null)
  const [tidbit, setTidbit] = useState<Tidbit | null>(null)
  const [ts, setTs] = useState('')

  useEffect(() => {
    // Fetch market data every 5 min
    async function loadTicker() {
      try {
        const res = await fetch('/api/ticker')
        if (res.ok) {
          setData(await res.json())
          setTs(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        }
      } catch { /* silent */ }
    }

    // Fetch tidbit once — it's cached for 24h server-side
    async function loadTidbit() {
      try {
        const res = await fetch('/api/tidbit')
        if (res.ok) setTidbit(await res.json())
      } catch { /* silent */ }
    }

    loadTicker()
    loadTidbit()
    const id = setInterval(loadTicker, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="sidebar">
      {/* Markets header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 18,
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
        }}>
          markets
        </span>
        {ts && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            {ts}
          </span>
        )}
      </div>

      {/* Skeleton while loading */}
      {!data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: 30, background: 'var(--paper-2)',
              borderRadius: 3, opacity: 0.7,
            }} />
          ))}
        </div>
      )}

      {data && (
        <>
          {data.msft && (
            <Ticker label="MSFT" value={`$${data.msft.price.toFixed(2)}`} change={pct(data.msft)} />
          )}
          {data.btc && (
            <Ticker label="BTC" value={`$${Math.round(data.btc.price).toLocaleString()}`} change={pct(data.btc)} />
          )}
          {data.nifty && (
            <Ticker label="NIFTY 50" value={Math.round(data.nifty.price).toLocaleString()} change={pct(data.nifty)} />
          )}
          {data.goldInr10g != null && (
            <Ticker label="GOLD / 10g" value={`₹${data.goldInr10g.toLocaleString('en-IN')}`} />
          )}
          {data.usdInr != null && (
            <Ticker label="USD / INR" value={`₹${data.usdInr.toFixed(2)}`} />
          )}
        </>
      )}

      {/* Daily tidbit */}
      {tidbit && <TidbitCard tidbit={tidbit} />}

      {!tidbit && (
        <div style={{
          marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--rule)',
          height: 100,
          background: 'linear-gradient(180deg, var(--paper-2) 0%, transparent 100%)',
          borderRadius: 4,
        }} />
      )}
    </aside>
  )
}
