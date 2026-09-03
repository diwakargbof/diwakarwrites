import { db as supabase } from '@/lib/db'
import { sendPushNotification } from '@/lib/push'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Current time in IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000
  const nowIst = new Date(Date.now() + istOffset)
  const todayStr = nowIst.toISOString().split('T')[0]
  const nowMins = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes()

  // Window: meetings starting 5–20 min from now (catches one 15-min cron cycle)
  const windowStart = nowMins + 5
  const windowEnd = nowMins + 20

  function minsToTime(m: number) {
    const h = Math.floor(m / 60) % 24
    const min = m % 60
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('date', todayStr)
    .gte('start_time', minsToTime(windowStart))
    .lte('start_time', minsToTime(windowEnd))

  if (!meetings || meetings.length === 0) return Response.json({ ok: true, reminders: 0 })

  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
  if (!subs || subs.length === 0) return Response.json({ ok: true, reminders: 0 })

  let sent = 0
  for (const meeting of meetings) {
    const startStr = String(meeting.start_time).slice(0, 5)
    const [h, m] = startStr.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    const timeLabel = `${h12}:${String(m).padStart(2, '0')} ${period}`

    for (const row of subs) {
      try {
        await sendPushNotification(row.subscription, {
          title: `meeting in ~${Math.round(windowStart - nowMins + 10)} min`,
          body: `${meeting.title} at ${timeLabel}${meeting.walkpad_friendly ? ' — walkpad ok' : ''}`,
          url: '/schedule',
          tag: `meeting-${meeting.id}`,
          requireInteraction: true,
        })
        sent++
      } catch (e) {
        console.error('Meeting reminder push failed:', e)
      }
    }
  }

  return Response.json({ ok: true, reminders: sent })
}
