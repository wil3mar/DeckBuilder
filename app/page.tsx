'use client'

import { useState, useCallback, useRef } from 'react'
import CardList from '@/components/CardList'
import CardEditor from '@/components/CardEditor'
import ClaudePanel from '@/components/ClaudePanel'
import type { Card, ICondition } from '@/lib/types'

export default function DeckBuilderPage() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [claudeWidth, setClaudeWidth] = useState(220)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Live form state — CardEditor reports here; ClaudePanel reads from here
  const [liveCard, setLiveCard] = useState<Card | null>(null)

  // Claude result overrides — set by ClaudePanel, consumed by CardEditor
  const [promptOverride, setPromptOverride]       = useState<string | undefined>(undefined)
  const [yesDeltaOverride, setYesDeltaOverride]   = useState<Record<string, number> | undefined>(undefined)
  const [noDeltaOverride, setNoDeltaOverride]     = useState<Record<string, number> | undefined>(undefined)
  const [conditionOverride, setConditionOverride] = useState<ICondition[] | undefined>(undefined)

  const handleSaved = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
    setRefreshKey(k => k + 1)
    // Clear overrides after save
    setPromptOverride(undefined)
    setYesDeltaOverride(undefined)
    setNoDeltaOverride(undefined)
    setConditionOverride(undefined)
  }, [])

  const handleNewCard = useCallback(() => {
    setSelectedCardId(null)
    setLiveCard(null)
    setPromptOverride(undefined)
    setYesDeltaOverride(undefined)
    setNoDeltaOverride(undefined)
    setConditionOverride(undefined)
  }, [])

  // Called by ClaudePanel — pulse the override into CardEditor then clear it
  const handlePromptUpdate = useCallback((text: string) => {
    setPromptOverride(text)
    setTimeout(() => setPromptOverride(undefined), 100)
  }, [])

  const handleYesDeltaUpdate = useCallback((deltas: Record<string, number>) => {
    setYesDeltaOverride(deltas)
    setTimeout(() => setYesDeltaOverride(undefined), 100)
  }, [])

  const handleNoDeltaUpdate = useCallback((deltas: Record<string, number>) => {
    setNoDeltaOverride(deltas)
    setTimeout(() => setNoDeltaOverride(undefined), 100)
  }, [])

  const handleConditionsUpdate = useCallback((conditions: ICondition[]) => {
    setConditionOverride(conditions)
    setTimeout(() => setConditionOverride(undefined), 100)
  }, [])

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
    <div className="flex h-full overflow-hidden">
      {/* Card list panel */}
      <div className="w-[220px] min-w-[220px] border-r border-gray-800 flex flex-col">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Cards</span>
        </div>
        <CardList
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          onNewCard={handleNewCard}
          refreshKey={refreshKey}
        />
      </div>

      {/* Card editor */}
      <div className="flex-1 overflow-y-auto">
        <CardEditor
          cardId={selectedCardId}
          onSaved={handleSaved}
          onFormChange={setLiveCard as (form: any) => void}
          promptOverride={promptOverride}
          yesDeltaOverride={yesDeltaOverride}
          noDeltaOverride={noDeltaOverride}
          conditionOverride={conditionOverride}
        />
      </div>

      {/* Resize handle */}
      <div
        className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-600 transition-colors bg-gray-800"
        onMouseDown={handleResizeStart}
      />

      {/* Claude panel */}
      <ClaudePanel
        card={liveCard}
        cardId={selectedCardId}
        width={claudeWidth}
        onPromptUpdate={handlePromptUpdate}
        onYesDeltaUpdate={handleYesDeltaUpdate}
        onNoDeltaUpdate={handleNoDeltaUpdate}
        onConditionsUpdate={handleConditionsUpdate}
      />
    </div>
  )
}
