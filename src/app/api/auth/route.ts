import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, sessionCookie, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Password check that also issues the signed owner session. */
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: null }))

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookie)
  return res
}
