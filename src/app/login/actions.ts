'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, sessionCookie, SESSION_COOKIE } from '@/lib/session'

/** Only allow same-site relative destinations — never an absolute URL. */
function safeNext(value: unknown) {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export async function login(_: unknown, formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Wrong password.' }
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, createSessionToken(), sessionCookie)
  redirect(next)
}
