export const OWNER_NAME = 'Diwakar'

export type RawPost = {
  id: string
  name: string
  message: string
  created_at: string
  parent_id: string | null
  is_owner: boolean
  visibility: 'public' | 'private'
}

/**
 * What an outsider is allowed to see.
 *
 * Private posts are dropped along with everything hanging off them — a reply
 * with its question removed reads as nonsense, and the quoted context would
 * leak the hidden note anyway.
 */
export function visibleToPublic(posts: RawPost[]): RawPost[] {
  const children = new Map<string | null, RawPost[]>()
  for (const post of posts) {
    const key = post.parent_id
    const bucket = children.get(key)
    if (bucket) bucket.push(post)
    else children.set(key, [post])
  }

  const kept: RawPost[] = []
  const walk = (parentId: string | null) => {
    for (const post of children.get(parentId) ?? []) {
      if (post.visibility === 'private') continue
      kept.push(post)
      walk(post.id)
    }
  }
  walk(null)

  // Orphans: a reply whose parent row is missing entirely.
  const ids = new Set(posts.map(p => p.id))
  for (const post of posts) {
    if (post.parent_id && !ids.has(post.parent_id) && post.visibility !== 'private') {
      kept.push({ ...post, parent_id: null })
    }
  }

  return kept
}
