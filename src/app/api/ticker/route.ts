import { NextResponse } from 'next/server'

export const revalidate = 300

interface Quote {
  price: number
  prevClose: number
}

async function yahooQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site/1.0)' },
        next: { revalidate: 300 },
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    return {
      price: meta.regularMarketPrice as number,
      prevClose: (meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice) as number,
    }
  } catch {
    return null
  }
}

interface NewsItem {
  title: string
  url: string
}

async function getNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('https://feeds.bbci.co.uk/news/world/rss.xml', {
      next: { revalidate: 900 },
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5)
    return items
      .map(([, body]) => {
        const cdataMatch = body.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)
        const title =
          cdataMatch?.[1] ??
          body.match(/<title>([^<]+)<\/title>/)?.[1] ??
          ''
        const link =
          body.match(/<link>([^<]+)<\/link>/)?.[1] ??
          body.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1] ??
          ''
        return { title: title.trim(), url: link.trim() }
      })
      .filter(n => n.title)
  } catch {
    return []
  }
}

export async function GET() {
  const [msftRes, btcRes, niftyRes, goldRes, fxRes, newsRes] = await Promise.allSettled([
    yahooQuote('MSFT'),
    yahooQuote('BTC-USD'),
    yahooQuote('^NSEI'),
    yahooQuote('GC=F'),
    fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      next: { revalidate: 300 },
    }).then(r => r.json()),
    getNews(),
  ])

  const fxRate: number | null =
    fxRes.status === 'fulfilled' ? (fxRes.value?.rates?.INR ?? null) : null

  const goldQuote = goldRes.status === 'fulfilled' ? goldRes.value : null
  // Gold futures price is USD/troy oz. Convert to INR per 10g.
  // 1 troy oz = 31.1035 g → 10g = 10/31.1035 troy oz
  const goldInr10g =
    goldQuote && fxRate
      ? Math.round((goldQuote.price / 31.1035) * 10 * fxRate)
      : null

  return NextResponse.json({
    msft:      msftRes.status  === 'fulfilled' ? msftRes.value  : null,
    btc:       btcRes.status   === 'fulfilled' ? btcRes.value   : null,
    nifty:     niftyRes.status === 'fulfilled' ? niftyRes.value : null,
    goldInr10g,
    usdInr: fxRate,
    news:      newsRes.status  === 'fulfilled' ? newsRes.value  : [],
    updatedAt: new Date().toISOString(),
  })
}
