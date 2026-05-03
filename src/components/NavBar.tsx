'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/',         label: 'home' },
  { href: '/habits',   label: 'habits' },
  { href: '/writings', label: 'writing' },
  { href: '/library',  label: 'library' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [date, setDate] = useState('')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDate(new Date().toDateString().toLowerCase())
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      document.documentElement.dataset.theme = 'dark'
      setDark(true)
    }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : ''
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        <Link href="/" className="brand">
          <div className="brand-glyph" />
          <span className="brand-name">diwakar</span>
          <span className="brand-sub">// notebook</span>
        </Link>

        <div className="nav-links">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-meta">
          {date && <span suppressHydrationWarning>{date}</span>}
          <button
            onClick={toggleDark}
            title="Toggle dark mode"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', fontSize: 14, padding: '2px 4px',
              lineHeight: 1, transition: 'color 0.12s',
            }}
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </nav>
  )
}
