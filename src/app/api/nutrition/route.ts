import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function POST(req: Request) {
  const { description } = await req.json()

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Estimate the nutrition for this meal description: "${description}"

Respond ONLY with a JSON object (no markdown, no explanation):
{"calories": <number>, "protein_g": <number>, "fiber_g": <number>}

Rules:
- calories: total kcal (realistic for Indian + common foods)
- protein_g: grams of protein (round to nearest integer)
- fiber_g: grams of dietary fiber (round to nearest integer)
- Account for quantities if mentioned (e.g. "3 eggs" vs "1 egg")
- If amount is ambiguous, use a typical serving size`,
  })

  try {
    const nutrition = JSON.parse(text.trim())
    return Response.json({
      calories: Math.round(nutrition.calories) || 200,
      protein_g: Math.round(nutrition.protein_g) || 5,
      fiber_g: Math.round(nutrition.fiber_g) || 2,
    })
  } catch {
    return Response.json({ calories: 200, protein_g: 5, fiber_g: 2 })
  }
}
