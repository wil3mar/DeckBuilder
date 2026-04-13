// Shared snapshot builder — used by both the context route (GET) and the claude
// route (auto-build when cache is cold). Extracted so the build logic lives in
// one place.

import { createClient } from '@/lib/supabase/server'
import {
  getSnapshot,
  setSnapshot,
  type GameStateSnapshot,
  type PillarStats,
  type CharacterStats,
  type FlagSummary,
} from './context-cache'

export async function ensureSnapshot(): Promise<GameStateSnapshot> {
  const existing = getSnapshot()
  if (existing) return existing

  const supabase = createClient()

  const [
    { data: characters },
    { data: pillars },
    { data: cards },
    { data: flags },
    { data: settings },
  ] = await Promise.all([
    supabase.from('characters').select('slug, display_name, voice, motivation, dynamic, stage_labels').order('display_name'),
    supabase.from('pillars').select('slug, display_name, color, floor, ceiling, sort_order').order('sort_order'),
    supabase.from('cards').select('character_id, yes_deltas, no_deltas'),
    supabase.from('flags').select('name, set_by, cleared_by'),
    supabase.from('settings').select('stage_labels, character_bible, deck_guide').limit(1).maybeSingle(),
  ])

  const cardCountByCharId: Record<string, number> = {}
  for (const card of cards ?? []) {
    if (card.character_id) {
      cardCountByCharId[card.character_id] = (cardCountByCharId[card.character_id] ?? 0) + 1
    }
  }

  const pillarStats: PillarStats[] = (pillars ?? []).map(p => {
    let yesTouch = 0, noTouch = 0, yesSum = 0, noSum = 0
    for (const card of cards ?? []) {
      const yD = (card.yes_deltas ?? {}) as Record<string, number | { min: number; max: number }>
      const nD = (card.no_deltas  ?? {}) as Record<string, number | { min: number; max: number }>
      if (p.slug in yD) {
        yesTouch++
        const v = yD[p.slug]
        yesSum += typeof v === 'number' ? v : (v.min + v.max) / 2
      }
      if (p.slug in nD) {
        noTouch++
        const v = nD[p.slug]
        noSum += typeof v === 'number' ? v : (v.min + v.max) / 2
      }
    }
    return {
      slug: p.slug,
      display_name: p.display_name,
      color: p.color ?? '#888888',
      floor: p.floor ?? 0,
      ceiling: p.ceiling ?? 100,
      sort_order: p.sort_order ?? 0,
      yes_touch_count: yesTouch,
      no_touch_count: noTouch,
      yes_avg_delta: yesTouch > 0 ? Math.round(yesSum / yesTouch) : 0,
      no_avg_delta:  noTouch  > 0 ? Math.round(noSum  / noTouch)  : 0,
    }
  })

  const { data: charsWithId } = await supabase
    .from('characters')
    .select('id, slug, display_name, voice, motivation, dynamic, stage_labels')
    .order('display_name')

  const characterStats: CharacterStats[] = (charsWithId ?? []).map(c => ({
    slug: c.slug,
    display_name: c.display_name,
    voice: c.voice ?? '',
    motivation: c.motivation ?? '',
    dynamic: c.dynamic ?? '',
    stage_labels: c.stage_labels ?? null,
    card_count: cardCountByCharId[c.id] ?? 0,
  }))

  const flagSummaries: FlagSummary[] = (flags ?? []).map(f => ({
    name: f.name,
    set_by: f.set_by ?? [],
    cleared_by: f.cleared_by ?? [],
  }))

  const snapshot: GameStateSnapshot = {
    characters: characterStats,
    pillars: pillarStats,
    flags: flagSummaries,
    stage_labels: settings?.stage_labels ?? [],
    character_bible: settings?.character_bible ?? '',
    deck_guide: settings?.deck_guide ?? '',
    built_at: new Date().toISOString(),
  }

  setSnapshot(snapshot)
  return snapshot
}
