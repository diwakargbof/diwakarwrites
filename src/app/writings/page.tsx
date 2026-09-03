import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import WritingHub from './WritingHub'
import PublicWritings from './PublicWritings'

export const dynamic = 'force-dynamic'

export default async function WritingsPage() {
  const admin = await isAdmin()

  // Visitors only ever see rows flagged public. Everything else, including
  // published-but-private drafts and the whole diary, stays on the server.
  const query = db
    .from('writings')
    .select('id, title, content, created_at, section, manuscript_id')
    .order('created_at', { ascending: false })

  const { data } = admin
    ? await query.eq('published', true)
    : await query.eq('is_public', true)

  const writings = data ?? []

  return admin ? <WritingHub writings={writings} /> : <PublicWritings writings={writings} />
}
