import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const isAuthenticated = request.cookies.get('admin_session')?.value === 'true'

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/write', '/write/:path*'],
}
