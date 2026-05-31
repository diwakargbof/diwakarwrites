import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export const maxDuration = 30

// POST { transcript } → { parsed } structured daily-log data (no DB writes here;
// the client confirms then writes). Unmentioned fields come back as null.
export async function POST(req: Request) {
  const { transcript } = (await req.json()) as { transcript?: string }
  if (!transcript || !transcript.trim()) {
    return Response.json({ error: 'transcript required' }, { status: 400 })
  }

  const now = new Date()
  const prompt = `You convert a spoken daily-log into structured JSON. The person rattled off whatever they did today; extract only what they actually mention.

THEIR WORDS:
"""
${transcript.trim()}
"""

Return ONLY a raw JSON object — no markdown fences, no commentary — with this exact shape:
{
  "habits": {
    "wake_time": "HH:MM" 24h or null,
    "sleep_time": "HH:MM" 24h or null,
    "sleep_hours": number or null,
    "steps": integer or null,
    "water_ml": integer or null,
    "weight_kg": number or null,
    "mood": integer 1-5 or null,
    "meditation_min": integer or null,
    "pages_read": integer or null,
    "pages_written": integer or null,
    "face_care": true or null,
    "oral_care": true or null,
    "dream_notes": string or null
  },
  "foods": [
    { "description": "short label", "calories": integer, "protein_g": integer, "fiber_g": integer }
  ],
  "note": "one short human sentence summarizing what you logged"
}

RULES:
- Any field NOT mentioned must be null (for habits) or omitted (foods array can be empty []).
- Times: convert "7am" → "07:00", "11:30pm" → "23:30". Interpret morning/evening sensibly.
- If they give BOTH sleep_time and wake_time but not sleep_hours, compute sleep_hours (handle crossing midnight).
- Liters → ml (2L → 2000). "a glass" ≈ 250ml, "a bottle" ≈ 750ml.
- "8k steps" → 8000. "10 thousand steps" → 10000.
- mood words → 1=rough, 2=meh, 3=okay, 4=good, 5=great. Map closest.
- "did my skincare / washed my face" → face_care true. "brushed / flossed" → oral_care true.
- meditation/reading/writing only if explicitly mentioned.
- For each food/meal mentioned, add an entry and ESTIMATE realistic calories/protein/fiber (Indian portions if context suggests). Keep descriptions short (e.g. "3 eggs + oats").
- Weight in kg (convert from lbs if needed: lbs/2.205).
- dream_notes only if they describe a dream.
- Reference time is ${now.toISOString()}.`

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    temperature: 0.2,
  })

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return Response.json({ error: 'Could not parse', raw: text }, { status: 422 })
  }

  try {
    const parsed = JSON.parse(match[0])
    return Response.json({ parsed })
  } catch {
    return Response.json({ error: 'Invalid JSON from model', raw: text }, { status: 422 })
  }
}
