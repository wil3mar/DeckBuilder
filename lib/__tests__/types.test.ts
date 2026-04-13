import { describe, it, expect } from 'vitest'
import type { ICondition, ICommand, Card } from '@/lib/types'

describe('ICondition', () => {
  it('FlagCondition has correct shape', () => {
    const c: ICondition = { type: 'flag', negated: false, id: 'test_flag' }
    expect(c.type).toBe('flag')
  })

  it('ResourceCondition has correct shape', () => {
    const c: ICondition = { type: 'resource', id: 'ego', op: '>', value: 30 }
    expect(c.type).toBe('resource')
  })

  it('TemporalCondition has correct shape', () => {
    const c: ICondition = { type: 'temporal', field: 'cycle', op: '>', value: 10 }
    expect(c.type).toBe('temporal')
  })
})

describe('ICommand', () => {
  it('SetFlagCommand has correct shape', () => {
    const cmd: ICommand = { type: 'set_flag', id: 'fixer_problem_active' }
    expect(cmd.type).toBe('set_flag')
  })

  it('ChainCommand has correct shape', () => {
    const cmd: ICommand = { type: 'chain', target: 'next_card', delay: 0 }
    expect(cmd.type).toBe('chain')
  })
})

describe('CardDeltas', () => {
  it('accepts fixed delta', () => {
    const card: Pick<Card, 'yes_deltas'> = { yes_deltas: { ego: 5 } }
    expect(card.yes_deltas.ego).toBe(5)
  })

  it('accepts random range delta', () => {
    const card: Pick<Card, 'yes_deltas'> = { yes_deltas: { ego: { min: 5, max: 15 } } }
    expect((card.yes_deltas.ego as { min: number; max: number }).min).toBe(5)
  })
})
