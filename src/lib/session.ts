/**
 * Signed admin session token.
 *
 * The old scheme was a plain `admin_session=true` cookie — httpOnly stops JS
 * from writing it, but anyone can hand-craft that cookie with curl or devtools.
 * Tokens here are HMAC-signed with ADMIN_PASSWORD so they cannot be forged.
 *
 * No `next/headers` import — this module is used from proxy.ts too.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'dw_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 60 // 60 days

function sign(payload: string) {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) throw new Error('ADMIN_PASSWORD is not set')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionToken() {
  const payload = `${Date.now()}.${randomBytes(9).toString('base64url')}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token?: string | null): boolean {
  if (!token) return false
  const cut = token.lastIndexOf('.')
  if (cut < 1) return false

  const payload = token.slice(0, cut)
  const given = Buffer.from(token.slice(cut + 1))

  let expected: Buffer
  try {
    expected = Buffer.from(sign(payload))
  } catch {
    return false
  }
  if (given.length !== expected.length) return false
  if (!timingSafeEqual(given, expected)) return false

  const issued = Number(payload.split('.')[0])
  return Number.isFinite(issued) && Date.now() - issued < SESSION_MAX_AGE * 1000
}

export const sessionCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
