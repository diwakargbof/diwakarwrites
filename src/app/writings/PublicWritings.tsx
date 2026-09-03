import Link from 'next/link'

type W = {
  id: string
  title: string
  content: string
  created_at: string
  section: string
}

function words(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

function excerpt(html: string, n = 190) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > n ? text.slice(0, n).trimEnd() + '...' : text
}

const SECTION_LABEL: Record<string, string> = {
  diary: 'diary',
  book: 'the book',
  pieces: 'essay',
}

/** The reading room. One column, newest first, grouped by year. */
export default function PublicWritings({ writings }: { writings: W[] }) {
  const byYear = new Map<string, W[]>()
  for (const w of writings) {
    const year = new Date(w.created_at).getFullYear().toString()
    const bucket = byYear.get(year)
    if (bucket) bucket.push(w)
    else byYear.set(year, [w])
  }

  const total = writings.reduce((sum, w) => sum + words(w.content), 0)

  return (
    <>
      <section className="pub-hero" style={{ paddingBottom: 8 }}>
        <p className="pub-eyebrow">Selected</p>
        <h1 className="pub-h1" style={{ fontSize: 'clamp(32px, 5vw, 46px)' }}>Writing</h1>
        <p className="pub-lede">
          {writings.length === 0
            ? 'Nothing published here yet.'
            : `${writings.length} ${writings.length === 1 ? 'piece' : 'pieces'} - ${total.toLocaleString()} words. Everything else is still private.`}
        </p>
      </section>

      <hr className="pub-rule" />

      {[...byYear.entries()].map(([year, items]) => (
        <section key={year} className="pub-year">
          <h2 className="pub-year-label">{year}</h2>
          <ul className="pub-list">
            {items.map(w => (
              <li key={w.id}>
                <Link href={`/writings/${w.id}`} className="pub-item">
                  <span className="pub-item-date">
                    {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="pub-item-body">
                    <span className="pub-item-title">{w.title || 'Untitled'}</span>
                    <span className="pub-item-excerpt">{excerpt(w.content)}</span>
                    <span className="pub-item-meta">
                      {SECTION_LABEL[w.section] ?? 'essay'} &middot; {words(w.content).toLocaleString()} words
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {writings.length === 0 && (
        <p className="pub-empty">
          Check back later, or leave a note on the <Link href="/board" className="pub-inline-link">board</Link>.
        </p>
      )}
    </>
  )
}
