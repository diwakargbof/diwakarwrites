import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from './session'

/**
 * True when the request carries a valid owner session.
 * Server-only — call from server components, route handlers and server actions.
 */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  return verifySessionToken(store.get(SESSION_COOKIE)?.value)
}
