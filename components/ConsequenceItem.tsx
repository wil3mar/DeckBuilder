import type { ICommand, Character } from '@/lib/types'

function commandLabel(cmd: ICommand, characters: Character[]): string {
  switch (cmd.type) {
    case 'set_flag':         return `+flag:${cmd.id}`
    case 'clear_flag':       return `-flag:${cmd.id}`
    case 'increment_counter': return `counter:${cmd.id} +${cmd.amount}`
    case 'activate_entity': {
      const c = characters.find(ch => ch.slug === cmd.id)
      return `+entity:${c?.display_name ?? cmd.id}`
    }
    case 'deactivate_entity': {
      const c = characters.find(ch => ch.slug === cmd.id)
      return `-entity:${c?.display_name ?? cmd.id}`
    }
    case 'apply_modifier':   return `ApplyModifier:${cmd.effect_slug}`
    case 'remove_modifier':  return `RemoveModifier:${cmd.effect_slug}`
    case 'chain':            return `→ ${cmd.target}${cmd.delay > 0 ? ` +${cmd.delay}` : ''}`
  }
}

interface ConsequenceItemProps {
  command: ICommand
  characters: Character[]
  onRemove: () => void
}

export default function ConsequenceItem({ command, characters, onRemove }: ConsequenceItemProps) {
  const label = commandLabel(command, characters)
  return (
    <div className="flex items-center justify-between gap-2 text-xs font-mono text-gray-300 bg-gray-800/50 rounded px-2 py-1">
      <span>{label}</span>
      <button onClick={onRemove} className="text-gray-600 hover:text-gray-400 leading-none">×</button>
    </div>
  )
}
