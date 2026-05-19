import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  requireInteraction?: boolean
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<{ expired?: boolean }> {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn('Push notifications not configured — set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT')
    return {}
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return {}
  } catch (err: unknown) {
    const e = err as { statusCode?: number }
    if (e.statusCode === 410 || e.statusCode === 404) return { expired: true }
    throw err
  }
}
