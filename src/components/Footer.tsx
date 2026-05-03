import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <span>made slowly · diwakar · 2026</span>
      <Link href="/write">write →</Link>
    </footer>
  )
}
