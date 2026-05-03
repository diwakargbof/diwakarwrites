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
  science: '⚗', literature: '✦', philosophy: '◈', history: '◎',
  cinema: '▷', mathematics: '∑', nature: '◉', language: '«»', art: '◇',
}

function pct(q: Quote) {
  return ((q.price - q.prevClose) / q.prevClose) * 100
}

export default function MobileDataStrip() {
  const [data, setData] = useState<TickerData | null>(null)
  const [tidbit, setTidbit] = useState<Tidbit | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [tickerRes, tidbitRes] = await Promise.allSettled([
          fetch('/api/ticker').then(r => r.json()),
          fetch('/api/tidbit').then(r => r.json()),
        ])
        if (tickerRes.status === 'fulfilled') setData(tickerRes.value)
        if (tidbitRes.status === 'fulfilled') setTidbit(tidbitRes.value)
      } catch { /* silent */ }
    }
    load()
    const id = setInterval(() => fetch('/api/ticker').then(r => r.json()).then(setData).catch(() => {}), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const tickers: { label: string; value: string; change?: number }[] = []
  if (data?.msft)        tickers.push({ label: 'MSFT',        value: `$${data.msft.price.toFixed(2)}`,                          change: pct(data.msft) })
  if (data?.btc)         tickers.push({ label: 'BTC',         value: `$${Math.round(data.btc.price).toLocaleString()}`,          change: pct(data.btc) })
  if (data?.nifty)       tickers.push({ label: 'NIFTY',       value: Math.round(data.nifty.price).toLocaleString(),              change: pct(data.nifty) })
  if (data?.goldInr10g)  tickers.push({ label: 'GOLD/10g',    value: `₹${data.goldInr10g.toLocaleString('en-IN')}` })
  if (data?.usdInr)      tickers.push({ label: 'USD/INR',     value: `₹${data.usdInr.toFixed(2)}` })

  return (
    <div className="mobile-strip">
      {/* Scrollable ticker row */}
      <div
        style={{
          overflowX: 'auto', display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 0,
          scrollbarWidth: 'none',
        }}
        // hide webkit scrollbar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ style: { overflowX: 'auto', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } } as any)}
      >
        {tickers.length === 0 && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', padding: '10px 0' }}>
            loading…
          </span>
        )}
        {tickers.map((t, i) => {
          const up = t.change !== undefined && t.change >= 0
          const clr = t.change === undefined ? 'var(--ink-3)' : up ? '#22a06b' : '#e03c31'
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px 9px 0', flexShrink: 0,
              borderRight: i < tickers.length - 1 ? '1px solid var(--rule)' : 'none',
              marginRight: i < tickers.length - 1 ? 14 : 0,
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {t.label}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                {t.value}
              </span>
              {t.change !== undefined && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: clr, fontWeight: 500 }}>
                  {up ? '▲' : '▼'}{Math.abs(t.change).toFixed(2)}%
                </span>
              )}
            </div>
          )
        })}

        {/* Tidbit toggle button at far right */}
        {tidbit && (
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              flexShrink: 0, marginLeft: 'auto', paddingLeft: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)',
              display: 'flex', alignItems: 'center', gap: 4,
              whiteSpace: 'nowrap', transition: 'color 0.12s',
              paddingTop: 9, paddingBottom: 9, paddingRight: 0,
            }}
          >
            <span>{TYPE_ICON[tidbit.type] ?? '◦'}</span>
            <span>{open ? 'close' : 'today'}</span>
            <span style={{ fontSize: 8 }}>{open ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      {/* Tidbit card — expands below */}
      {open && tidbit && (
        <div style={{
          borderTop: '1px solid var(--rule)',
          padding: '16px 16px 18px',
          background: 'var(--paper-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>{TYPE_ICON[tidbit.type] ?? '◦'}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {tidbit.type}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.35 }}>
            {tidbit.title}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            {tidbit.body}
          </div>
          {tidbit.source && (
            <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', fontStyle: 'italic' }}>
              — {tidbit.source}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
