import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { supabaseUrl, supabaseKey } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Gated Supabase REST proxy.
 *
 * Client components keep using supabase-js; it now points at this route
 * instead of the Supabase host. Every request must carry a valid owner
 * session, so the database is only reachable to Diwakar — visitors get 401.
 */

const FORWARD_REQ_HEADERS = [
  'accept',
  'content-type',
  'prefer',
  'range',
  'range-unit',
  'accept-profile',
  'content-profile',
  'x-client-info',
]

const FORWARD_RES_HEADERS = [
  'content-type',
  'content-range',
  'range-unit',
  'preference-applied',
]

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const { path } = await ctx.params

  // Only the PostgREST surface — no auth/storage/functions passthrough.
  if (path[0] !== 'rest' || path[1] !== 'v1') {
    return NextResponse.json({ message: 'not found' }, { status: 404 })
  }

  const target = new URL(`${supabaseUrl.replace(/\/$/, '')}/${path.join('/')}`)
  target.search = req.nextUrl.search

  const headers = new Headers()
  for (const name of FORWARD_REQ_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('apikey', supabaseKey)
  headers.set('Authorization', `Bearer ${supabaseKey}`)

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
    cache: 'no-store',
  })

  // 204/205/304 must not carry a body — Response throws if given one, and
  // PostgREST answers 204 to every write that does not ask for its row back.
  const bodyless = upstream.status === 204 || upstream.status === 205 || upstream.status === 304
  const res = new NextResponse(bodyless ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
  })
  for (const name of FORWARD_RES_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) res.headers.set(name, value)
  }
  return res
}

export const GET = handle
export const HEAD = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
