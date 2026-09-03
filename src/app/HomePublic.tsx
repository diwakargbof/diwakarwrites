import Link from 'next/link'
import { db } from '@/lib/db'

/** The whole public front page. Nothing here touches habits, money or health. */
export default async function HomePublic() {
  const { data } = await db
    .from('writings')
    .select('id, title, content, created_at, section')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const writings = data ?? []

  return (
    <>
      <section className="pub-hero">
        <p className="pub-eyebrow">Hyderabad &middot; est. 2025</p>
        <h1 className="pub-h1">
          Writing, moving,
          <br />
          <em>paying attention</em>.
        </h1>
        <p className="pub-lede">
          Most of this site is a private notebook &mdash; habits, money, health, half-finished
          drafts. What follows is the part meant for other people: essays and entries I have
          chosen to publish, and a board anyone can write on.
        </p>
      </section>

      <hr className="pub-rule" />

      <section>
        <div className="pub-sec-head">
          <h2 className="pub-h2">Writing</h2>
          <Link href="/writings" className="pub-more">all pieces &rarr;</Link>
        </div>

        {writings.length === 0 ? (
          <p className="pub-empty">Nothing published yet. Check back.</p>
        ) : (
          <ul className="pub-list">
            {writings.map(w => (
              <li key={w.id}>
                <Link href={`/writings/${w.id}`} className="pub-item">
                  <span className="pub-item-date">
                    {new Date(w.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="pub-item-body">
                    <span className="pub-item-title">{w.title || 'Untitled'}</span>
                    <span className="pub-item-excerpt">{excerpt(w.content)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="pub-rule" />

      <section className="pub-cta">
        <h2 className="pub-h2">The board</h2>
        <p className="pub-lede" style={{ marginBottom: 20 }}>
          A wall with no account and no algorithm. Leave a note, argue with a stranger,
          reply to a thread. I read all of it.
        </p>
        <Link href="/board" className="pub-btn">Write something &rarr;</Link>
      </section>
    </>
  )
}

function excerpt(html: string, n = 150) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > n ? text.slice(0, n).trimEnd() + '...' : text
}
