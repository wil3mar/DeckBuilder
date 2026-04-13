'use client'

import { useEffect, useState, useCallback } from 'react'
import type { CardListItem, Character } from '@/lib/types'

interface Filters {
  stageLabel: string
  bearer: string
  thematic: string
  hasChain: boolean
  missingFields: boolean
}

interface CardListProps {
  selectedCardId: string | null
  onSelectCard: (id: string) => void
  onNewCard: () => void
  refreshKey: number   // increment to force re-fetch (e.g., after save)
}

export default function CardList({
  selectedCardId,
  onSelectCard,
  onNewCard,
  refreshKey,
}: CardListProps) {
  const [cards, setCards] = useState<CardListItem[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [stageLabels, setStageLabels] = useState<string[]>([])
  const [filters, setFilters] = useState<Filters>({
    stageLabel: '', bearer: '', thematic: '',
    hasChain: false, missingFields: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/characters').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([chars, settings]) => {
      setCharacters(chars ?? [])
      setStageLabels(settings?.stage_labels ?? [])
    })
  }, [])

  const fetchCards = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.stageLabel)   params.set('stage_label', filters.stageLabel)
    if (filters.bearer)       params.set('bearer', filters.bearer)
    if (filters.thematic)     params.set('thematic', filters.thematic)
    if (filters.hasChain)     params.set('has_chain', 'true')
    if (filters.missingFields) params.set('missing_fields', 'true')

    setLoading(true)
    fetch(`/api/cards?${params}`)
      .then(r => r.json())
      .then(data => { setCards(data ?? []); setLoading(false) })
  }, [filters, refreshKey])

  useEffect(() => { fetchCards() }, [fetchCards])

  const charName = (charId: string | null) =>
    characters.find(c => c.id === charId)?.display_name ?? '—'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="px-3 py-2 border-b border-gray-800 space-y-1.5">
        {stageLabels.length > 0 && (
          <select
            value={filters.stageLabel}
            onChange={e => setFilters(f => ({ ...f, stageLabel: e.target.value }))}
            className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1"
          >
            <option value="">All stages</option>
            {stageLabels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        <select
          value={filters.bearer}
          onChange={e => setFilters(f => ({ ...f, bearer: e.target.value }))}
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1"
        >
          <option value="">All bearers</option>
          {characters.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
        </select>
        <input
          value={filters.thematic}
          onChange={e => setFilters(f => ({ ...f, thematic: e.target.value }))}
          placeholder="Filter by thematic…"
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 placeholder-gray-600"
        />
        <div className="flex gap-3">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={filters.hasChain}
              onChange={e => setFilters(f => ({ ...f, hasChain: e.target.checked }))} />
            Has chain
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={filters.missingFields}
              onChange={e => setFilters(f => ({ ...f, missingFields: e.target.checked }))} />
            Missing fields
          </label>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-xs text-gray-600 py-6">Loading…</p>
        ) : cards.length === 0 ? (
          <p className="text-center text-xs text-gray-600 py-6">No cards</p>
        ) : (
          cards.map(card => {
            const isChainOnly = card.weight === 0
            const isAutoFire  = card.weight === -1
            return (
              <button
                key={card.id}
                onClick={() => onSelectCard(card.id)}
                className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors ${
                  selectedCardId === card.id
                    ? 'bg-indigo-900/30'
                    : 'hover:bg-gray-800/40'
                } ${isChainOnly ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-1 text-xs">
                  {isChainOnly && <span title="chain-only">⛓</span>}
                  {isAutoFire  && <span title="auto-fire">⚡</span>}
                  <span className="font-mono text-white truncate">{card.slug}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{charName(card.character_id)}</div>
              </button>
            )
          })
        )}
      </div>

      {/* New card */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={onNewCard}
          className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 rounded hover:bg-gray-800 transition-colors"
        >
          + New card
        </button>
      </div>
    </div>
  )
}
