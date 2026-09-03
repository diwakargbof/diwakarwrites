import Link from 'next/link'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await isAdmin()

  const { data: w } = await db.from('writings').select('*').eq('id', id).maybeSingle()

  // A piece is readable by outsiders only once it has been marked public.
  // Anything else 404s rather than hinting that it exists.
  if (!w || (!admin && !w.is_public)) notFound()

  const words = wc(w.content)
  const readingMins = Math.max(1, Math.round(words / 200))
  const sectionLabel = w.section === 'book' ? 'THE BOOK' : w.section === 'diary' ? 'DIARY' : 'PIECES'

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 0 72px' }}>
      <Link href="/writings" style={{
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)',
        textDecoration: 'none', display: 'inline-block', marginBottom: 44,
      }}>
        &larr; writings
      </Link>

      {admin && !w.is_public && (
        <div className="pub-private-flag">
          Private &mdash; only you can see this. Flip the &ldquo;public&rdquo; switch in the editor to share it.
        </div>
      )}

      {/* Meta */}
      <div style={{ marginBottom: 40 }}>
        <span className="mono-label" style={{ marginBottom: 14 }}>{sectionLabel}</span>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 600,
          lineHeight: 1.18, letterSpacing: '-0.025em', marginBottom: 18, color: 'var(--ink)',
        }}>
          {w.title}
        </h1>
        <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          <span>{new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span>&middot;</span>
          <span>{words.toLocaleString()} words</span>
          <span>&middot;</span>
          <span>{readingMins} min read</span>
        </div>
      </div>

      <hr className="rule" style={{ marginBottom: 44 }} />

      {/* Content with drop cap on first letter */}
      <style>{`
        .reading-body > p:first-child::first-letter {
          font-family: var(--serif);
          font-size: 4.2em;
          font-weight: 700;
          line-height: 0.8;
          float: left;
          padding-right: 10px;
          padding-top: 6px;
          color: var(--ink);
        }
      `}</style>
      <div
        className="prose-serif reading-body"
        dangerouslySetInnerHTML={{ __html: w.content }}
      />

      {/* Footer */}
      <div style={{
        marginTop: 64, paddingTop: 28, borderTop: '1px solid var(--rule)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
      }}>
        <Link href="/writings" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}>
          &larr; all writings
        </Link>
        <Link href="/board" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}>
          say something on the board &rarr;
        </Link>
      </div>
    </div>
  )
}
