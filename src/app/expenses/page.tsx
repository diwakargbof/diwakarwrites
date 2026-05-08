'use client'

import { useState, useEffect, useRef } from 'react'
import PasswordGate from '@/components/PasswordGate'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

const CATEGORIES = [
  // groceries
  { key: 'eggs',         label: 'eggs',          color: '#D4A020', note: '' },
  { key: 'chicken',      label: 'chicken',        color: '#A0522D', note: '' },
  { key: 'vegetables',   label: 'vegetables',     color: '#3D8B4E', note: '' },
  { key: 'milk',         label: 'milk',           color: '#4A9BC4', note: '' },
  { key: 'curd',         label: 'curd',           color: '#B8945A', note: '' },
  { key: 'snacks',       label: 'snacks',         color: '#E07820', note: 'what snacks?' },
  // household
  { key: 'rent',         label: 'rent',           color: '#5C4BC4', note: '' },
  { key: 'maid',         label: 'maid',           color: '#3D8B8B', note: '' },
  { key: 'cook',         label: 'cook',           color: '#8B5C3D', note: '' },
  // spending
  { key: 'transport',    label: 'transport',      color: '#2E7BC4', note: 'auto, uber, bus…' },
  { key: 'food_order',   label: 'food order',     color: '#C44A2A', note: 'swiggy, zomato…' },
  { key: 'money_home',   label: 'money to home',  color: '#C44A8B', note: '' },
  // misc
  { key: 'health',       label: 'health',         color: '#22a06b', note: '' },
  { key: 'shopping',     label: 'shopping',       color: '#8B5CF6', note: 'what?' },
  { key: 'other',        label: 'other',          color: '#8A7F7C', note: 'note?' },
] as const

type CatKey = typeof CATEGORIES[number]['key']

const CAT_GROUPS = [
  { label: 'groceries',  keys: ['eggs','chicken','vegetables','milk','curd','snacks'] as CatKey[] },
  { label: 'household',  keys: ['rent','maid','cook'] as CatKey[] },
  { label: 'spending',   keys: ['transport','food_order','money_home'] as CatKey[] },
  { label: 'misc',       keys: ['health','shopping','other'] as CatKey[] },
]

type Expense = {
  id: string
  date: string
  description: string
  amount: number
  category: string
  created_at: string
}

function cat(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
}

export default function ExpensesPage() {
  const [tab, setTab]                     = useState<'today' | 'month'>('today')
  const [expenses, setExpenses]           = useState<Expense[]>([])
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([])
  const [desc, setDesc]                   = useState('')
  const [amount, setAmount]               = useState('')
  const [category, setCategory]           = useState<CatKey>('eggs')
  const [adding, setAdding]               = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadToday(); loadMonth() }, [])

  async function loadToday() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('date', TODAY)
      .order('created_at', { ascending: false })
    if (data) setExpenses(data as Expense[])
  }

  async function loadMonth() {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', monthStart)
      .order('created_at', { ascending: false })
    if (data) setMonthExpenses(data as Expense[])
  }

  async function addExpense() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    setAdding(true)
    const c = cat(category)
    const entry = {
      date: TODAY,
      description: desc.trim() || c.label,
      amount: amt,
      category,
    }
    const { data } = await supabase.from('expenses').insert(entry).select().single()
    if (data) {
      const e = data as Expense
      setExpenses(p => [e, ...p])
      setMonthExpenses(p => [e, ...p])
    }
    setDesc('')
    setAmount('')
    setAdding(false)
    amountRef.current?.focus()
  }

  async function removeExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(p => p.filter(e => e.id !== id))
    setMonthExpenses(p => p.filter(e => e.id !== id))
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const todayTotal  = expenses.reduce((s, e) => s + e.amount, 0)
  const monthTotal  = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const dayOfMonth  = new Date().getDate()
  const avgPerDay   = dayOfMonth > 0 ? monthTotal / dayOfMonth : 0

  const catTotals = CATEGORIES
    .map(c => ({ ...c, total: monthExpenses.filter(e => e.category === c.key).reduce((s, e) => s + e.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, total: monthExpenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0) }
  })
  const maxDay = Math.max(...last30.map(d => d.total), 1)

  const recentDays = Array.from(new Set(monthExpenses.map(e => e.date)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 14)

  const selectedCat = cat(category)

  return (
    <PasswordGate>
      <div className="page-wrap">

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 className="page-h" style={{ marginBottom: 6 }}>Money</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          {(['today', 'month'] as const).map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ══════════════════════════════════════════ TODAY ══ */}
        {tab === 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Day total */}
            <div className="card">
              <span className="mono-label" style={{ marginBottom: 4 }}>TODAY&apos;S SPENDING</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-3)' }}>₹</span>
                <span className="num">{todayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              {expenses.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIES.filter(c => expenses.some(e => e.category === c.key)).map(c => {
                    const t = expenses.filter(e => e.category === c.key).reduce((s, e) => s + e.amount, 0)
                    return (
                      <span key={c.key} style={{
                        fontFamily: 'var(--mono)', fontSize: 11,
                        padding: '2px 8px', borderRadius: 20,
                        background: `${c.color}18`, color: c.color,
                        border: `1px solid ${c.color}40`,
                      }}>
                        {c.label} ₹{t.toLocaleString('en-IN')}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Log expense */}
            <div className="card">
              <span className="mono-label">LOG EXPENSE</span>

              {/* Grouped category picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {CAT_GROUPS.map(g => (
                  <div key={g.label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', width: 60, flexShrink: 0 }}>
                      {g.label}
                    </span>
                    {g.keys.map(k => {
                      const c = cat(k)
                      const on = category === k
                      return (
                        <button
                          key={k}
                          onClick={() => setCategory(k)}
                          className="pill"
                          style={on ? { background: c.color, color: '#fff', borderColor: c.color } : {}}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Amount + optional note + add */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex', alignItems: 'stretch', flex: '0 0 auto',
                  border: '1px solid var(--rule)', borderRadius: 'var(--r)', overflow: 'hidden',
                }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-3)',
                    padding: '0 8px', background: 'var(--paper-2)',
                    display: 'flex', alignItems: 'center', borderRight: '1px solid var(--rule)',
                  }}>₹</span>
                  <input
                    ref={amountRef}
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExpense()}
                    placeholder="amount"
                    style={{
                      width: 100, fontFamily: 'var(--mono)', fontSize: 14,
                      padding: '11px 10px', border: 'none',
                      background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none',
                    }}
                  />
                </div>
                <input
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExpense()}
                  placeholder={selectedCat.note || 'note (optional)'}
                  className="quick-input"
                  style={{ flex: 1, minWidth: 120 }}
                />
                <button
                  onClick={addExpense}
                  disabled={adding || !amount}
                  className="btn btn-primary"
                >
                  {adding ? '…' : 'add'}
                </button>
              </div>
            </div>

            {/* Entry list */}
            <div className="card">
              <span className="mono-label">
                {expenses.length === 0 ? 'NO ENTRIES YET' : `${expenses.length} ENTR${expenses.length === 1 ? 'Y' : 'IES'} TODAY`}
              </span>
              {expenses.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>nothing logged yet.</p>
              ) : (
                <>
                  {expenses.map(e => {
                    const c = cat(e.category)
                    return (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 0', borderBottom: '1px solid var(--rule)',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.description}
                          </div>
                          {e.description !== c.label && (
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{c.label}</div>
                          )}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, flexShrink: 0 }}>
                          ₹{e.amount.toLocaleString('en-IN')}
                        </div>
                        <button
                          onClick={() => removeExpense(e.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                        >×</button>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
                      total &nbsp;₹{todayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════ MONTH ══ */}
        {tab === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="card">
                <span className="mono-label">THIS MONTH</span>
                <div className="num">
                  ₹{(monthTotal / 1000).toFixed(1)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>k</span>
                </div>
                <div className="num-target">{monthExpenses.length} entries</div>
              </div>
              <div className="card">
                <span className="mono-label">DAILY AVG</span>
                <div className="num num-sm">₹{Math.round(avgPerDay).toLocaleString('en-IN')}</div>
                <div className="num-target">over {dayOfMonth} day{dayOfMonth !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Category breakdown */}
            {catTotals.length > 0 && (
              <div className="card">
                <span className="mono-label">BY CATEGORY</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {catTotals.map(c => (
                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, width: 100, flexShrink: 0, color: 'var(--ink-2)' }}>{c.label}</span>
                      <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(c.total / catTotals[0].total) * 100}%`, background: c.color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)', flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
                        ₹{c.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', flexShrink: 0, width: 32, textAlign: 'right' }}>
                        {Math.round((c.total / monthTotal) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 30-day bar chart */}
            <div className="card">
              <span className="mono-label">LAST 30 DAYS</span>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 72, marginBottom: 8 }}>
                {last30.map((d, i) => (
                  <div
                    key={i}
                    title={`${d.date}: ₹${d.total.toLocaleString('en-IN')}`}
                    style={{
                      flex: 1,
                      height: d.total > 0 ? `${Math.max((d.total / maxDay) * 100, 3)}%` : 0,
                      borderRadius: 2,
                      background: d.date === TODAY ? 'var(--accent)' : 'var(--ink-3)',
                      opacity: d.date === TODAY ? 1 : 0.35,
                      transition: 'height 0.3s ease',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                today highlighted in red
              </div>
            </div>

            {/* Per-day list */}
            <div className="card">
              <span className="mono-label">RECENT DAYS</span>
              {recentDays.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>no expenses logged this month.</p>
              ) : (
                recentDays.map(date => {
                  const items    = monthExpenses.filter(e => e.date === date)
                  const dayTotal = items.reduce((s, e) => s + e.amount, 0)
                  return (
                    <div key={date} style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
                          ₹{dayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {items.map(e => {
                          const c = cat(e.category)
                          return (
                            <span key={e.id} style={{
                              fontFamily: 'var(--mono)', fontSize: 11,
                              padding: '2px 8px', borderRadius: 20,
                              background: `${c.color}18`, color: c.color,
                              border: `1px solid ${c.color}40`,
                            }}>
                              {e.description} ₹{e.amount.toLocaleString('en-IN')}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

      </div>
    </PasswordGate>
  )
}
