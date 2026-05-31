'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Cmd = {
  id: string
  label: string
  hint?: string
  icon: string
  group: 'Go to' | 'Actions'
  run: () => void
}

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => { setOpen(false); setQuery(''); setSel(0) }, [])

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.dataset.theme === 'dark'
    document.documentElement.dataset.theme = isDark ? '' : 'dark'
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }, [])

  const commands: Cmd[] = useMemo(() => {
    const go = (href: string) => () => { router.push(href); close() }
    return [
      { id: 'log', label: 'Voice log today', hint: 'speak your day', icon: '🎙', group: 'Actions',
        run: () => { close(); window.dispatchEvent(new Event('open-voice-log')) } },
      { id: 'theme', label: 'Toggle dark mode', icon: '◐', group: 'Actions', run: () => { toggleTheme(); close() } },
      { id: 'home', label: 'Home', icon: '⌂', group: 'Go to', run: go('/') },
      { id: 'habits', label: 'Habits', hint: 'sleep, food, net calories', icon: '◎', group: 'Go to', run: go('/habits') },
      { id: 'workout', label: 'Workout', icon: '⊿', group: 'Go to', run: go('/habits/workout') },
      { id: 'schedule', label: 'Schedule', hint: 'day planner', icon: '◷', group: 'Go to', run: go('/schedule') },
      { id: 'finance', label: 'Finance', hint: 'portfolio, mentor, brief', icon: '₹', group: 'Go to', run: go('/finance') },
      { id: 'learn', label: 'Finance — Learn', icon: '✦', group: 'Go to', run: go('/finance/learn') },
      { id: 'money', label: 'Money', hint: 'expenses', icon: '◇', group: 'Go to', run: go('/expenses') },
      { id: 'writing', label: 'Writing', icon: '✎', group: 'Go to', run: go('/writings') },
      { id: 'write', label: 'Write', hint: 'editor', icon: '✦', group: 'Go to', run: go('/write') },
      { id: 'library', label: 'Library', hint: 'books, films, shows', icon: '▣', group: 'Go to', run: go('/library') },
      { id: 'board', label: 'Board', icon: '◳', group: 'Go to', run: go('/board') },
    ]
  }, [router, close, toggleTheme])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c => (c.label + ' ' + (c.hint ?? '')).toLowerCase().includes(q))
  }, [query, commands])

  // Open on Cmd/Ctrl+K, plus external trigger
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(o => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-command-palette', onOpen) }
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 20) }, [open])
  useEffect(() => { setSel(0) }, [query])

  if (!open) return null

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[sel]?.run() }
  }

  let lastGroup = ''

  return (
    <div className="cmdk-overlay" onClick={close}>
      <div className="cmdk-panel" onClick={e => e.stopPropagation()} onKeyDown={onListKey}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search pages and actions…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">No matches</div>}
          {filtered.map((c, i) => {
            const showGroup = c.group !== lastGroup
            lastGroup = c.group
            return (
              <div key={c.id}>
                {showGroup && <div className="cmdk-group">{c.group}</div>}
                <div
                  className={`cmdk-item${i === sel ? ' sel' : ''}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => c.run()}
                >
                  <span className="cmdk-ico">{c.icon}</span>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  {c.hint && <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{c.hint}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
