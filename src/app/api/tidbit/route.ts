import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export const revalidate = 86400 // regenerate once per day

const CATEGORIES = [
  'science', 'literature', 'philosophy', 'history',
  'cinema', 'mathematics', 'nature', 'language', 'art',
]

// Seed the category with the day-of-year so it feels intentional
function todayCategory() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const day = Math.floor(diff / 86400000)
  return CATEGORIES[day % CATEGORIES.length]
}

const SYSTEM = `You are a thoughtful curator of interesting knowledge.
Your job is to surface one genuinely remarkable thing worth knowing — the kind of thing that makes someone pause, look up from their screen, and feel that the world is stranger or richer than they thought.

Return ONLY a JSON object with these exact fields (no markdown, no wrapping, just raw JSON):
{
  "type": string — one of: science, literature, philosophy, history, cinema, mathematics, nature, language, art,
  "title": string — 4–6 words, evocative, not a full sentence,
  "body": string — 2–4 sentences. Specific, vivid, and worth reading twice. No generalities.,
  "source": string or null — e.g. "Borges, Labyrinths" or "Gödel's incompleteness theorems" or null
}`

export async function GET() {
  const hint = todayCategory()

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM,
      prompt: `Today's category hint: ${hint}. Surprise me — lean into what's genuinely surprising or beautiful about this area. Be specific, not generic.`,
      maxOutputTokens: 350,
    })

    // Strip any accidental markdown code fences
    const clean = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const tidbit = JSON.parse(clean)

    return NextResponse.json(tidbit, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    })
  } catch {
    // Fallback — deterministic by day so it's consistent
    const fallbacks = [
      {
        type: 'mathematics',
        title: 'The infinite hotel paradox',
        body: "Hilbert's Hotel has infinitely many rooms, all occupied. When a new guest arrives, the manager moves guest in room 1 to room 2, room 2 to room 3, and so on — freeing room 1 for the newcomer. Infinity plus one equals infinity, which means infinity isn't really a number at all.",
        source: 'David Hilbert, 1924',
      },
      {
        type: 'nature',
        title: 'Trees talk through fungus',
        body: "Forests are threaded with a web of fungal networks — sometimes called the Wood Wide Web — through which trees exchange carbon, phosphorus, and chemical distress signals. A mother tree can recognize the root tips of its own seedlings and channel extra nutrients specifically to them.",
        source: 'Suzanne Simard, Finding the Mother Tree',
      },
      {
        type: 'literature',
        title: "Chekhov's one true rule",
        body: 'Anton Chekhov wrote in a letter: "If in the first act you have hung a pistol on the wall, then in the following one it should be fired. Otherwise don\'t put it there." The entire grammar of dramatic tension lives in that single sentence.',
        source: 'Anton Chekhov, letter to Aleksandr Semenovich Lazarev, 1889',
      },
    ]

    const start = new Date(new Date().getFullYear(), 0, 0)
    const day = Math.floor((Date.now() - start.getTime()) / 86400000)
    return NextResponse.json(fallbacks[day % fallbacks.length])
  }
}
