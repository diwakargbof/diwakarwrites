'use client'

import { useState, useEffect, useRef } from 'react'
import PasswordGate from '@/components/PasswordGate'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]
const DAILY_BUDGET = 1500

const CATEGORIES = [
  { key: 'food',          label: 'food',          color: '#C4502E' },
  { key: 'transport',     label: 'transport',     color: '#2E7BC4' },
  { key: 'health',        label: 'health',        color: '#22a06b' },
  { key: 'shopping',      label: 'shopping',      color: '#8B5CF6' },
  { key: 'entertainment', label: 'entertain',     color: '#D06B9A' },
  { key: 'other',         label: 'other',         color: '#8A7F7C' },
] as const

type Category = typeof CATEGORIES[number]

type Expense = {
  id: string
  date: string
  description: string
  amount: number
  category: string
  created_at: string
}

function cat(key: string): Category {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[5]
}

export default function ExpensesPage() {
  const [tab, setTab]                     = useState<'today' | 'month'>('today')
  const [expenses, setExpenses]           = useState<Expense[]>([])
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([])
  const [desc, setDesc]                   = useState('')
  const [amount, setAmount]               = useState('')
  const [category, setCategory]           = useState('food')
  const [adding, setAdding]               = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

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
    if (!desc.trim() || isNaN(amt) || amt <= 0) return
    setAdding(true)
    const entry = { date: TODAY, description: desc.trim(), amount: amt, category }
    const { data } = await supabase.from('expenses').insert(entry).select().single()
    if (data) {
      const e = data as Expense
      setExpenses(p => [e, ...p])
      setMonthExpenses(p => [e, ...p])
    }
    setDesc('')
    setAmount('')
    setAdding(false)
    descRef.current?.focus()
  }

  async function removeExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(p => p.filter(e => e.id !== id))
    setMonthExpenses(p => p.filter(e => e.id !== id))
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const todayTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const now           = new Date()
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth    = now.getDate()
  const monthBudget   = DAILY_BUDGET * daysInMonth
  const monthTotal    = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const avgPerDay     = dayOfMonth > 0 ? monthTotal / dayOfMonth : 0

  const catTotals = CATEGORIES
    .map(c => ({ ...c, total: monthExpenses.filter(e => e.category === c.key).reduce((s, e) => s + e.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, total: monthExpenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0) }
  })
  const maxDay = Math.max(...last30.map(d => d.total), DAILY_BUDGET)

  const recentDays = Array.from(new Set(monthExpenses.map(e => e.date)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 14)

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
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="mono-label" style={{ marginBottom: 4 }}>TODAY&apos;S SPENDING</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-3)' }}>₹</span>
                  <span className="num">{todayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="num-target">/ ₹{DAILY_BUDGET.toLocaleString()} daily budget</div>
              </div>
              <div>
                <div className="prog" style={{ width: 140, marginBottom: 6 }}>
                  <div
                    className={`prog-fill${todayTotal > DAILY_BUDGET ? ' over' : ''}`}
                    style={{ width: `${Math.min(todayTotal / DAILY_BUDGET * 100, 100)}%` }}
                  />
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: todayTotal > DAILY_BUDGET ? 'var(--accent)' : 'var(--ink-3)', textAlign: 'right' }}>
                  {Math.round(todayTotal / DAILY_BUDGET * 100)}% of budget
                  {todayTotal > DAILY_BUDGET && ` · ₹${Math.round(todayTotal - DAILY_BUDGET)} over`}
                </div>
              </div>
            </div>

            {/* Log expense */}
            <div className="card">
              <span className="mono-label">LOG EXPENSE</span>
              {/* Category pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className="pill"
                    style={category === c.key ? { background: c.color, color: '#fff', borderColor: c.color } : {}}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
                <input
                  ref={descRef}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExpense()}
                  placeholder="what was this for?"
                  className="quick-input"
                />
                <div style={{
                  display: 'flex', alignItems: 'stretch',
                  border: '1px solid var(--rule)', borderRadius: 'var(--r)', overflow: 'hidden',
                }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-3)',
                    padding: '0 8px', background: 'var(--paper-2)',
                    display: 'flex', alignItems: 'center', borderRight: '1px solid var(--rule)',
                  }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExpense()}
                    placeholder="0"
                    style={{
                      width: 88, fontFamily: 'var(--mono)', fontSize: 14,
                      padding: '0 10px', border: 'none',
                      background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none',
                    }}
                  />
                </div>
                <button
                  onClick={addExpense}
                  disabled={adding || !desc.trim() || !amount}
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
                <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>nothing logged yet — add your first expense above.</p>
              ) : (
                <>
                  <div>
                    {expenses.map(e => (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 0', borderBottom: '1px solid var(--rule)',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat(e.category).color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.description}
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
                            {cat(e.category).label}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, flexShrink: 0 }}>
                          ₹{e.amount.toLocaleString('en-IN')}
                        </div>
                        <button
                          onClick={() => removeExpense(e.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="card">
                <span className="mono-label">THIS MONTH</span>
                <div className="num">
                  ₹{(monthTotal / 1000).toFixed(1)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>k</span>
                </div>
                <div className="num-target">/ ₹{(monthBudget / 1000).toFixed(0)}k budget</div>
                <div className="prog" style={{ marginTop: 10 }}>
                  <div
                    className={`prog-fill${monthTotal > monthBudget ? ' over' : ''}`}
                    style={{ width: `${Math.min(monthTotal / monthBudget * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="card">
                <span className="mono-label">DAILY AVG</span>
                <div className="num num-sm">₹{Math.round(avgPerDay).toLocaleString('en-IN')}</div>
                <div className="num-target">vs ₹{DAILY_BUDGET} target</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: avgPerDay > DAILY_BUDGET ? 'var(--accent)' : '#22a06b' }}>
                  {avgPerDay > DAILY_BUDGET
                    ? `₹${Math.round(avgPerDay - DAILY_BUDGET)} over/day`
                    : `₹${Math.round(DAILY_BUDGET - avgPerDay)} under/day`}
                </div>
              </div>
              <div className="card">
                <span className="mono-label">REMAINING</span>
                <div className="num num-sm" style={{ color: monthBudget - monthTotal < 0 ? 'var(--accent)' : 'inherit' }}>
                  ₹{Math.abs(Math.round(monthBudget - monthTotal)).toLocaleString('en-IN')}
                </div>
                <div className="num-target">{monthBudget - monthTotal >= 0 ? 'left this month' : 'over budget'}</div>
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
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, width: 84, flexShrink: 0, color: 'var(--ink-2)' }}>{c.label}</span>
                      <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(c.total / monthTotal) * 100}%`, background: c.color, borderRadius: 2 }} />
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
                      background: d.total > DAILY_BUDGET
                        ? 'var(--accent)'
                        : d.date === TODAY
                          ? 'var(--ink-2)'
                          : 'var(--ink-3)',
                      opacity: d.date === TODAY ? 1 : 0.38,
                      transition: 'height 0.3s ease',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                red = over ₹{DAILY_BUDGET}/day &nbsp;·&nbsp; today is brighter
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
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
                          color: dayTotal > DAILY_BUDGET ? 'var(--accent)' : 'var(--ink-2)',
                        }}>
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
                              background: `${c.color}18`,
                              color: c.color,
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
