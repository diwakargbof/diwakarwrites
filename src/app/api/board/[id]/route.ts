import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/** Flip one of the owner's own notes between private and public. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const visibility = body?.visibility === 'public' ? 'public' : 'private'

  const { data, error } = await db
    .from('board_posts')
    .update({ visibility })
    .eq('id', id)
    .select('id, name, message, created_at, parent_id, is_owner, visibility')
    .single()

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

/** Moderation — the owner can remove anything, replies included. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const { error } = await db.from('board_posts').delete().eq('id', id)

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
