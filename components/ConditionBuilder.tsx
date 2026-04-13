'use client'

import { useState } from 'react'
import type { ICondition, Pillar, Character, ResourceOperator } from '@/lib/types'

const OPS: ResourceOperator[] = ['>', '<', '=', '>=', '<=']

interface ConditionBuilderProps {
  pillars: Pillar[]
  characters: Character[]
  onAdd: (condition: ICondition) => void
  onCancel: () => void
}

export default function ConditionBuilder({ pillars, characters, onAdd, onCancel }: ConditionBuilderProps) {
  const [type, setType] = useState<ICondition['type']>('flag')
  const [flagId, setFlagId] = useState('')
  const [flagNegated, setFlagNegated] = useState(false)
  const [resourceId, setResourceId] = useState(pillars[0]?.slug ?? '')
  const [op, setOp] = useState<ResourceOperator>('>')
  const [numValue, setNumValue] = useState(0)
  const [counterId, setCounterId] = useState('')
  const [entityId, setEntityId] = useState(characters[0]?.slug ?? '')
  const [temporalField, setTemporalField] = useState<'cycle' | 'dynasty'>('cycle')

  function handleAdd() {
    let condition: ICondition

    switch (type) {
      case 'flag':
        if (!flagId.trim()) return
        condition = { type: 'flag', negated: flagNegated, id: flagId.trim() }
        break
      case 'resource':
        condition = { type: 'resource', id: resourceId, op, value: numValue }
        break
      case 'counter':
        if (!counterId.trim()) return
        condition = { type: 'counter', id: counterId.trim(), op, value: numValue }
        break
      case 'entity':
        condition = { type: 'entity', id: entityId }
        break
      case 'temporal':
        condition = { type: 'temporal', field: temporalField, op, value: numValue }
        break
    }

    onAdd(condition)
  }

  return (
    <div className="border border-gray-700 rounded p-3 bg-gray-800/50 text-xs space-y-2">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value as ICondition['type'])}
          className="bg-gray-800 text-white rounded px-2 py-1"
        >
          <option value="flag">Flag</option>
          <option value="resource">Resource</option>
          <option value="counter">Counter</option>
          <option value="entity">Entity</option>
          <option value="temporal">Temporal</option>
        </select>

        {type === 'flag' && (
          <>
            <label className="flex items-center gap-1 text-gray-400">
              <input
                type="checkbox"
                checked={flagNegated}
                onChange={e => setFlagNegated(e.target.checked)}
              />
              negated
            </label>
            <input
              value={flagId}
              onChange={e => setFlagId(e.target.value)}
              placeholder="flag_name"
              className="flex-1 bg-gray-800 text-white rounded px-2 py-1 font-mono"
            />
          </>
        )}

        {type === 'resource' && (
          <>
            <select
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
              className="bg-gray-800 text-white rounded px-2 py-1"
            >
              {pillars.map(p => <option key={p.slug} value={p.slug}>{p.display_name}</option>)}
            </select>
            <select
              value={op}
              onChange={e => setOp(e.target.value as ResourceOperator)}
              className="bg-gray-800 text-white rounded px-2 py-1"
            >
              {OPS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="number"
              value={numValue}
              onChange={e => setNumValue(parseInt(e.target.value, 10) || 0)}
              className="w-16 bg-gray-800 text-white rounded px-2 py-1"
            />
          </>
        )}

        {type === 'counter' && (
          <>
            <input
              value={counterId}
              onChange={e => setCounterId(e.target.value)}
              placeholder="counter_name"
              className="flex-1 bg-gray-800 text-white rounded px-2 py-1 font-mono"
            />
            <select
              value={op}
              onChange={e => setOp(e.target.value as ResourceOperator)}
              className="bg-gray-800 text-white rounded px-2 py-1"
            >
              {OPS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="number"
              value={numValue}
              onChange={e => setNumValue(parseInt(e.target.value, 10) || 0)}
              className="w-16 bg-gray-800 text-white rounded px-2 py-1"
            />
          </>
        )}

        {type === 'entity' && (
          <select
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            className="flex-1 bg-gray-800 text-white rounded px-2 py-1"
          >
            {characters.map(c => <option key={c.slug} value={c.slug}>{c.display_name}</option>)}
          </select>
        )}

        {type === 'temporal' && (
          <>
            <select
              value={temporalField}
              onChange={e => setTemporalField(e.target.value as 'cycle' | 'dynasty')}
              className="bg-gray-800 text-white rounded px-2 py-1"
            >
              <option value="cycle">cycle</option>
              <option value="dynasty">dynasty</option>
            </select>
            <select
              value={op}
              onChange={e => setOp(e.target.value as ResourceOperator)}
              className="bg-gray-800 text-white rounded px-2 py-1"
            >
              {OPS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="number"
              value={numValue}
              onChange={e => setNumValue(parseInt(e.target.value, 10) || 0)}
              className="w-16 bg-gray-800 text-white rounded px-2 py-1"
            />
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1 text-xs"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-300 px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
