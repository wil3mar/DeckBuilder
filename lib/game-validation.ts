import type { Card, Flag, Pillar, Character, Milestone } from '@/lib/types'

export interface ValidationIssue {
  type: string
  severity: 'error' | 'warning'
  message: string
}

/**
 * Find flags that are set by consequences but never used in any conditions
 */
export function findOrphanedFlags(
  cards: Card[],
  flags: Flag[],
  milestones: Milestone[]
): ValidationIssue[] {
  const conditionFlags = new Set<string>()

  // Collect all flags used in card conditions
  for (const card of cards) {
    for (const cond of card.conditions ?? []) {
      if (cond.type === 'flag') {
        conditionFlags.add(cond.id)
      }
    }
  }

  // Collect all flags used in milestone conditions
  for (const ms of milestones) {
    for (const cond of ms.conditions ?? []) {
      if (cond.type === 'flag') {
        conditionFlags.add(cond.id)
      }
    }
  }

  return flags
    .filter(f => f.set_by.length > 0 && !conditionFlags.has(f.name))
    .map(f => ({
      type: 'orphaned_flag',
      severity: 'warning' as const,
      message: `Flag '${f.name}' is set by [${f.set_by.join(', ')}] but never used in any condition`,
    }))
}

/**
 * Find chain targets that don't exist
 */
export function findBrokenChains(cards: Card[]): ValidationIssue[] {
  const slugSet = new Set(cards.map(c => c.slug))
  const issues: ValidationIssue[] = []

  for (const card of cards) {
    if (card.yes_chain_target && !slugSet.has(card.yes_chain_target)) {
      issues.push({
        type: 'broken_chain',
        severity: 'error',
        message: `Card '${card.slug}' YES chain target '${card.yes_chain_target}' does not exist`,
      })
    }
    if (card.no_chain_target && !slugSet.has(card.no_chain_target)) {
      issues.push({
        type: 'broken_chain',
        severity: 'error',
        message: `Card '${card.slug}' NO chain target '${card.no_chain_target}' does not exist`,
      })
    }
  }

  return issues
}

/**
 * Find pillars that are touched by fewer than 3 cards
 */
export function findLowPillarCoverage(
  cards: Card[],
  pillars: Pillar[]
): ValidationIssue[] {
  const touchCount: Record<string, number> = {}

  // Initialize all pillars to 0
  for (const p of pillars) {
    touchCount[p.slug] = 0
  }

  // Count how many cards touch each pillar
  for (const card of cards) {
    const pillarsTouched = new Set([
      ...Object.keys(card.yes_deltas ?? {}),
      ...Object.keys(card.no_deltas ?? {}),
    ])
    for (const slug of pillarsTouched) {
      if (slug in touchCount) {
        touchCount[slug]++
      }
    }
  }

  return pillars
    .filter(p => touchCount[p.slug] < 3)
    .map(p => ({
      type: 'low_coverage',
      severity: 'warning' as const,
      message: `Pillar '${p.slug}' is only touched by ${touchCount[p.slug]} card(s) — target is 3+`,
    }))
}

/**
 * Find characters with no associated cards
 */
export function findEmptyCharacters(
  cards: Card[],
  characters: Character[]
): ValidationIssue[] {
  const cardCount: Record<string, number> = {}

  // Initialize all characters to 0
  for (const c of characters) {
    cardCount[c.id] = 0
  }

  // Count cards per character
  for (const card of cards) {
    if (card.character_id && card.character_id in cardCount) {
      cardCount[card.character_id]++
    }
  }

  return characters
    .filter(c => cardCount[c.id] === 0)
    .map(c => ({
      type: 'empty_character',
      severity: 'warning' as const,
      message: `Character '${c.slug}' has no cards`,
    }))
}

/**
 * Find weight-0 cards that have no chain target on either side
 */
export function findOrphanedChainSlots(cards: Card[]): ValidationIssue[] {
  return cards
    .filter(c => c.weight === 0 && !c.yes_chain_target && !c.no_chain_target)
    .map(c => ({
      type: 'orphaned_chain_slot',
      severity: 'warning' as const,
      message: `Card '${c.slug}' has weight 0 but no chain target on either side`,
    }))
}

/**
 * Find cards where both yes and no choices move the same pillar in the same direction
 */
export function findSameDirectionDeltas(cards: Card[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Helper to extract sign from a DeltaValue, using min for range objects
  const getDeltaSign = (v: number | { min: number; max: number }): number =>
    typeof v === 'number' ? v : v.min

  for (const card of cards) {
    const yes = card.yes_deltas ?? {}
    const no = card.no_deltas ?? {}

    // For each pillar in yes deltas
    for (const slug of Object.keys(yes)) {
      // Skip if not in no deltas
      if (!(slug in no)) continue

      // Extract numeric values (handle DeltaValue type), using min for range objects
      const yv = getDeltaSign(yes[slug])
      const nv = getDeltaSign(no[slug])

      // Check if both are positive or both are negative
      if ((yv > 0 && nv > 0) || (yv < 0 && nv < 0)) {
        issues.push({
          type: 'same_direction_delta',
          severity: 'warning',
          message: `Card '${card.slug}': YES (${yv > 0 ? '+' : ''}${yv}) and NO (${nv > 0 ? '+' : ''}${nv}) both ${yv > 0 ? 'increase' : 'decrease'} '${slug}' — one choice is strictly ${yv > 0 ? 'better' : 'worse'}`,
        })
      }
    }
  }

  return issues
}
