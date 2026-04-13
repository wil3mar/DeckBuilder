'use client'

import { useState, useRef, useCallback } from 'react'
import Sidebar from './Sidebar'
import ClaudePanel from './ClaudePanel'
import { ClaudeProvider, useClaudeContext } from '@/lib/claude-context'

function ShellInner({ children }: { children: React.ReactNode }) {
  const { card, cardId, onPromptUpdate, onYesDeltaUpdate, onNoDeltaUpdate, onConditionsUpdate } = useClaudeContext()
  const [claudeWidth, setClaudeWidth] = useState(220)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startWidth: claudeWidth }

    function onMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const dx = resizeRef.current.startX - e.clientX
      setClaudeWidth(Math.max(180, Math.min(600, resizeRef.current.startWidth + dx)))
    }

    function onUp() {
      resizeRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [claudeWidth])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden min-w-0">
        {children}
      </main>
      <div
        className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-600 transition-colors bg-gray-800"
        onMouseDown={handleResizeStart}
      />
      <ClaudePanel
        card={card}
        cardId={cardId}
        width={claudeWidth}
        onPromptUpdate={onPromptUpdate}
        onYesDeltaUpdate={onYesDeltaUpdate}
        onNoDeltaUpdate={onNoDeltaUpdate}
        onConditionsUpdate={onConditionsUpdate}
      />
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ClaudeProvider>
      <ShellInner>{children}</ShellInner>
    </ClaudeProvider>
  )
}
