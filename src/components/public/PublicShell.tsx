import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

/**
 * Chrome for visitors.
 *
 * Deliberately nothing like the private dashboard: no sidebar tickers, no
 * nav rail of trackers, no voice logger, no sticky to-do. Just a masthead,
 * a column of text, and a way in for the owner.
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pub">
      <header className="pub-head">
        <div className="pub-head-inner">
          <Link href="/" className="pub-brand">
            <span className="pub-brand-name">Diwakar Reddy</span>
            <span className="pub-brand-sub">writing &amp; other public noise</span>
          </Link>

          <nav className="pub-nav">
            <Link href="/writings">writing</Link>
            <Link href="/board">board</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="pub-main">{children}</main>

      <footer className="pub-foot">
        <span>made slowly &middot; Diwakar &middot; 2026</span>
        <Link href="/login" className="pub-foot-link">the private half &rarr;</Link>
      </footer>
    </div>
  )
}
