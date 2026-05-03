'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'home' },
  { href: '/habits', label: 'habits' },
  { href: '/writings', label: 'writing' },
  { href: '/library', label: 'library' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [date, setDate] = useState('')

  useEffect(() => {
    setDate(new Date().toDateString().toLowerCase())
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

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
        </div>
      </div>
    </nav>
  )
}
