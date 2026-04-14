'use client'

import { useEffect, useState, useRef } from 'react'
import { useAgentLoop, type ToolProgress } from '@/lib/useAgentLoop'
import type { Card, ObservationItem, ICondition, ClaudeRequest, ClaudeResponse } from '@/lib/types'

interface ClaudePanelProps {
  card: Card | null
  cardId: string | null
  width: number
  onPromptUpdate: (text: string) => void
  onYesDeltaUpdate: (deltas: Record<string, number>) => void
  onNoDeltaUpdate: (deltas: Record<string, number>) => void
  onConditionsUpdate: (conditions: ICondition[]) => void
}

type BusyKey = string

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

async function callClaude(req: ClaudeRequest): Promise<ClaudeResponse> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Claude call failed')
  }
  return res.json()
}

function CompactProgress({ items }: { items: ToolProgress[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-0.5 px-2 py-1.5 bg-gray-900 rounded border border-gray-700 my-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
          <span className={
            item.status === 'running' ? 'text-indigo-400' :
            item.status === 'done' ? 'text-green-400' : 'text-red-400'
          }>
            {item.status === 'running' ? '⟳' : item.status === 'done' ? '✓' : '✗'}
          </span>
          <span className={item.status === 'error' ? 'text-red-400' : 'text-gray-400'}>
            {item.label}{item.detail ? ` — ${item.detail}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ClaudePanel({
  card,
  cardId,
  width,
  onPromptUpdate,
  onYesDeltaUpdate,
  onNoDeltaUpdate,
  onConditionsUpdate,
}: ClaudePanelProps) {
  const [observations, setObservations] = useState<ObservationItem[]>([])
  const [obsLoading, setObsLoading] = useState(false)
  const [busy, setBusy] = useState<BusyKey | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { send, messages: chatMessages, toolProgress, isRunning: chatRunning, error: chatError, reset: resetChat } = useAgentLoop()

  // Clear chat when card changes
  useEffect(() => {
    resetChat()
    setChatInput('')
  }, [cardId, resetChat])

  // Auto-load observations when card ID changes
  useEffect(() => {
    if (!card) { setObservations([]); return }
    setObsLoading(true)
    setActionError(null)
    callClaude({ action: 'observations', card })
      .then(res => {
        if (res.action === 'observations') setObservations(res.items)
      })
      .catch(err => setActionError(err.message))
      .finally(() => setObsLoading(false))
  }, [cardId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runAction(action: ClaudeRequest['action'], side?: 'yes' | 'no') {
    if (!card) return
    const key = side ? `${action}_${side}` : action
    setBusy(key)
    setActionError(null)
    try {
      const res = await callClaude({ action, card, side })
      if (
        res.action === 'write_prompt' || res.action === 'sharpen_tone' ||
        res.action === 'make_funnier' || res.action === 'shorter'
      ) {
        onPromptUpdate(res.text)
      } else if (res.action === 'suggest_deltas') {
        if (side === 'no') onNoDeltaUpdate(res.deltas)
        else onYesDeltaUpdate(res.deltas)
      } else if (res.action === 'suggest_conditions') {
        onConditionsUpdate(res.conditions)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Claude error')
    } finally {
      setBusy(null)
    }
  }

  function handleSendChat() {
    const text = chatInput.trim()
    if (!text || chatRunning) return
    setChatInput('')
    send(text)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function ActionBtn({
    label,
    action,
    side,
  }: {
    label: string
    action: ClaudeRequest['action']
    side?: 'yes' | 'no'
  }) {
    const key = side ? `${action}_${side}` : action
    const isRunning = busy === key
    return (
      <button
        onClick={() => runAction(action, side)}
        disabled={!!busy || !card || chatRunning}
        className="text-left text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? '…' : label}
      </button>
    )
  }

  const isBusy = !!busy || chatRunning

  return (
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col text-xs overflow-hidden" style={{ width, minWidth: width, flexShrink: 0 }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="font-semibold text-indigo-400">✦ Claude</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-gray-800">

        {/* Observations */}
        <div className="px-3 py-2">
          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mb-1.5">
            Observations{obsLoading && <span className="text-gray-600 normal-case font-normal"> loading…</span>}
          </div>
          {observations.length === 0 && !obsLoading ? (
            <p className="text-gray-700 italic">{card ? 'No issues.' : 'Select a card.'}</p>
          ) : (
            <div className="space-y-1">
              {observations.map((obs, i) => (
                <div
                  key={i}
                  className={`rounded px-2 py-1 leading-snug ${
                    obs.severity === 'warn'
                      ? 'bg-yellow-900/30 text-yellow-300'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {obs.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smart buttons */}
        <div className="px-3 py-2">
          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mb-1.5">
            Prompt
          </div>
          <div className="flex flex-col gap-1.5">
            <ActionBtn label="✦ Write prompt"   action="write_prompt" />
            <ActionBtn label="✦ Sharpen tone"   action="sharpen_tone" />
            <ActionBtn label="✦ Make funnier"   action="make_funnier" />
            <ActionBtn label="✦ Shorter"        action="shorter" />
          </div>

          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mt-3 mb-1.5">
            Deltas
          </div>
          <div className="flex flex-col gap-1.5">
            <ActionBtn label="✦ Suggest YES deltas" action="suggest_deltas" side="yes" />
            <ActionBtn label="✦ Suggest NO deltas"  action="suggest_deltas" side="no" />
          </div>

          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mt-3 mb-1.5">
            Conditions
          </div>
          <div className="flex flex-col gap-1.5">
            <ActionBtn label="✦ Suggest conditions" action="suggest_conditions" />
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col">
          <button
            onClick={() => setChatOpen(o => !o)}
            className="px-3 py-2 text-left text-gray-500 hover:text-gray-300 flex items-center justify-between"
          >
            <span className="uppercase tracking-widest text-[10px] font-semibold">Chat</span>
            <span className="text-gray-600">{chatOpen ? '▲' : '▼'}</span>
          </button>

          {chatOpen && (
            <div className="flex flex-col px-3 pb-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2">
                {chatMessages.length === 0 && toolProgress.length === 0 && (
                  <p className="text-gray-700 italic">Ask Claude anything…</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded px-2 py-1 leading-snug ${
                      msg.role === 'user'
                        ? 'bg-indigo-900/30 text-indigo-200 ml-4'
                        : 'bg-gray-800 text-gray-300 mr-4'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                ))}
                {/* Inline tool progress during chat */}
                <CompactProgress items={toolProgress} />
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-1">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() }
                  }}
                  placeholder="Ask Claude…"
                  disabled={isBusy}
                  className="flex-1 bg-gray-800 text-white rounded px-2 py-1 placeholder-gray-600 focus:outline-none disabled:opacity-40 text-xs"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isBusy || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded px-2 py-1"
                >
                  {chatRunning ? '…' : '↑'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {(actionError || chatError) && (
          <div className="px-3 py-2 text-red-400 bg-red-900/20 shrink-0 leading-snug">
            {actionError || chatError}
          </div>
        )}
      </div>
    </div>
  )
}
