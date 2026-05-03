import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const today = new Date().toISOString().split('T')[0]
  const from30 = new Date(); from30.setDate(from30.getDate() - 30)
  const from30str = from30.toISOString().split('T')[0]

  const [{ data: logs }, { data: food }, { data: workouts }] = await Promise.all([
    supabase.from('habit_logs')
      .select('date,sleep_hours,steps,water_ml,weight_kg,chess_games,chess_wins,mood')
      .gte('date', from30str).order('date', { ascending: false }),
    supabase.from('food_entries')
      .select('date,description,calories,protein_g,fiber_g')
      .gte('date', from30str).order('date', { ascending: false }),
    supabase.from('workout_sessions')
      .select('date,type,exercises,duration_mins,notes')
      .gte('date', from30str).order('date', { ascending: false }),
  ])

  // Format habit logs
  const habitSummary = (logs ?? []).slice(0, 14).map(d => {
    const parts = [`${d.date}:`]
    if (d.sleep_hours) parts.push(`${d.sleep_hours}h sleep`)
    if (d.steps)       parts.push(`${d.steps.toLocaleString()} steps`)
    if (d.water_ml)    parts.push(`${(d.water_ml / 1000).toFixed(1)}L water`)
    if (d.weight_kg)   parts.push(`${d.weight_kg}kg`)
    if (d.chess_games) parts.push(`chess ${d.chess_wins}W/${d.chess_games - d.chess_wins}L`)
    const moods = ['', 'rough', 'meh', 'okay', 'good', 'great']
    if (d.mood)        parts.push(`mood: ${moods[d.mood]}`)
    return parts.join(' | ')
  }).join('\n')

  // Group food by date
  const foodByDate: Record<string, { items: string[]; cal: number; prot: number }> = {}
  ;(food ?? []).forEach(f => {
    if (!foodByDate[f.date]) foodByDate[f.date] = { items: [], cal: 0, prot: 0 }
    foodByDate[f.date].items.push(f.description)
    foodByDate[f.date].cal  += f.calories  || 0
    foodByDate[f.date].prot += f.protein_g || 0
  })
  const foodSummary = Object.entries(foodByDate).slice(0, 10).map(([date, d]) =>
    `${date}: ${d.items.join(', ')} → ${d.cal} kcal, ${Math.round(d.prot)}g protein`
  ).join('\n')

  // Format workouts
  const workoutSummary = (workouts ?? []).slice(0, 10).map(w => {
    const exStr = (w.exercises as { name: string; sets: number; reps: number; weight: number }[] ?? [])
      .map(e => `${e.name} ${e.sets}×${e.reps}${e.weight ? `@${e.weight}kg` : ''}`).join(', ')
    return `${w.date}: ${w.type}${w.duration_mins ? ` (${w.duration_mins}min)` : ''} — ${exStr || 'no exercises logged'}${w.notes ? ` | Notes: ${w.notes}` : ''}`
  }).join('\n')

  // Compute simple trends
  const weights = (logs ?? []).filter(d => d.weight_kg).map(d => d.weight_kg as number)
  const avgSleep = (logs ?? []).length
    ? ((logs ?? []).reduce((s, d) => s + (d.sleep_hours || 0), 0) / (logs ?? []).length).toFixed(1)
    : 'no data'
  const avgSteps = (logs ?? []).length
    ? Math.round((logs ?? []).reduce((s, d) => s + (d.steps || 0), 0) / (logs ?? []).length).toLocaleString()
    : 'no data'
  const avgProtein = Object.values(foodByDate).length
    ? Math.round(Object.values(foodByDate).reduce((s, d) => s + d.prot, 0) / Object.values(foodByDate).length)
    : 'no data'

  const system = `You are Diwakar's personal fitness and health coach. You have access to his last 30 days of real data. Be specific, reference actual numbers, and give actionable advice. Be direct and concise — like a good coach, not a chatbot. Today is ${today}.

TARGETS: sleep 7h | steps 13,000 | water 3.7L | protein 140g | calories 1,900 kcal

30-DAY AVERAGES:
- Sleep: ${avgSleep}h/night
- Steps: ${avgSteps}/day
- Protein: ${avgProtein}g/day
${weights.length >= 2 ? `- Weight trend: ${weights[weights.length - 1]}kg → ${weights[0]}kg (most recent)` : ''}

LAST 14 DAYS — HABITS:
${habitSummary || 'No habit data logged yet.'}

LAST 10 DAYS — FOOD:
${foodSummary || 'No food data logged yet.'}

LAST 10 WORKOUTS:
${workoutSummary || 'No workouts logged yet.'}

When giving advice: reference specific dates/numbers from the data above. If data is missing, say so and ask. Don't be generic.`

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
