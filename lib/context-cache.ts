// Module-level singleton — lives for the lifetime of the Next.js server process.
// Invalidated explicitly after each card save.

export interface PillarStats {
  slug: string
  display_name: string
  color: string
  floor: number
  ceiling: number
  sort_order: number
  yes_touch_count: number    // how many cards touch this pillar on YES side
  no_touch_count: number     // how many cards touch this pillar on NO side
  yes_avg_delta: number      // average delta on YES side (0 if never touched)
  no_avg_delta: number
}

export interface CharacterStats {
  slug: string
  display_name: string
  voice: string
  motivation: string
  dynamic: string
  stage_labels: string[] | null
  card_count: number
}

export interface FlagSummary {
  name: string
  set_by: string[]
  cleared_by: string[]
}

export interface GameStateSnapshot {
  characters: CharacterStats[]
  pillars: PillarStats[]
  flags: FlagSummary[]
  stage_labels: string[]
  character_bible: string
  deck_guide: string
  built_at: string   // ISO timestamp
}

let cached: GameStateSnapshot | null = null

export function getSnapshot(): GameStateSnapshot | null {
  return cached
}

export function setSnapshot(snapshot: GameStateSnapshot): void {
  cached = snapshot
}

export function invalidateSnapshot(): void {
  cached = null
}
