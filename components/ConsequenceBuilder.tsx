'use client'

import { useState } from 'react'
import type { ICommand, Character } from '@/lib/types'

type CommandType = ICommand['type']

interface ConsequenceBuilderProps {
  characters: Character[]
  onAdd: (command: ICommand) => void
  onCancel: () => void
}

export default function ConsequenceBuilder({ characters, onAdd, onCancel }: ConsequenceBuilderProps) {
  const [type, setType] = useState<CommandType>('set_flag')
  const [flagId, setFlagId] = useState('')
  const [counterId, setCounterId] = useState('')
  const [counterAmount, setCounterAmount] = useState(1)
  const [entityId, setEntityId] = useState(characters[0]?.slug ?? '')
  const [effectSlug, setEffectSlug] = useState('')
  const [chainTarget, setChainTarget] = useState('')
  const [chainDelay, setChainDelay] = useState(0)

  function handleAdd() {
    let cmd: ICommand

    switch (type) {
      case 'set_flag':
        if (!flagId.trim()) return
        cmd = { type: 'set_flag', id: flagId.trim() }
        break
      case 'clear_flag':
        if (!flagId.trim()) return
        cmd = { type: 'clear_flag', id: flagId.trim() }
        break
      case 'increment_counter':
        if (!counterId.trim()) return
        cmd = { type: 'increment_counter', id: counterId.trim(), amount: counterAmount }
        break
      case 'activate_entity':
        cmd = { type: 'activate_entity', id: entityId }
        break
      case 'deactivate_entity':
        cmd = { type: 'deactivate_entity', id: entityId }
        break
      case 'apply_modifier':
        if (!effectSlug.trim()) return
        cmd = { type: 'apply_modifier', effect_slug: effectSlug.trim() }
        break
      case 'remove_modifier':
        if (!effectSlug.trim()) return
        cmd = { type: 'remove_modifier', effect_slug: effectSlug.trim() }
        break
      case 'chain':
        if (!chainTarget.trim()) return
        cmd = { type: 'chain', target: chainTarget.trim(), delay: chainDelay }
        break
      default:
        return
    }

    onAdd(cmd)
  }

  return (
    <div className="border border-gray-700 rounded p-3 bg-gray-800/50 text-xs space-y-2 mt-1">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={type}
          onChange={e => setType(e.target.value as CommandType)}
          className="bg-gray-800 text-white rounded px-2 py-1"
        >
          <option value="set_flag">+flag</option>
          <option value="clear_flag">-flag</option>
          <option value="increment_counter">counter++</option>
          <option value="activate_entity">+entity</option>
          <option value="deactivate_entity">-entity</option>
          <option value="apply_modifier">apply modifier</option>
          <option value="remove_modifier">remove modifier</option>
          <option value="chain">chain →</option>
        </select>

        {(type === 'set_flag' || type === 'clear_flag') && (
          <input
            value={flagId}
            onChange={e => setFlagId(e.target.value)}
            placeholder="flag_name"
            className="flex-1 bg-gray-800 text-white rounded px-2 py-1 font-mono"
          />
        )}

        {type === 'increment_counter' && (
          <>
            <input
              value={counterId}
              onChange={e => setCounterId(e.target.value)}
              placeholder="counter_name"
              className="flex-1 bg-gray-800 text-white rounded px-2 py-1 font-mono"
            />
            <input
              type="number"
              value={counterAmount}
              onChange={e => setCounterAmount(parseInt(e.target.value, 10) || 1)}
              className="w-16 bg-gray-800 text-white rounded px-2 py-1"
            />
          </>
        )}

        {(type === 'activate_entity' || type === 'deactivate_entity') && (
          <select
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            className="flex-1 bg-gray-800 text-white rounded px-2 py-1"
          >
            {characters.map(c => (
              <option key={c.slug} value={c.slug}>{c.display_name}</option>
            ))}
          </select>
        )}

        {(type === 'apply_modifier' || type === 'remove_modifier') && (
          <input
            value={effectSlug}
            onChange={e => setEffectSlug(e.target.value)}
            placeholder="effect_slug"
            className="flex-1 bg-gray-800 text-white rounded px-2 py-1 font-mono"
          />
        )}

        {type === 'chain' && (
          <>
            <input
              value={chainTarget}
              onChange={e => setChainTarget(e.target.value)}
              placeholder="card_slug"
              className="flex-1 bg-gray-800 text-white rounded px-2 py-1 font-mono"
            />
            <input
              type="number"
              value={chainDelay}
              onChange={e => setChainDelay(parseInt(e.target.value, 10) || 0)}
              placeholder="delay"
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
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 px-2 py-1">
          Cancel
        </button>
      </div>
    </div>
  )
}
