import { NextResponse } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export const maxDuration = 60

interface MarketPoint { price: number; pct: string }

async function fetchMarketSnapshot(): Promise<Record<string, MarketPoint | null>> {
  const symbols = ['^NSEI', '^BSESN', '^GSPC', 'GC=F', 'BTC-USD', 'USDINR=X']
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site/1.0)' },
            signal: AbortSignal.timeout(5000),
          },
        )
        if (!res.ok) return [symbol, null]
        const data = await res.json()
        const meta = data?.chart?.result?.[0]?.meta
        if (!meta?.regularMarketPrice) return [symbol, null]
        const price = meta.regularMarketPrice as number
        const prev = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number
        const pct = prev !== 0 ? (((price - prev) / prev) * 100).toFixed(2) : '0.00'
        return [symbol, { price, pct }]
      } catch {
        return [symbol, null]
      }
    }),
  )
  return Object.fromEntries(results) as Record<string, MarketPoint | null>
}

async function fetchETHeadlines(): Promise<string[]> {
  try {
    const res = await fetch('https://economictimes.indiatimes.com/markets/rss.cms', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    // Extract CDATA titles from RSS
    const matches = [...xml.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
    return matches.slice(1, 7).map(m => m[1].trim())
  } catch {
    return []
  }
}

// GET /api/finance/research — returns today's brief (generates if missing)
export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  // Return cached brief if already generated today
  const { data: existing } = await supabase
    .from('finance_research')
    .select('*')
    .eq('date', today)
    .single()

  if (existing) return NextResponse.json(existing)

  // Generate fresh brief
  const [marketData, headlines, { data: holdings }] = await Promise.all([
    fetchMarketSnapshot(),
    fetchETHeadlines(),
    supabase
      .from('finance_holdings')
      .select('symbol, name, units, buy_price, buy_currency, asset_type'),
  ])

  const portfolioStr = (holdings ?? []).length
    ? (holdings ?? [])
        .map(
          h =>
            `• ${h.name} (${h.symbol}) — ${h.units} units @ ${h.buy_currency === 'USD' ? '$' : '₹'}${h.buy_price} [${h.asset_type}]`,
        )
        .join('\n')
    : '(No holdings yet — keep the brief general.)'

  const fmt = (n: number, decimals = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
  const sign = (p: string) => parseFloat(p) >= 0 ? `+${p}` : p

  const nifty  = marketData['^NSEI']
  const sensex = marketData['^BSESN']
  const sp500  = marketData['^GSPC']
  const gold   = marketData['GC=F']
  const btc    = marketData['BTC-USD']
  const fx     = marketData['USDINR=X']

  const lines = [
    nifty  && `Nifty 50:  ${fmt(nifty.price)}  (${sign(nifty.pct)}%)`,
    sensex && `Sensex:    ${fmt(sensex.price)}  (${sign(sensex.pct)}%)`,
    sp500  && `S&P 500:   ${fmt(sp500.price)}   (${sign(sp500.pct)}%)`,
    gold   && `Gold:      $${fmt(gold.price, 0)}/oz  (${sign(gold.pct)}%)`,
    btc    && `Bitcoin:   $${fmt(btc.price, 0)}  (${sign(btc.pct)}%)`,
    fx     && `USD/INR:   ₹${fx.price.toFixed(2)}`,
  ].filter(Boolean).join('\n')

  const headlineStr = headlines.length
    ? headlines.map(h => `• ${h}`).join('\n')
    : '(No headlines fetched today)'

  const { text: brief } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    messages: [{
      role: 'user',
      content: `You are writing a daily market brief for Diwakar, who is a COMPLETE beginner in finance. Assume he knows basic things like "stocks go up and down" but nothing technical.

Today's market data (${today}):
${lines}

Today's top headlines from Economic Times:
${headlineStr}

Diwakar's actual portfolio (reference it when today's moves are relevant to what he owns):
${portfolioStr}

Write a 220-280 word brief that:
1. Opens with what markets did today — use simple, relatable language (e.g. "Indian markets had a good day today...")
2. Picks ONE interesting thing from the data or headlines and explains WHY it happened in plain terms (use an everyday analogy if helpful)
3. If his holdings are affected by today's moves, mention it briefly and concretely (e.g. "your Nifty index fund would have nudged up today") — but never give buy/sell commands
4. Briefly mentions global context (US markets, gold, Bitcoin) and how they connect to India
5. Closes with ONE calm, practical thought for a long-term investor (not dismissive — genuinely useful)

Tone: warm, conversational, like a knowledgeable friend texting you a market update. No bullet points. Short paragraphs. No jargon without explaining it.`,
    }],
    temperature: 0.8,
  })

  // Upsert (in case of race condition)
  const { data: inserted } = await supabase
    .from('finance_research')
    .upsert({ date: today, brief, market_data: marketData }, { onConflict: 'date' })
    .select()
    .single()

  return NextResponse.json(inserted ?? { date: today, brief, market_data: marketData })
}
