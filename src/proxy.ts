import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

/**
 * Route gate.
 *
 * Only the public surface — the landing page, the board, and writing marked
 * public — is reachable without an owner session. Everything else (habits,
 * schedule, finance, money, library, the writing desk, and every private API)
 * redirects to /login.
 *
 * Pages still check `isAdmin()` themselves; this is the outer fence, not the
 * only one.
 */

/** Paths served to everyone. Entries match the path itself and anything below it. */
const PUBLIC_PATHS = [
  '/',
  '/board',
  '/writings',
  '/login',
  '/logout',
  '/api/auth',
  '/api/board',
  '/api/cron', // self-authenticated with CRON_SECRET
]

/** Anything with a file extension: robots.txt, sw.js, icons, images. */
const STATIC_FILE = /\.[a-zA-Z0-9]+$/

function isPublic(pathname: string) {
  if (STATIC_FILE.test(pathname)) return true
  return PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p + '/')))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const login = request.nextUrl.clone()
  login.pathname = '/login'
  login.search = ''
  login.searchParams.set('next', pathname)
  return NextResponse.redirect(login)
}

export const config = {
  // Everything except Next's own internals; static files are let through
  // by isPublic() above.
  matcher: ['/((?!_next).*)'],
}
