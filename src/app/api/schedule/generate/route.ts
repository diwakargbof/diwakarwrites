import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const maxDuration = 60

export async function POST(req: Request) {
  const { date } = await req.json()
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })

  const [{ data: meetings }, { data: goals }] = await Promise.all([
    supabase.from('meetings').select('*').eq('date', date).order('start_time'),
    supabase.from('long_term_goals').select('*').eq('active', true).order('priority', { ascending: false }),
  ])

  const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })

  const meetingsStr =
    meetings && meetings.length > 0
      ? meetings
          .map(
            m =>
              `- ${m.title}: ${String(m.start_time).slice(0, 5)} – ${String(m.end_time).slice(0, 5)}` +
              `${m.walkpad_friendly ? ' (walkpad-friendly)' : ''}` +
              `${m.notes ? ` — ${m.notes}` : ''}`
          )
          .join('\n')
      : 'No meetings today.'

  const goalsStr =
    goals && goals.length > 0
      ? goals
          .map(
            g =>
              `- [${g.category}] ${g.goal}` +
              `${g.target_date ? ` (target: ${g.target_date})` : ''}`
          )
          .join('\n')
      : 'No goals defined yet.'

  const prompt = `You are a personal day scheduler for Diwakar. Generate a complete, tight schedule for ${date} (${dayOfWeek}).

HARD RULES:
- Cover 05:30 to 22:00 with ZERO gaps and ZERO overlaps.
- Workout or Run: one 90-min block placed in the morning.
- Day job (WFH): 10:30–18:00 → all blocks in that window use category "work". You may insert 1–2 personal/creative pocket tasks during work (15–20 min each, note them as "pocket").
- Freelancing: 2 hours total, split across two blocks — one before work, one after 18:00.
- Daily rituals: meditation 20 min, journaling 20 min, reading 40 min, writing 45 min.
- Meals: oatmeal + protein shake (morning, 20 min), lunch (30 min ~13:00), protein shake (5 min ~16:00), dinner (30 min ~20:00).
- Evening wind-down: 45–60 min leisure (movie/show) before bed.
- walkpad: true only for walkpad-friendly meetings or light browsing/listening blocks.
- No Instagram. No YouTube.

TODAY'S MEETINGS (insert at exact times, category "meeting", fixed true):
${meetingsStr}

3-MONTH GOALS (make task titles purposeful — reference these):
${goalsStr}

Return ONLY a raw JSON array — no markdown fences, no explanation:
[{"id":"wake","startTime":"05:30","endTime":"05:45","title":"Wake up & freshen up","category":"personal","fixed":true,"walkpad":false,"notes":""},...]

JSON field rules:
- id: unique kebab-case slug
- startTime/endTime: "HH:MM" 24-hour
- category: health | work | creative | personal | meal | leisure | meeting
- fixed: true for meetings and meal blocks
- walkpad: boolean
- notes: one short tip or ""
End at exactly "22:00".`

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
  })

  let blocks
  try {
    const match = text.match(/\[[\s\S]*\]/)
    blocks = JSON.parse(match ? match[0] : text)
  } catch {
    return Response.json({ error: 'Failed to parse schedule from AI response', raw: text }, { status: 500 })
  }

  return Response.json({ blocks })
}
