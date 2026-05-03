'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'

type Props = {
  agent: 'fitness' | 'writing' | 'coach'
  label: string
  placeholder?: string
  extraBody?: Record<string, string>
}

const AGENT_META = {
  fitness: { color: '#c4502e', icon: '◎', greeting: 'I have your last 30 days of food, workouts, sleep, steps, and weight. What do you want to know?' },
  writing: { color: '#7a6fc0', icon: '✦', greeting: 'I know your manuscripts, chapters, and writing voice. Ask me anything — story feedback, what to write next, help drafting a scene.' },
  coach:   { color: '#2a7a4a', icon: '◈', greeting: "I'm looking at your whole day — habits, food, writing, reading. What's on your mind?" },
}

function getTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

export default function ChatPanel({ agent, label, placeholder, extraBody }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const meta = AGENT_META[agent]
  const extraBodyRef = useRef(extraBody)
  extraBodyRef.current = extraBody

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/chat/${agent}`, body: () => extraBodyRef.current ?? {} }),
    [agent],
  )

  const { messages, sendMessage, status, setMessages } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, messages.length])

  function clear() {
    setMessages([])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 200,
            width: 48, height: 48, borderRadius: '50%',
            background: meta.color, color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 20, fontFamily: 'var(--serif)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          title={`Chat with ${label}`}
        >
          {meta.icon}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 400, maxWidth: 'calc(100vw - 32px)',
          height: 560, maxHeight: 'calc(100vh - 80px)',
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--paper-2)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: meta.color, fontSize: 16 }}>{meta.icon}</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {hasMessages && (
                <button onClick={clear} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)',
                  padding: '3px 8px', borderRadius: 4,
                  transition: 'color 0.1s',
                }}>clear</button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-4)', fontSize: 18, padding: '0 4px', lineHeight: 1,
              }}>×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* Greeting */}
            {!hasMessages && (
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-2)',
                lineHeight: 1.65, padding: '8px 0 16px',
                borderBottom: '1px solid var(--rule)', marginBottom: 16,
              }}>
                {meta.greeting}
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} style={{
                marginBottom: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%',
                  padding: '10px 13px',
                  borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: m.role === 'user' ? meta.color : 'var(--paper-2)',
                  color: m.role === 'user' ? '#fff' : 'var(--ink)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: m.role === 'user' ? 'var(--sans)' : 'var(--serif)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {getTextFromMessage(m)}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '12px 12px 12px 3px',
                  background: 'var(--paper-2)',
                }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--ink-3)',
                        display: 'inline-block',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{
            display: 'flex', gap: 8, padding: '12px 14px',
            borderTop: '1px solid var(--rule)',
            background: 'var(--paper)',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder || 'Ask anything…'}
              disabled={isLoading}
              style={{
                flex: 1, fontFamily: 'var(--sans)', fontSize: 13,
                padding: '8px 12px', border: '1px solid var(--rule)',
                borderRadius: 8, background: 'var(--paper-2)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
            <button type="submit" disabled={isLoading || !input.trim()} style={{
              background: meta.color, color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 12,
              opacity: isLoading || !input.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}>
              {isLoading ? '…' : '↑'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
