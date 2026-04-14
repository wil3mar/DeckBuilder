'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAgentLoop, type ToolProgress } from '@/lib/useAgentLoop'

function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const content = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    return (
      <span key={i}>
        {content}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })
}

function ProgressList({ items }: { items: ToolProgress[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1 py-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 text-xs">
          {item.status === 'running' && (
            <span className="text-indigo-400 animate-pulse">⟳</span>
          )}
          {item.status === 'done' && (
            <span className="text-green-400">✓</span>
          )}
          {item.status === 'error' && (
            <span className="text-red-400">✗</span>
          )}
          <span className={
            item.status === 'done' ? 'text-gray-400' :
            item.status === 'error' ? 'text-red-400' :
            'text-white'
          }>
            {item.label}
          </span>
          {item.detail && (
            <span className={item.status === 'error' ? 'text-red-500' : 'text-gray-600'}>
              — {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function BrainstormFlow() {
  const router = useRouter()
  const { send, messages, toolProgress, isRunning, error } = useAgentLoop()
  const [input, setInput] = useState('')
  const [showDashboardBtn, setShowDashboardBtn] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isGenerating = toolProgress.length > 0

  // Synthetic opening message from Claude
  const displayMessages = [
    { role: 'assistant' as const, content: "Let's build your game. What's it about?" },
    ...messages,
  ]

  // Show "Go to dashboard" button 1.5s after generation completes
  useEffect(() => {
    if (isGenerating && !isRunning) {
      const timer = setTimeout(() => setShowDashboardBtn(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [isGenerating, isRunning])

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolProgress])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isRunning) return
    setInput('')
    setShowDashboardBtn(false)
    send(text)
  }, [input, isRunning, send])

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center">
      {/* Header */}
      <div className="w-full px-6 py-4 border-b border-gray-800 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          ✦ Game Builder
        </span>
      </div>

      {/* Chat area */}
      <div className="flex-1 w-full max-w-2xl overflow-y-auto px-6 py-4 space-y-3">
        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-indigo-900/40 text-indigo-100 ml-auto text-right'
                : 'bg-gray-800 text-gray-200'
            }`}
          >
            {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
          </div>
        ))}

        {/* Progress list — shows during generation */}
        {toolProgress.length > 0 && (
          <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">
              Building your game
            </p>
            <ProgressList items={toolProgress} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-xs bg-red-900/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Go to dashboard button */}
        {showDashboardBtn && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Go to dashboard →
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area — hidden during generation */}
      {!isGenerating && (
        <div className="w-full max-w-2xl px-6 pb-6 pt-3 shrink-0 border-t border-gray-800">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Describe your game idea…"
              aria-label="Game idea"
              rows={2}
              disabled={isRunning}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-40"
            />
            <button
              onClick={handleSend}
              disabled={isRunning || !input.trim()}
              aria-label={isRunning ? 'Sending…' : 'Send message'}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg px-4 self-end py-2 text-sm font-medium"
            >
              {isRunning ? '…' : '↑'}
            </button>
          </div>
          <p className="text-xs text-gray-700 mt-1.5">Enter to send · Shift+Enter for newline</p>
        </div>
      )}
    </div>
  )
}
