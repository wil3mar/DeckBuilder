'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { Card, ICondition } from '@/lib/types'

interface ClaudeContextValue {
  card: Card | null
  cardId: string | null
  setCardContext: (card: Card | null, cardId: string | null) => void
  promptOverride: string | undefined
  yesDeltaOverride: Record<string, number> | undefined
  noDeltaOverride: Record<string, number> | undefined
  conditionOverride: ICondition[] | undefined
  onPromptUpdate: (text: string) => void
  onYesDeltaUpdate: (deltas: Record<string, number>) => void
  onNoDeltaUpdate: (deltas: Record<string, number>) => void
  onConditionsUpdate: (conditions: ICondition[]) => void
}

const ClaudeContext = createContext<ClaudeContextValue | null>(null)

export function ClaudeProvider({ children }: { children: React.ReactNode }) {
  const [card, setCard] = useState<Card | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [promptOverride, setPromptOverride]       = useState<string | undefined>()
  const [yesDeltaOverride, setYesDeltaOverride]   = useState<Record<string, number> | undefined>()
  const [noDeltaOverride, setNoDeltaOverride]     = useState<Record<string, number> | undefined>()
  const [conditionOverride, setConditionOverride] = useState<ICondition[] | undefined>()

  const setCardContext = useCallback((newCard: Card | null, newCardId: string | null) => {
    setCard(newCard)
    setCardId(newCardId)
  }, [])

  const onPromptUpdate = useCallback((text: string) => {
    setPromptOverride(text)
    setTimeout(() => setPromptOverride(undefined), 100)
  }, [])

  const onYesDeltaUpdate = useCallback((deltas: Record<string, number>) => {
    setYesDeltaOverride(deltas)
    setTimeout(() => setYesDeltaOverride(undefined), 100)
  }, [])

  const onNoDeltaUpdate = useCallback((deltas: Record<string, number>) => {
    setNoDeltaOverride(deltas)
    setTimeout(() => setNoDeltaOverride(undefined), 100)
  }, [])

  const onConditionsUpdate = useCallback((conditions: ICondition[]) => {
    setConditionOverride(conditions)
    setTimeout(() => setConditionOverride(undefined), 100)
  }, [])

  return (
    <ClaudeContext.Provider value={{
      card, cardId, setCardContext,
      promptOverride, yesDeltaOverride, noDeltaOverride, conditionOverride,
      onPromptUpdate, onYesDeltaUpdate, onNoDeltaUpdate, onConditionsUpdate,
    }}>
      {children}
    </ClaudeContext.Provider>
  )
}

export function useClaudeContext() {
  const ctx = useContext(ClaudeContext)
  if (!ctx) throw new Error('useClaudeContext must be used within ClaudeProvider')
  return ctx
}
