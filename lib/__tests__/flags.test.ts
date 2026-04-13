import { describe, it, expect } from 'vitest'
import { extractFlagsFromConsequences } from '@/lib/flags'
import type { ICommand } from '@/lib/types'

describe('extractFlagsFromConsequences', () => {
  it('extracts set flags', () => {
    const cmds: ICommand[] = [
      { type: 'set_flag', id: 'fixer_problem_active' },
      { type: 'set_flag', id: 'stage_mayor_keep' },
    ]
    const result = extractFlagsFromConsequences(cmds)
    expect(result.setFlags).toEqual(['fixer_problem_active', 'stage_mayor_keep'])
    expect(result.clearFlags).toEqual([])
  })

  it('extracts clear flags', () => {
    const cmds: ICommand[] = [
      { type: 'clear_flag', id: 'fixer_problem_active' },
    ]
    const result = extractFlagsFromConsequences(cmds)
    expect(result.setFlags).toEqual([])
    expect(result.clearFlags).toEqual(['fixer_problem_active'])
  })

  it('extracts both set and clear from a mixed consequence list', () => {
    const cmds: ICommand[] = [
      { type: 'set_flag', id: 'act2_started' },
      { type: 'clear_flag', id: 'act1_active' },
      { type: 'chain', target: 'next_card', delay: 0 },
      { type: 'increment_counter', id: 'votes', amount: 1 },
    ]
    const result = extractFlagsFromConsequences(cmds)
    expect(result.setFlags).toEqual(['act2_started'])
    expect(result.clearFlags).toEqual(['act1_active'])
  })

  it('ignores non-flag commands', () => {
    const cmds: ICommand[] = [
      { type: 'chain', target: 'next_card', delay: 0 },
      { type: 'activate_entity', id: 'general' },
      { type: 'apply_modifier', effect_slug: 'plague' },
    ]
    const result = extractFlagsFromConsequences(cmds)
    expect(result.setFlags).toEqual([])
    expect(result.clearFlags).toEqual([])
  })

  it('handles empty array', () => {
    const result = extractFlagsFromConsequences([])
    expect(result.setFlags).toEqual([])
    expect(result.clearFlags).toEqual([])
  })
})
