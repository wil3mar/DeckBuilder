import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  findOrphanedFlags,
  findBrokenChains,
  findLowPillarCoverage,
  findEmptyCharacters,
  findOrphanedChainSlots,
  findSameDirectionDeltas,
} from '@/lib/game-validation'

export async function POST() {
  const supabase = createClient()

  const [
    { data: cards, error: cardsError },
    { data: flags, error: flagsError },
    { data: pillars, error: pillarsError },
    { data: characters, error: charactersError },
    { data: milestones, error: milestonesError },
  ] = await Promise.all([
    supabase.from('cards').select(
      'slug, weight, character_id, conditions, yes_deltas, no_deltas, yes_chain_target, no_chain_target, yes_consequences, no_consequences, yes_chain_delay, no_chain_delay, id, thematic, stage_label, cooldown, prompt, yes_label, yes_feedback, yes_consequences, no_label, no_feedback, no_consequences, notes, created_at, updated_at'
    ),
    supabase.from('flags').select('name, set_by, cleared_by, id, description, is_keep'),
    supabase.from('pillars').select('slug, id, display_name, start_value, floor, ceiling, is_killer, icon, color, sort_order'),
    supabase.from('characters').select('id, slug, display_name, stage_labels, voice, motivation, dynamic, escalation, portrait_url'),
    supabase.from('milestones').select('conditions, id, slug, title, description, achievement, created_at'),
  ])

  // Handle query errors
  if (cardsError || flagsError || pillarsError || charactersError || milestonesError) {
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
        details: {
          cards: cardsError?.message,
          flags: flagsError?.message,
          pillars: pillarsError?.message,
          characters: charactersError?.message,
          milestones: milestonesError?.message,
        },
      },
      { status: 500 }
    )
  }

  // Run all validation checks
  const allIssues = [
    ...findOrphanedFlags(cards ?? [], flags ?? [], milestones ?? []),
    ...findBrokenChains(cards ?? []),
    ...findLowPillarCoverage(cards ?? [], pillars ?? []),
    ...findEmptyCharacters(cards ?? [], characters ?? []),
    ...findOrphanedChainSlots(cards ?? []),
    ...findSameDirectionDeltas(cards ?? []),
  ]

  const errors = allIssues.filter(i => i.severity === 'error')
  const warnings = allIssues.filter(i => i.severity === 'warning')

  // Build stats
  const cardsPerCharacter: Record<string, number> = {}
  for (const c of characters ?? []) {
    cardsPerCharacter[c.slug] = 0
  }
  for (const card of cards ?? []) {
    if (card.character_id) {
      const char = characters?.find(c => c.id === card.character_id)
      if (char) {
        cardsPerCharacter[char.slug] = (cardsPerCharacter[char.slug] ?? 0) + 1
      }
    }
  }

  const pillarTouchCounts: Record<string, number> = {}
  for (const p of pillars ?? []) {
    pillarTouchCounts[p.slug] = 0
  }
  for (const card of cards ?? []) {
    const pillarsTouched = new Set([
      ...Object.keys(card.yes_deltas ?? {}),
      ...Object.keys(card.no_deltas ?? {}),
    ])
    for (const slug of pillarsTouched) {
      if (slug in pillarTouchCounts) {
        pillarTouchCounts[slug]++
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    errors: errors.map(e => ({ type: e.type, message: e.message })),
    warnings: warnings.map(w => ({ type: w.type, message: w.message })),
    stats: {
      total_cards: cards?.length ?? 0,
      cards_per_character: cardsPerCharacter,
      pillar_touch_counts: pillarTouchCounts,
    },
  })
}
