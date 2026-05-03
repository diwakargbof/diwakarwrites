'use client'

import { useEffect, useState } from 'react'

interface Quote { price: number; prevClose: number }
interface TickerData {
  msft: Quote | null
  btc: Quote | null
  nifty: Quote | null
  goldInr10g: number | null
  usdInr: number | null
  news: { title: string; url: string }[]
}

function pct(q: Quote) {
  return ((q.price - q.prevClose) / q.prevClose) * 100
}

function Ticker({
  label, value, change, sub,
}: {
  label: string
  value: string
  change?: number
  sub?: string
}) {
  const up = change !== undefined && change >= 0
  const clr = change === undefined ? 'var(--ink-3)' : up ? '#22a06b' : '#e03c31'
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {change !== undefined && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: clr, fontWeight: 500 }}>
            {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const [data, setData] = useState<TickerData | null>(null)
  const [ts, setTs] = useState('')
  const [err, setErr] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/ticker')
      if (!res.ok) throw new Error()
      const json: TickerData = await res.json()
      setData(json)
      setErr(false)
      setTs(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setErr(true)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="sidebar">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
        }}>
          live
        </span>
        {ts && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            {ts}
          </span>
        )}
      </div>

      {err && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginBottom: 16 }}>
          — offline —
        </div>
      )}

      {!data && !err && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 34, background: 'var(--paper-2)', borderRadius: 4, opacity: 0.6 }} />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Markets */}
          {data.msft && (
            <Ticker
              label="MSFT"
              value={`$${data.msft.price.toFixed(2)}`}
              change={pct(data.msft)}
            />
          )}
          {data.btc && (
            <Ticker
              label="BTC"
              value={`$${Math.round(data.btc.price).toLocaleString()}`}
              change={pct(data.btc)}
            />
          )}
          {data.nifty && (
            <Ticker
              label="NIFTY 50"
              value={Math.round(data.nifty.price).toLocaleString()}
              change={pct(data.nifty)}
            />
          )}
          {data.goldInr10g != null && (
            <Ticker
              label="GOLD / 10g"
              value={`₹${data.goldInr10g.toLocaleString('en-IN')}`}
            />
          )}
          {data.usdInr != null && (
            <Ticker
              label="USD / INR"
              value={`₹${data.usdInr.toFixed(2)}`}
            />
          )}

          {/* News */}
          {data.news.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14,
              }}>
                world
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.news.map((n, i) => (
                  <a
                    key={i}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--serif)', fontSize: 12, lineHeight: 1.55,
                      color: 'var(--ink-3)', textDecoration: 'none',
                      transition: 'color 0.12s',
                      display: 'block',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-3)')}
                  >
                    {n.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reload button */}
          <button
            onClick={load}
            style={{
              marginTop: 20, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)',
              padding: 0, letterSpacing: '0.08em', textAlign: 'left',
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-4)')}
          >
            ↻ refresh
          </button>
        </>
      )}
    </aside>
  )
}
