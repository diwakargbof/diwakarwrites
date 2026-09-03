import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { db as supabase } from '@/lib/db'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const today = new Date().toISOString().split('T')[0]
  const from14 = new Date(); from14.setDate(from14.getDate() - 14)

  const [{ data: writings }, { data: reading }, { data: recentLogs }, { data: manuscripts }] = await Promise.all([
    supabase.from('writings').select('title,section,updated_at').order('updated_at', { ascending: false }).limit(6),
    supabase.from('books').select('title,author').eq('status', 'reading').limit(1).single(),
    supabase.from('habit_logs')
      .select('date,mood,content_created')
      .gte('date', from14.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase.from('manuscripts').select('title,genre,description').order('created_at', { ascending: false }).limit(3),
  ])

  const writingContext = (writings ?? []).map(w => `"${w.title}" (${w.section})`).join(', ') || 'none'
  const readingContext = reading ? `"${reading.title}" by ${reading.author}` : 'nothing currently'
  const contentDaysCount = (recentLogs ?? []).filter(l => l.content_created).length
  const manuscriptContext = (manuscripts ?? []).map(m => `"${m.title}"${m.genre ? ` [${m.genre}]` : ''}${m.description ? ` — ${m.description}` : ''}`).join('\n') || 'none'

  const system = `You are Diwakar's content creation partner. Today is ${today}.

WHAT HE'S BEEN WORKING ON:
- Writing: ${writingContext}
- Books: ${manuscriptContext || 'none'}
- Reading: ${readingContext}
- Created content ${contentDaysCount} of the last 14 days

YOUR ROLE:
- Brainstorm video ideas, essay angles, social posts, short film concepts, podcast episodes
- Help outline scripts — opening hook, structure, ending
- Suggest thumbnail concepts, headlines, titles that stop the scroll
- Pull from his real life: fitness journey, writing process, chess habit, books he reads, what he's building
- Be specific and actionable. Give him ideas he could shoot or write TODAY, not someday.

THINK IN FORMATS:
- Talking-head / direct-to-camera video
- Voiceover over B-roll or text
- Written thread or essay
- Day-in-the-life / vlog slice
- Short-form (60s) vs long-form (10min+)

PULL FROM HIS LIFE — everything is content:
- The book he's writing (process, struggles, voice)
- His fitness discipline (what he eats, how he trains, consistency)
- His reading (insights from books)
- Chess (the mental game, losing gracefully, pattern recognition)
- The habit of building things

When suggesting ideas, give a title, a one-sentence hook, and a rough angle. Be honest if an idea is weak.`

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
