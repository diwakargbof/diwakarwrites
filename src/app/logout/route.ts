import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.delete(SESSION_COOKIE)
  // Clear the pre-signing cookie too, in case an old one is still around.
  res.cookies.delete('admin_session')
  return res
}
