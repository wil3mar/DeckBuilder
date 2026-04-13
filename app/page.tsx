'use client'

import { useState, useCallback } from 'react'
import CardList from '@/components/CardList'
import CardEditor from '@/components/CardEditor'
import ClaudePanel from '@/components/ClaudePanel'

export default function DeckBuilderPage() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSaved = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
    setRefreshKey(k => k + 1)   // re-fetches card list + nav counts
  }, [])

  const handleNewCard = useCallback(() => {
    setSelectedCardId(null)
  }, [])

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
        />
      </div>

      {/* Claude panel */}
      <ClaudePanel />
    </div>
  )
}
