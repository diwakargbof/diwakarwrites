import { NextResponse } from 'next/server'

export interface Quote {
  price: number
  prevClose: number
  change: number
  changePct: number
  currency: string
}

async function yahooQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site/1.0)' },
        signal: AbortSignal.timeout(6000),
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    const price = meta.regularMarketPrice as number
    const prevClose = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number
    const change = price - prevClose
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0
    return { price, prevClose, change, changePct, currency: meta.currency ?? 'INR' }
  } catch {
    return null
  }
}

// GET /api/finance/prices?symbols=RELIANCE.NS,^NSEI,AAPL
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols') ?? ''
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean)

  if (!symbols.length) return NextResponse.json({})

  const results = await Promise.all(
    symbols.map(async (s) => [s, await yahooQuote(s)] as [string, Quote | null]),
  )

  return NextResponse.json(Object.fromEntries(results), {
    headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' },
  })
}
