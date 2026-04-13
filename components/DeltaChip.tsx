'use client'

import { useState } from 'react'
import type { DeltaValue } from '@/lib/types'

interface DeltaChipProps {
  pillarSlug: string
  pillarName: string
  color: string        // hex color from pillars table
  value: DeltaValue
  onChange: (value: DeltaValue) => void
  onRemove: () => void
}

export default function DeltaChip({
  pillarSlug,
  pillarName,
  color,
  value,
  onChange,
  onRemove,
}: DeltaChipProps) {
  const [editing, setEditing] = useState(false)
  const [rawInput, setRawInput] = useState(formatValue(value))

  function formatValue(v: DeltaValue): string {
    if (typeof v === 'number') return String(v)
    return `${v.min}~${v.max}`
  }

  function parseInput(raw: string): DeltaValue {
    const rangeMatch = raw.match(/^(-?\d+)~(-?\d+)$/)
    if (rangeMatch) {
      return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) }
    }
    const n = parseInt(raw, 10)
    return isNaN(n) ? 0 : n
  }

  const displayValue = formatValue(value)
  const isPositive = typeof value === 'number' ? value > 0 : value.min > 0

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 text-xs border border-gray-600 rounded px-2 py-0.5">
        <span className="text-gray-400 font-mono">{pillarName}</span>
        <input
          autoFocus
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          onBlur={() => {
            onChange(parseInput(rawInput))
            setEditing(false)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onChange(parseInput(rawInput))
              setEditing(false)
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-16 bg-gray-800 text-white rounded px-1 font-mono"
          placeholder="5 or 5~15"
        />
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 cursor-pointer hover:opacity-80"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}22`, color }}
      title="Click to edit"
    >
      <span className="font-mono">{pillarName}</span>
      <button
        onClick={() => {
          setRawInput(displayValue)
          setEditing(true)
        }}
        className="font-mono font-semibold"
      >
        {isPositive ? '+' : ''}{displayValue}
      </button>
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 leading-none ml-0.5">×</button>
    </span>
  )
}
