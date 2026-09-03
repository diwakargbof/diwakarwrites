import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { OWNER_NAME, visibleToPublic, type RawPost } from './visibility'

export const dynamic = 'force-dynamic'

const NAME_MAX = 40
const MESSAGE_MAX = 2000

export async function GET() {
  const admin = await isAdmin()

  const { data, error } = await db
    .from('board_posts')
    .select('id, name, message, created_at, parent_id, is_owner, visibility')
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const posts = (data ?? []) as RawPost[]
  return NextResponse.json({
    admin,
    posts: admin ? posts : visibleToPublic(posts),
  })
}

export async function POST(req: NextRequest) {
  const admin = await isAdmin()
  const body = await req.json().catch(() => null)

  if (!body || typeof body.message !== 'string') {
    return NextResponse.json({ message: 'message is required' }, { status: 400 })
  }

  const message = body.message.trim().slice(0, MESSAGE_MAX)
  if (!message) {
    return NextResponse.json({ message: 'message is required' }, { status: 400 })
  }

  // The owner flag is decided here, never taken from the client — otherwise
  // anyone could post as Diwakar just by typing the name.
  const name = admin
    ? OWNER_NAME
    : String(body.name ?? '').trim().slice(0, NAME_MAX)

  if (!name) {
    return NextResponse.json({ message: 'name is required' }, { status: 400 })
  }

  const parentId = typeof body.parent_id === 'string' && body.parent_id ? body.parent_id : null

  if (parentId) {
    // A visitor may only reply under something they can actually see.
    const { data: parent } = await db
      .from('board_posts')
      .select('id, name, message, created_at, parent_id, is_owner, visibility')
      .eq('id', parentId)
      .maybeSingle()

    if (!parent) {
      return NextResponse.json({ message: 'no such post' }, { status: 404 })
    }
    if (!admin) {
      const { data: all } = await db
        .from('board_posts')
        .select('id, name, message, created_at, parent_id, is_owner, visibility')
        .limit(1000)
      const reachable = visibleToPublic((all ?? []) as RawPost[]).some(p => p.id === parentId)
      if (!reachable) {
        return NextResponse.json({ message: 'no such post' }, { status: 404 })
      }
    }
  }

  // Visitors are always public. The owner's notes are private by default —
  // he can flip a single post public when he wants it seen.
  const visibility = admin && body.visibility === 'public' ? 'public' : admin ? 'private' : 'public'

  const { data, error } = await db
    .from('board_posts')
    .insert({ name, message, parent_id: parentId, is_owner: admin, visibility })
    .select('id, name, message, created_at, parent_id, is_owner, visibility')
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data }, { status: 201 })
}
