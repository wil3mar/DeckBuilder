import type { ICondition, Pillar, Character } from '@/lib/types'

function conditionLabel(cond: ICondition, pillars: Pillar[], characters: Character[]): string {
  switch (cond.type) {
    case 'flag':
      return `${cond.negated ? '!' : ''}flag:${cond.id}`
    case 'resource': {
      const pillar = pillars.find(p => p.slug === cond.id)
      return `${pillar?.display_name ?? cond.id} ${cond.op} ${cond.value}`
    }
    case 'counter':
      return `counter:${cond.id} ${cond.op} ${cond.value}`
    case 'entity': {
      const char = characters.find(c => c.slug === cond.id)
      return `has:${char?.display_name ?? cond.id}`
    }
    case 'temporal':
      return `${cond.field} ${cond.op} ${cond.value}`
  }
}

const TYPE_COLORS: Record<string, string> = {
  flag:     'bg-purple-900/40 text-purple-300 border-purple-700/50',
  resource: 'bg-red-900/40 text-red-300 border-red-700/50',
  counter:  'bg-orange-900/40 text-orange-300 border-orange-700/50',
  entity:   'bg-blue-900/40 text-blue-300 border-blue-700/50',
  temporal: 'bg-gray-800 text-gray-400 border-gray-700',
}

interface ConditionTagProps {
  condition: ICondition
  pillars: Pillar[]
  characters: Character[]
  onRemove: () => void
}

export default function ConditionTag({ condition, pillars, characters, onRemove }: ConditionTagProps) {
  const colors = TYPE_COLORS[condition.type] ?? TYPE_COLORS.temporal
  const label = conditionLabel(condition, pillars, characters)

  return (
    <span className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 font-mono ${colors}`}>
      {label}
      <button
        onClick={onRemove}
        className="ml-1 opacity-60 hover:opacity-100 leading-none"
        title="Remove condition"
      >
        ×
      </button>
    </span>
  )
}
