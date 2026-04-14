import { describe, it, expect } from 'vitest'
import { resolveCharacterSlugs } from '@/lib/resolve-character-slugs'

const charMap = { head_chef: 'uuid-1', manager: 'uuid-2' }

describe('resolveCharacterSlugs', () => {
  it('maps character_slug to character_id', () => {
    const { resolved, skipped } = resolveCharacterSlugs(
      [{ slug: 'card_001', character_slug: 'head_chef', prompt: 'Test' }],
      charMap
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0].character_id).toBe('uuid-1')
    expect('character_slug' in resolved[0]).toBe(false)
    expect(skipped).toHaveLength(0)
  })

  it('skips cards with unknown character_slug', () => {
    const { resolved, skipped } = resolveCharacterSlugs(
      [{ slug: 'card_002', character_slug: 'nobody' }],
      charMap
    )
    expect(resolved).toHaveLength(0)
    expect(skipped).toContain('card_002')
  })

  it('handles null character_slug', () => {
    const { resolved, skipped } = resolveCharacterSlugs(
      [{ slug: 'card_003', character_slug: null }],
      charMap
    )
    expect(resolved[0].character_id).toBeNull()
    expect(skipped).toHaveLength(0)
  })

  it('handles missing character_slug field entirely', () => {
    const { resolved, skipped } = resolveCharacterSlugs(
      [{ slug: 'card_004' }],
      charMap
    )
    expect(resolved[0].character_id).toBeNull()
    expect(skipped).toHaveLength(0)
  })

  it('handles multiple cards with mixed outcomes', () => {
    const { resolved, skipped } = resolveCharacterSlugs(
      [
        { slug: 'card_005', character_slug: 'head_chef' },
        { slug: 'card_006', character_slug: 'ghost' },
        { slug: 'card_007', character_slug: null },
      ],
      charMap
    )
    expect(resolved).toHaveLength(2)
    expect(skipped).toEqual(['card_006'])
    expect(resolved.find(r => r.slug === 'card_005')!.character_id).toBe('uuid-1')
    expect(resolved.find(r => r.slug === 'card_007')!.character_id).toBeNull()
  })
})
