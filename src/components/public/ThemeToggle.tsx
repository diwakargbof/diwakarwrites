'use client'

import { useEffect, useSyncExternalStore } from 'react'

/** The DOM is the source of truth, so the icon can never drift from the theme. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  )

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.dataset.theme = 'dark'
    }
  }, [])

  function toggle() {
    const next = !dark
    document.documentElement.dataset.theme = next ? 'dark' : ''
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button onClick={toggle} className="pub-theme" title="Toggle dark mode" aria-label="Toggle dark mode">
      {dark ? '☀' : '☾'}
    </button>
  )
}
