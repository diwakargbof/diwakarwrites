import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { db as supabase } from '@/lib/db'

export const maxDuration = 30

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const today = new Date().toISOString().split('T')[0]
  const from7 = new Date(); from7.setDate(from7.getDate() - 7)

  const [{ data: todayLog }, { data: todayFood }, { data: recentWorkout }, { data: recentWriting }, { data: reading }] = await Promise.all([
    supabase.from('habit_logs').select('*').eq('date', today).single(),
    supabase.from('food_entries').select('description,calories,protein_g').eq('date', today),
    supabase.from('workout_sessions').select('date,type,exercises,notes').gte('date', from7.toISOString().split('T')[0]).order('date', { ascending: false }).limit(3),
    supabase.from('writings').select('title,section,updated_at').order('updated_at', { ascending: false }).limit(3),
    supabase.from('books').select('title,author,progress_pages,total_pages').eq('status', 'reading').limit(1).single(),
  ])

  const h = todayLog as Record<string, number | string | null> | null
  const moods = ['', 'rough', 'meh', 'okay', 'good', 'great']

  const todayContext = h ? [
    h.sleep_hours && `${h.sleep_hours}h sleep`,
    h.steps       && `${Number(h.steps).toLocaleString()} steps`,
    h.water_ml    && `${(Number(h.water_ml) / 1000).toFixed(1)}L water`,
    h.weight_kg   && `${h.weight_kg}kg`,
    h.mood        && `feeling ${moods[Number(h.mood)]}`,
  ].filter(Boolean).join(', ') : 'Nothing logged yet today'

  const foodToday = (todayFood ?? []).length
    ? (todayFood ?? []).map(f => f.description).join(', ') + ` (${(todayFood ?? []).reduce((s, f) => s + (f.calories || 0), 0)} kcal, ${Math.round((todayFood ?? []).reduce((s, f) => s + (f.protein_g || 0), 0))}g protein)`
    : 'Nothing logged yet'

  const workoutContext = (recentWorkout ?? []).map(w =>
    `${w.date}: ${w.type}${w.notes ? ` — ${w.notes}` : ''}`
  ).join('\n') || 'No recent workouts'

  const writingContext = (recentWriting ?? []).map(w =>
    `"${w.title}" (${w.section}) — last edited ${w.updated_at?.split('T')[0]}`
  ).join('\n') || 'No recent writing'

  const readingContext = reading
    ? `"${reading.title}" by ${reading.author}${reading.total_pages ? ` — p.${reading.progress_pages || 0}/${reading.total_pages} (${Math.round(((reading.progress_pages || 0) / reading.total_pages) * 100)}%)` : ''}`
    : 'Nothing currently reading'

  const system = `You are Diwakar's daily life coach — across fitness, writing, chess, and everything he's tracking. You see his whole picture, not just one slice. Today is ${today}.

TODAY SO FAR:
- Habits: ${todayContext}
- Food: ${foodToday}

RECENT WORKOUTS:
${workoutContext}

RECENT WRITING:
${writingContext}

CURRENTLY READING: ${readingContext}

Your job: help him reflect on his day, spot patterns across areas, suggest priorities, and keep him moving. Be warm but direct. Cross-reference his different areas — if his sleep is bad, it might be affecting his writing or lifting. Think holistically.`

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
