import { describe, it, expect } from 'vitest'
import {
  findOrphanedFlags,
  findBrokenChains,
  findLowPillarCoverage,
  findEmptyCharacters,
  findOrphanedChainSlots,
  findSameDirectionDeltas,
} from '@/lib/game-validation'
import type { Card, Flag, Pillar, Character, Milestone } from '@/lib/types'

// Minimal fixtures matching only what validation functions use
const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'id-001',
  slug: 'card_001',
  character_id: null,
  thematic: 'test',
  stage_label: null,
  weight: 5,
  cooldown: null,
  conditions: [],
  prompt: 'test prompt',
  yes_label: 'Yes',
  yes_feedback: null,
  yes_deltas: {},
  yes_consequences: [],
  yes_chain_target: null,
  yes_chain_delay: 0,
  no_label: 'No',
  no_feedback: null,
  no_deltas: {},
  no_consequences: [],
  no_chain_target: null,
  no_chain_delay: 0,
  notes: null,
  created_at: '2026-04-13T00:00:00Z',
  updated_at: '2026-04-13T00:00:00Z',
  ...overrides,
})

const makeFlag = (overrides: Partial<Flag> = {}): Flag => ({
  id: 'id-flag',
  name: 'test_flag',
  description: 'test',
  is_keep: false,
  set_by: [],
  cleared_by: [],
  ...overrides,
})

const makePillar = (overrides: Partial<Pillar> = {}): Pillar => ({
  id: 'id-pillar',
  slug: 'gold',
  display_name: 'Gold',
  start_value: 50,
  floor: 0,
  ceiling: 100,
  is_killer: true,
  icon: 'coin',
  color: '#FFD700',
  sort_order: 0,
  ...overrides,
})

const makeCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'uuid-1',
  slug: 'chef',
  display_name: 'Chef',
  stage_labels: null,
  voice: 'friendly',
  motivation: 'cook',
  dynamic: 'helpful',
  escalation: 'stubborn',
  portrait_url: null,
  ...overrides,
})

const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'id-ms',
  slug: 'milestone_001',
  title: 'First',
  description: 'test',
  conditions: [],
  achievement: null,
  created_at: '2026-04-13T00:00:00Z',
  ...overrides,
})

describe('findOrphanedFlags', () => {
  it('flags set in consequences but never in conditions are orphaned', () => {
    const cards = [
      makeCard({ slug: 'c1', yes_consequences: [{ type: 'set_flag', id: 'orphan_flag' }] }),
    ]
    const flags = [makeFlag({ name: 'orphan_flag', set_by: ['c1'], cleared_by: [] })]
    const issues = findOrphanedFlags(cards, flags, [])
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('orphaned_flag')
  })

  it('flags used in conditions are not orphaned', () => {
    const cards = [
      makeCard({
        slug: 'c1',
        conditions: [{ type: 'flag', negated: false, id: 'used_flag' }],
      }),
    ]
    const flags = [makeFlag({ name: 'used_flag', set_by: ['c1'], cleared_by: [] })]
    const issues = findOrphanedFlags(cards, flags, [])
    expect(issues).toHaveLength(0)
  })

  it('flags used in milestone conditions are not orphaned', () => {
    const cards = []
    const flags = [makeFlag({ name: 'milestone_flag', set_by: ['c1'], cleared_by: [] })]
    const milestones = [
      makeMilestone({
        conditions: [{ type: 'flag', negated: false, id: 'milestone_flag' }],
      }),
    ]
    const issues = findOrphanedFlags(cards, flags, milestones)
    expect(issues).toHaveLength(0)
  })

  it('flags never set are not considered orphaned', () => {
    const cards = []
    const flags = [makeFlag({ name: 'unused_flag', set_by: [], cleared_by: [] })]
    const issues = findOrphanedFlags(cards, flags, [])
    expect(issues).toHaveLength(0)
  })
})

describe('findBrokenChains', () => {
  it('detects missing yes_chain_target', () => {
    const cards = [makeCard({ slug: 'c1', yes_chain_target: 'missing_card' })]
    const issues = findBrokenChains(cards)
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('broken_chain')
    expect(issues[0].message).toContain('c1')
  })

  it('detects missing no_chain_target', () => {
    const cards = [makeCard({ slug: 'c1', no_chain_target: 'missing_card' })]
    const issues = findBrokenChains(cards)
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('broken_chain')
  })

  it('valid chain targets are not flagged', () => {
    const cards = [
      makeCard({ slug: 'c1', yes_chain_target: 'c2' }),
      makeCard({ slug: 'c2' }),
    ]
    expect(findBrokenChains(cards)).toHaveLength(0)
  })

  it('null chain targets do not cause errors', () => {
    const cards = [makeCard({ slug: 'c1', yes_chain_target: null, no_chain_target: null })]
    expect(findBrokenChains(cards)).toHaveLength(0)
  })
})

describe('findLowPillarCoverage', () => {
  it('flags pillars touched by fewer than 3 cards', () => {
    const cards = [
      makeCard({ slug: 'c1', yes_deltas: { gold: 5 } }),
      makeCard({ slug: 'c2', yes_deltas: { gold: -5 } }),
    ]
    const pillars = [makePillar({ slug: 'gold' })]
    const issues = findLowPillarCoverage(cards, pillars)
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('low_coverage')
  })

  it('does not flag well-covered pillars', () => {
    const cards = [1, 2, 3].map(i =>
      makeCard({ slug: `c${i}`, yes_deltas: { gold: 5 } })
    )
    expect(findLowPillarCoverage(cards, [makePillar({ slug: 'gold' })])).toHaveLength(0)
  })

  it('counts both yes and no deltas', () => {
    const cards = [
      makeCard({ slug: 'c1', yes_deltas: { gold: 5 } }),
      makeCard({ slug: 'c2', no_deltas: { gold: -5 } }),
      makeCard({ slug: 'c3', yes_deltas: { gold: 10 } }),
    ]
    expect(findLowPillarCoverage(cards, [makePillar({ slug: 'gold' })])).toHaveLength(0)
  })
})

describe('findEmptyCharacters', () => {
  it('flags characters with no cards', () => {
    const issues = findEmptyCharacters([], [makeCharacter({ id: 'uuid-1', slug: 'chef' })])
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('empty_character')
  })

  it('does not flag characters with cards', () => {
    const cards = [makeCard({ character_id: 'uuid-1' })]
    expect(
      findEmptyCharacters(cards, [makeCharacter({ id: 'uuid-1', slug: 'chef' })])
    ).toHaveLength(0)
  })

  it('ignores cards with no character_id', () => {
    const cards = [makeCard({ character_id: null })]
    expect(findEmptyCharacters(cards, [makeCharacter()])).toHaveLength(1)
  })
})

describe('findOrphanedChainSlots', () => {
  it('flags weight-0 cards with no chain target on either side', () => {
    const cards = [makeCard({ slug: 'c1', weight: 0 })]
    const issues = findOrphanedChainSlots(cards)
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('orphaned_chain_slot')
  })

  it('does not flag weight-0 cards with a yes_chain_target', () => {
    const cards = [makeCard({ weight: 0, yes_chain_target: 'next' })]
    expect(findOrphanedChainSlots(cards)).toHaveLength(0)
  })

  it('does not flag weight-0 cards with a no_chain_target', () => {
    const cards = [makeCard({ weight: 0, no_chain_target: 'next' })]
    expect(findOrphanedChainSlots(cards)).toHaveLength(0)
  })

  it('does not flag non-zero weight cards without chain targets', () => {
    const cards = [makeCard({ weight: 5, yes_chain_target: null, no_chain_target: null })]
    expect(findOrphanedChainSlots(cards)).toHaveLength(0)
  })
})

describe('findSameDirectionDeltas', () => {
  it('flags when both choices increase the same pillar', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: { ego: 5 } })]
    const issues = findSameDirectionDeltas(cards)
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('same_direction_delta')
    expect(issues[0].message).toContain('ego')
  })

  it('flags when both choices decrease the same pillar', () => {
    const cards = [makeCard({ yes_deltas: { ego: -10 }, no_deltas: { ego: -5 } })]
    const issues = findSameDirectionDeltas(cards)
    expect(issues).toHaveLength(1)
  })

  it('does not flag when choices move pillar in opposite directions', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: { ego: -5 } })]
    expect(findSameDirectionDeltas(cards)).toHaveLength(0)
  })

  it('does not flag when choices affect different pillars', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: { cash: -5 } })]
    expect(findSameDirectionDeltas(cards)).toHaveLength(0)
  })

  it('does not flag when only one choice affects a pillar', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: {} })]
    expect(findSameDirectionDeltas(cards)).toHaveLength(0)
  })
})
