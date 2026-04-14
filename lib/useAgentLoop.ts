'use client'

import { useState, useCallback, useRef } from 'react'
import { TOOL_LABELS, TOOL_ENDPOINTS } from '@/lib/game-builder-tools'
import type { ClaudeResponse } from '@/lib/types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolProgress {
  id: string        // tool_use id — unique per call, even if same tool called twice
  tool: string      // tool name e.g. "create_cards"
  label: string     // human-readable e.g. "Writing cards"
  status: 'running' | 'done' | 'error'
  detail?: string   // "22 records" or error message
}

type AnthropicMessage = { role: 'user' | 'assistant'; content: unknown }

export function useAgentLoop() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [toolProgress, setToolProgress] = useState<ToolProgress[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Internal full Anthropic-format message history for multi-turn context
  const [anthropicHistory, setAnthropicHistory] = useState<AnthropicMessage[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (userText: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsRunning(true)
    setError(null)

    setMessages(prev => [...prev, { role: 'user', content: userText }])

    const nextHistory: AnthropicMessage[] = [
      ...anthropicHistory,
      { role: 'user', content: userText },
    ]
    setAnthropicHistory(nextHistory)

    async function runLoop(history: AnthropicMessage[]) {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', messages: history }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Claude call failed')
      }

      const data: ClaudeResponse = await res.json()

      if (data.action === 'tool_use') {
        // Register all tool calls as "running"
        const newEntries: ToolProgress[] = data.calls.map(call => ({
          id: call.id,
          tool: call.name,
          label: TOOL_LABELS[call.name] ?? call.name,
          status: 'running',
        }))
        setToolProgress(prev => [...prev, ...newEntries])

        // Execute each tool call sequentially
        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []

        for (const call of data.calls) {
          try {
            const endpoint = TOOL_ENDPOINTS[call.name]
            if (!endpoint) throw new Error(`Unknown tool: ${call.name}`)

            const toolRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(call.input),
              signal: controller.signal,
            })

            const result = await toolRes.json()
            if (!toolRes.ok) throw new Error(result.error ?? 'Tool call failed')

            const detail =
              result.created !== undefined ? `${result.created} records`
              : result.ok !== undefined ? (result.ok ? 'No issues' : `${result.errors?.length ?? 0} error(s)`)
              : 'Done'

            setToolProgress(prev =>
              prev.map(p => p.id === call.id ? { ...p, status: 'done', detail } : p)
            )
            toolResults.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: JSON.stringify(result),
            })

            window.dispatchEvent(new Event('game:content-updated'))
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Tool error'
            setToolProgress(prev =>
              prev.map(p => p.id === call.id ? { ...p, status: 'error', detail: msg } : p)
            )
            toolResults.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: `Error: ${msg}`,
            })
          }
        }

        // Append assistant message (with tool_use blocks) + tool results to history
        const nextHistory: AnthropicMessage[] = [
          ...history,
          { role: 'assistant', content: data.assistantContent },
          { role: 'user', content: toolResults },
        ]
        setAnthropicHistory(nextHistory)
        await runLoop(nextHistory)
      } else if (data.action === 'chat') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setAnthropicHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    }

    try {
      await runLoop(nextHistory)
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsRunning(false)
      }
    }
  }, [anthropicHistory])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setToolProgress([])
    setIsRunning(false)
    setError(null)
    setAnthropicHistory([])
  }, [])

  return { send, messages, toolProgress, isRunning, error, reset }
}
