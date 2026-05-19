import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const subscription = await req.json()
  if (!subscription?.endpoint) {
    return Response.json({ error: 'invalid subscription' }, { status: 400 })
  }

  // Single-user app — replace all existing subscriptions
  await supabase.from('push_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await supabase.from('push_subscriptions').insert([{ subscription }])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true }, { status: 201 })
}
