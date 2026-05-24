import { NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// GET — return current unread card (or null if none)
export async function GET() {
  const { data: card } = await supabase
    .from('finance_cards')
    .select('*')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ card: card ?? null })
}

// POST — mark card as read + generate next card
export async function POST(req: Request) {
  const body = await req.json() as { cardId?: string }
  const { cardId } = body

  // Mark as read if an id was provided
  if (cardId) {
    await supabase
      .from('finance_cards')
      .update({ read_at: new Date().toISOString() })
      .eq('id', cardId)
  }

  // Fetch all previously learned concepts
  const { data: history } = await supabase
    .from('finance_cards')
    .select('concept, key_takeaway')
    .not('read_at', 'is', null)
    .order('read_at', { ascending: true })

  const learnedConcepts = (history ?? []).map(c => c.concept)
  const isFirst = learnedConcepts.length === 0

  const prompt = isFirst
    ? `Generate the very first finance lesson for an absolute beginner in India.
The concept MUST be: "What is the Stock Market?"
Explain it as if the student knows nothing — use a simple analogy like a chai stall, a kirana shop, or a local business.

Return ONLY valid JSON (no markdown, no preamble):
{
  "concept": "What is the Stock Market?",
  "content": "…(300-400 words, simple language, use Indian examples: NSE, Zerodha, Tata, Reliance)…",
  "key_takeaway": "…(one memorable sentence)",
  "estimated_minutes": 5
}

In content: use **bold** for key terms, write in short clear paragraphs. Make it feel like a smart friend explaining, not a textbook.`

    : `You are a finance teacher for an absolute beginner in India.

The student has already learned these concepts (in order):
${learnedConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Generate the NEXT concept to teach. Rules:
- It must build naturally on what they've already learned
- It must be something a curious beginner would genuinely wonder about next
- Explain from zero — assume they only know what's listed above
- Use Indian examples: NSE, BSE, Zerodha, SBI Mutual Fund, Nifty, Sensex, HDFC, Reliance, etc.

Return ONLY valid JSON (no markdown, no preamble):
{
  "concept": "…(short, punchy title — max 8 words)",
  "content": "…(300-400 words, plain language, Indian examples, short paragraphs)…",
  "key_takeaway": "…(one sentence that will stick in memory)",
  "estimated_minutes": 5
}

Use **bold** for key terms in content.`

  const { text } = await generateText({
    model: openai('gpt-4o'),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.75,
  })

  // Extract JSON from response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'Failed to generate card' }, { status: 500 })
  }

  let parsed: { concept: string; content: string; key_takeaway: string; estimated_minutes: number }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'Failed to parse card JSON' }, { status: 500 })
  }

  const { data: inserted, error } = await supabase
    .from('finance_cards')
    .insert({
      concept: parsed.concept,
      content: parsed.content,
      key_takeaway: parsed.key_takeaway,
      estimated_minutes: parsed.estimated_minutes ?? 5,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ card: inserted })
}
