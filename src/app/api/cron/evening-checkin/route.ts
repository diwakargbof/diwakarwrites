import { db as supabase } from '@/lib/db'
import { sendPushNotification } from '@/lib/push'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
  if (!subs || subs.length === 0) return Response.json({ ok: true, sent: 0 })

  // Get tomorrow's date in IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000
  const tomorrowIst = new Date(Date.now() + istOffset + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrowIst.toISOString().split('T')[0]
  const dayName = tomorrowIst.toLocaleDateString('en-US', { weekday: 'long' })

  let sent = 0
  for (const row of subs) {
    try {
      const result = await sendPushNotification(row.subscription, {
        title: 'plan tomorrow',
        body: `what's on for ${dayName}? add meetings then generate your day.`,
        url: '/schedule',
        tag: 'evening-checkin',
      })
      if (result.expired) {
        await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', row.subscription.endpoint)
      } else {
        sent++
      }
    } catch (e) {
      console.error('Push failed:', e)
    }
  }

  return Response.json({ ok: true, sent, tomorrow: tomorrowStr })
}
