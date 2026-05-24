import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: holdings }, { data: cards }] = await Promise.all([
    supabase
      .from('finance_holdings')
      .select('symbol, name, units, buy_price, buy_currency, asset_type')
      .order('created_at', { ascending: false }),
    supabase
      .from('finance_cards')
      .select('concept, key_takeaway')
      .not('read_at', 'is', null)
      .order('read_at', { ascending: true }),
  ])

  const holdingsSummary = (holdings ?? []).length
    ? (holdings ?? [])
        .map(h =>
          `• ${h.name} (${h.symbol}): ${h.units} units @ ${h.buy_currency === 'USD' ? '$' : '₹'}${h.buy_price} [${h.asset_type}]`,
        )
        .join('\n')
    : 'No holdings added yet.'

  const learnedSummary = (cards ?? []).length
    ? (cards ?? []).map(c => `• ${c.concept} — ${c.key_takeaway}`).join('\n')
    : 'Has not started the learning cards yet.'

  const system = `You are Diwakar's personal AI Finance Mentor. You speak like a sharp, knowledgeable friend — not a textbook or a bank brochure.

Diwakar is a COMPLETE BEGINNER. He's building his understanding from scratch. Always:
- Explain concepts in plain language
- Use Indian examples first: NSE, BSE, Zerodha, Groww, SBI Mutual Fund, HDFC MF, Nifty 50, Sensex, Reliance, Tata, Infosys
- If using a term for the first time, explain it briefly in parentheses
- Reference his actual portfolio when relevant

His current portfolio:
${holdingsSummary}

What he's learned so far (from his learning cards):
${learnedSummary}

Today: ${today}

Your expertise covers:
- Indian equity markets (NSE, BSE, Nifty 50, Sensex, sectoral indices)
- Mutual funds, ETFs, index funds, debt funds, liquid funds, SIPs
- US markets (S&P 500, NASDAQ, Dow Jones, US stocks)
- Global macro: Fed rates, RBI policy, inflation, GDP, FII/DII flows
- Currencies: USD/INR, EUR, JPY — and how forex affects Indian markets
- Gold, commodities, Bitcoin basics
- Portfolio construction, asset allocation, risk management
- Valuation basics: P/E ratio, P/B ratio, what "undervalued" means
- How to read a fund factsheet, annual report, balance sheet (simplified)

Personality: Direct. Warm. Intellectually honest. You don't sugarcoat risk, but you don't create panic either. You believe in long-term compounding and disciplined investing. You'll call out hype (crypto bubbles, hot stock tips) while explaining why.

Format: Short, punchy answers. Use bullet points only when listing multiple items. If someone asks a complex question, break it into 2-3 digestible chunks. Never write essays unless explicitly asked to explain something in depth.`

  const result = streamText({
    model: openai('gpt-4o'),
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
