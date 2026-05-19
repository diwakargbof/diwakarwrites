import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return Response.json({ plan: null })

  const { data } = await supabase
    .from('day_plans')
    .select('plan')
    .eq('date', date)
    .maybeSingle()

  return Response.json({ plan: data?.plan ?? null })
}

export async function POST(req: Request) {
  const { date, plan } = await req.json()
  if (!date || !plan) return Response.json({ error: 'date and plan required' }, { status: 400 })

  const { error } = await supabase
    .from('day_plans')
    .upsert([{ date, plan, updated_at: new Date().toISOString() }], { onConflict: 'date' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
