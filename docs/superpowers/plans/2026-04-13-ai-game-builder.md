# AI Game Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the deck builder into an AI-powered game creation platform where Claude conducts a creative conversation and generates a complete playable card game directly in Supabase.

**Architecture:** Client-driven agentic loop. `/api/claude` returns `tool_use` blocks when Claude wants to write data. The frontend (`useAgentLoop` hook) executes each tool call against `/api/game/*` batch endpoints, sends `tool_result` turns back, and loops until Claude returns a text response. Both the brainstorm flow and the dashboard Claude panel use the same hook.

**Tech Stack:** Next.js 14 App Router, Supabase (postgres), Anthropic SDK (tool use / function calling), React hooks, vitest + @testing-library/react.

---

## File Map

**New files:**
| File | Purpose |
|---|---|
| `app/api/game/pillars/route.ts` | Batch upsert pillars |
| `app/api/game/characters/route.ts` | Batch upsert characters |
| `app/api/game/cards/route.ts` | Batch upsert cards with character_slug → character_id resolution |
| `app/api/game/effects/route.ts` | Batch upsert effects |
| `app/api/game/milestones/route.ts` | Batch upsert milestones |
| `app/api/game/flags/route.ts` | Batch upsert flags |
| `app/api/game/validate/route.ts` | Validation suite — orphaned flags, broken chains, etc. |
| `app/api/game/reset/route.ts` | Delete all game content |
| `lib/resolve-character-slugs.ts` | Pure function: maps character_slug → character_id for cards batch |
| `lib/game-validation.ts` | Pure validation functions (testable without DB) |
| `lib/game-builder-prompt.ts` | GAME_BUILDER_SYSTEM_PROMPT constant |
| `lib/game-builder-tools.ts` | GAME_TOOLS array + TOOL_LABELS map |
| `lib/useAgentLoop.ts` | Client-driven agentic loop hook |
| `components/BrainstormFlow.tsx` | Full-screen onboarding chat component |
| `lib/__tests__/resolve-character-slugs.test.ts` | Tests for slug resolution |
| `lib/__tests__/game-validation.test.ts` | Tests for validation functions |
| `lib/__tests__/agent-loop.test.ts` | Tests for useAgentLoop hook |

**Modified files:**
| File | Change |
|---|---|
| `lib/types.ts` | Add `ToolCall` type; extend `ClaudeRequest` + `ClaudeResponse` |
| `app/api/claude/route.ts` | Use game builder system prompt; pass tools on chat; handle tool_use blocks |
| `app/layout.tsx` | Card count check; render BrainstormFlow when count = 0 |
| `components/ClaudePanel.tsx` | Replace chat state with useAgentLoop; add tool progress UI |
| `components/Sidebar.tsx` | Listen for `game:content-updated` event; re-fetch nav counts |
| `app/settings/page.tsx` | Add "Danger Zone" section with "Start Over" button + confirmation modal |

---

## Task 1: Database unique constraints + simple batch endpoints

Five endpoints share the same upsert pattern. This task builds all five plus the prerequisite database constraints.

**Files:**
- Create: `app/api/game/pillars/route.ts`
- Create: `app/api/game/characters/route.ts`
- Create: `app/api/game/effects/route.ts`
- Create: `app/api/game/milestones/route.ts`
- Create: `app/api/game/flags/route.ts`

- [ ] **Step 1: Add unique constraints in Supabase**

Go to your Supabase project → SQL Editor. Run:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_pillars_slug     ON pillars(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_slug  ON characters(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_effects_slug     ON effects(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_slug  ON milestones(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_flags_name       ON flags(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_slug       ON cards(slug);
```

These are required for Supabase's `.upsert({ onConflict: 'slug' })` to work. If any already exist the statement is a no-op.

- [ ] **Step 2: Create `app/api/game/pillars/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { pillars } = await request.json()

  if (!Array.isArray(pillars) || pillars.length === 0) {
    return NextResponse.json({ error: 'pillars must be a non-empty array' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pillars')
    .upsert(pillars, { onConflict: 'slug' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0 })
}
```

- [ ] **Step 3: Create `app/api/game/characters/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { characters } = await request.json()

  if (!Array.isArray(characters) || characters.length === 0) {
    return NextResponse.json({ error: 'characters must be a non-empty array' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('characters')
    .upsert(characters, { onConflict: 'slug' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0 })
}
```

- [ ] **Step 4: Create `app/api/game/effects/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { effects } = await request.json()

  if (!Array.isArray(effects) || effects.length === 0) {
    return NextResponse.json({ error: 'effects must be a non-empty array' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('effects')
    .upsert(effects, { onConflict: 'slug' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0 })
}
```

- [ ] **Step 5: Create `app/api/game/milestones/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { milestones } = await request.json()

  if (!Array.isArray(milestones) || milestones.length === 0) {
    return NextResponse.json({ error: 'milestones must be a non-empty array' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('milestones')
    .upsert(milestones, { onConflict: 'slug' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0 })
}
```

- [ ] **Step 6: Create `app/api/game/flags/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { flags } = await request.json()

  if (!Array.isArray(flags) || flags.length === 0) {
    return NextResponse.json({ error: 'flags must be a non-empty array' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('flags')
    .upsert(flags, { onConflict: 'name' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0 })
}
```

- [ ] **Step 7: Smoke test — run the dev server and POST to each endpoint**

```bash
npm run dev
```

In a second terminal:
```bash
curl -X POST http://localhost:3000/api/game/pillars \
  -H "Content-Type: application/json" \
  -d '{"pillars":[{"slug":"test","display_name":"TEST","start_value":50,"floor":0,"ceiling":100,"is_killer":true,"color":"#fff","icon":"star","sort_order":0}]}'
# Expected: {"created":1}

curl -X POST http://localhost:3000/api/game/characters \
  -H "Content-Type: application/json" \
  -d '{"characters":[{"slug":"test_char","display_name":"Test","voice":"Dry","motivation":"Power","dynamic":"Advisor","escalation":"Calm to chaos"}]}'
# Expected: {"created":1}
```

> Note: These endpoints require an authenticated Supabase session. If you get 401/403, the middleware is blocking unauthenticated requests — test from the browser while logged in, or temporarily skip auth for smoke testing.

- [ ] **Step 8: Commit**

```bash
git add app/api/game/
git commit -m "feat: add batch upsert endpoints for pillars, characters, effects, milestones, flags"
```

---

## Task 2: Cards batch endpoint with slug resolution

Cards are more complex because Claude uses `character_slug` (a human-readable string) but the DB stores `character_id` (a UUID). This resolution logic is extracted as a pure function so it can be tested without a DB.

**Files:**
- Create: `lib/resolve-character-slugs.ts`
- Create: `app/api/game/cards/route.ts`
- Test: `lib/__tests__/resolve-character-slugs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/resolve-character-slugs.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/__tests__/resolve-character-slugs.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/resolve-character-slugs'"

- [ ] **Step 3: Create `lib/resolve-character-slugs.ts`**

```typescript
interface CardInput {
  slug: string
  character_slug?: string | null
  [key: string]: unknown
}

type ResolvedCard = Omit<CardInput, 'character_slug'> & { character_id: string | null }

export interface ResolvedCards {
  resolved: ResolvedCard[]
  skipped: string[]
}

export function resolveCharacterSlugs(
  cards: CardInput[],
  charMap: Record<string, string>
): ResolvedCards {
  const resolved: ResolvedCard[] = []
  const skipped: string[] = []

  for (const { character_slug, ...rest } of cards) {
    if (character_slug && !charMap[character_slug]) {
      skipped.push(rest.slug)
      continue
    }
    resolved.push({
      ...rest,
      character_id: character_slug ? (charMap[character_slug] ?? null) : null,
    })
  }

  return { resolved, skipped }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test lib/__tests__/resolve-character-slugs.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Create `app/api/game/cards/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveCharacterSlugs } from '@/lib/resolve-character-slugs'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { cards } = await request.json()

  if (!Array.isArray(cards) || cards.length === 0) {
    return NextResponse.json({ error: 'cards must be a non-empty array' }, { status: 400 })
  }

  // Collect unique character slugs referenced in this batch
  const referencedSlugs = [
    ...new Set(cards.map((c: { character_slug?: string | null }) => c.character_slug).filter(Boolean)),
  ] as string[]

  // Build slug → id map
  const charMap: Record<string, string> = {}
  if (referencedSlugs.length > 0) {
    const { data: chars, error: charErr } = await supabase
      .from('characters')
      .select('id, slug')
      .in('slug', referencedSlugs)

    if (charErr) return NextResponse.json({ error: charErr.message }, { status: 500 })
    for (const c of chars ?? []) charMap[c.slug] = c.id
  }

  const { resolved, skipped } = resolveCharacterSlugs(cards, charMap)

  if (resolved.length === 0) {
    return NextResponse.json({ created: 0, skipped })
  }

  // Apply defaults for nullable fields Claude may omit
  const rows = resolved.map(card => ({
    yes_feedback: null,
    no_feedback: null,
    yes_consequences: [],
    no_consequences: [],
    yes_chain_target: null,
    yes_chain_delay: 0,
    no_chain_target: null,
    no_chain_delay: 0,
    notes: null,
    stage_label: null,
    cooldown: null,
    conditions: [],
    ...card,
  }))

  const { data, error } = await supabase
    .from('cards')
    .upsert(rows, { onConflict: 'slug' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0, skipped })
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/resolve-character-slugs.ts lib/__tests__/resolve-character-slugs.test.ts app/api/game/cards/route.ts
git commit -m "feat: add cards batch endpoint with character slug resolution"
```

---

## Task 3: Validate endpoint

Validation logic is extracted to pure functions in `lib/game-validation.ts` so each check can be tested independently without a database.

**Files:**
- Create: `lib/game-validation.ts`
- Create: `app/api/game/validate/route.ts`
- Test: `lib/__tests__/game-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/game-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  findOrphanedFlags,
  findBrokenChains,
  findLowPillarCoverage,
  findEmptyCharacters,
  findOrphanedChainSlots,
  findSameDirectionDeltas,
} from '@/lib/game-validation'

// Minimal type stubs matching only what validation functions use
const makeCard = (overrides: Record<string, unknown> = {}) => ({
  slug: 'card_001',
  weight: 5,
  character_id: null,
  conditions: [],
  yes_deltas: {},
  no_deltas: {},
  yes_chain_target: null,
  no_chain_target: null,
  yes_consequences: [],
  no_consequences: [],
  ...overrides,
})

describe('findOrphanedFlags', () => {
  it('flags set in consequences but never in conditions are orphaned', () => {
    const cards = [
      makeCard({ slug: 'c1', yes_consequences: [{ type: 'set_flag', id: 'orphan_flag' }] }),
    ]
    const flags = [{ name: 'orphan_flag', set_by: ['c1'], cleared_by: [] }]
    const issues = findOrphanedFlags(cards, flags, [])
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('orphaned_flag')
  })

  it('flags used in conditions are not orphaned', () => {
    const cards = [
      makeCard({ slug: 'c1', conditions: [{ type: 'flag', id: 'used_flag', negated: false }] }),
    ]
    const flags = [{ name: 'used_flag', set_by: ['c1'], cleared_by: [] }]
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

  it('valid chain targets are not flagged', () => {
    const cards = [
      makeCard({ slug: 'c1', yes_chain_target: 'c2' }),
      makeCard({ slug: 'c2' }),
    ]
    expect(findBrokenChains(cards)).toHaveLength(0)
  })
})

describe('findLowPillarCoverage', () => {
  it('flags pillars touched by fewer than 3 cards', () => {
    const cards = [
      makeCard({ yes_deltas: { gold: 5 } }),
      makeCard({ yes_deltas: { gold: -5 } }),
    ]
    const pillars = [{ slug: 'gold' }]
    const issues = findLowPillarCoverage(cards, pillars)
    expect(issues[0].type).toBe('low_coverage')
  })

  it('does not flag well-covered pillars', () => {
    const cards = [1, 2, 3].map(i => makeCard({ slug: `c${i}`, yes_deltas: { gold: 5 } }))
    expect(findLowPillarCoverage(cards, [{ slug: 'gold' }])).toHaveLength(0)
  })
})

describe('findEmptyCharacters', () => {
  it('flags characters with no cards', () => {
    const issues = findEmptyCharacters([], [{ id: 'uuid-1', slug: 'chef' }])
    expect(issues[0].type).toBe('empty_character')
  })

  it('does not flag characters with cards', () => {
    const cards = [makeCard({ character_id: 'uuid-1' })]
    expect(findEmptyCharacters(cards, [{ id: 'uuid-1', slug: 'chef' }])).toHaveLength(0)
  })
})

describe('findOrphanedChainSlots', () => {
  it('flags weight-0 cards with no chain target', () => {
    const cards = [makeCard({ slug: 'c1', weight: 0 })]
    const issues = findOrphanedChainSlots(cards)
    expect(issues[0].type).toBe('orphaned_chain_slot')
  })

  it('does not flag weight-0 cards that have a chain target', () => {
    const cards = [makeCard({ weight: 0, yes_chain_target: 'next' })]
    expect(findOrphanedChainSlots(cards)).toHaveLength(0)
  })
})

describe('findSameDirectionDeltas', () => {
  it('flags when both choices increase the same pillar', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: { ego: 5 } })]
    const issues = findSameDirectionDeltas(cards)
    expect(issues[0].type).toBe('same_direction_delta')
    expect(issues[0].message).toContain('ego')
  })

  it('does not flag when choices move pillar in opposite directions', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: { ego: -5 } })]
    expect(findSameDirectionDeltas(cards)).toHaveLength(0)
  })

  it('does not flag when choices affect different pillars', () => {
    const cards = [makeCard({ yes_deltas: { ego: 10 }, no_deltas: { cash: -5 } })]
    expect(findSameDirectionDeltas(cards)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test lib/__tests__/game-validation.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/game-validation'"

- [ ] **Step 3: Create `lib/game-validation.ts`**

```typescript
export interface ValidationIssue {
  type: string
  severity: 'error' | 'warning'
  message: string
}

interface CardData {
  slug: string
  weight: number
  character_id: string | null
  conditions: Array<{ type: string; id?: string; [key: string]: unknown }>
  yes_deltas: Record<string, number>
  no_deltas: Record<string, number>
  yes_chain_target: string | null
  no_chain_target: string | null
  yes_consequences: Array<{ type: string; id?: string; [key: string]: unknown }>
  no_consequences: Array<{ type: string; id?: string; [key: string]: unknown }>
}

interface FlagData {
  name: string
  set_by: string[]
  cleared_by: string[]
}

interface PillarData {
  slug: string
}

interface CharacterData {
  id: string
  slug: string
}

interface MilestoneData {
  conditions: Array<{ type: string; id?: string; [key: string]: unknown }>
}

export function findOrphanedFlags(
  cards: CardData[],
  flags: FlagData[],
  milestones: MilestoneData[]
): ValidationIssue[] {
  const conditionFlags = new Set<string>()
  for (const card of cards) {
    for (const cond of card.conditions ?? []) {
      if (cond.type === 'flag' && cond.id) conditionFlags.add(cond.id)
    }
  }
  for (const ms of milestones) {
    for (const cond of ms.conditions ?? []) {
      if (cond.type === 'flag' && cond.id) conditionFlags.add(cond.id)
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

export function findBrokenChains(cards: CardData[]): ValidationIssue[] {
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

export function findLowPillarCoverage(
  cards: CardData[],
  pillars: PillarData[]
): ValidationIssue[] {
  const touchCount: Record<string, number> = {}
  for (const p of pillars) touchCount[p.slug] = 0
  for (const card of cards) {
    for (const slug of [...Object.keys(card.yes_deltas ?? {}), ...Object.keys(card.no_deltas ?? {})]) {
      if (slug in touchCount) touchCount[slug]++
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

export function findEmptyCharacters(
  cards: CardData[],
  characters: CharacterData[]
): ValidationIssue[] {
  const cardCount: Record<string, number> = {}
  for (const c of characters) cardCount[c.id] = 0
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

export function findOrphanedChainSlots(cards: CardData[]): ValidationIssue[] {
  return cards
    .filter(c => c.weight === 0 && !c.yes_chain_target && !c.no_chain_target)
    .map(c => ({
      type: 'orphaned_chain_slot',
      severity: 'warning' as const,
      message: `Card '${c.slug}' has weight 0 but no chain target on either side`,
    }))
}

export function findSameDirectionDeltas(cards: CardData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const card of cards) {
    const yes = card.yes_deltas ?? {}
    const no = card.no_deltas ?? {}
    for (const slug of Object.keys(yes)) {
      if (!(slug in no)) continue
      const yv = typeof yes[slug] === 'number' ? yes[slug] : 0
      const nv = typeof no[slug] === 'number' ? no[slug] : 0
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test lib/__tests__/game-validation.test.ts
```

Expected: PASS, all tests.

- [ ] **Step 5: Create `app/api/game/validate/route.ts`**

```typescript
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
    { data: cards },
    { data: flags },
    { data: pillars },
    { data: characters },
    { data: milestones },
  ] = await Promise.all([
    supabase.from('cards').select('slug, weight, character_id, conditions, yes_deltas, no_deltas, yes_chain_target, no_chain_target, yes_consequences, no_consequences'),
    supabase.from('flags').select('name, set_by, cleared_by'),
    supabase.from('pillars').select('slug'),
    supabase.from('characters').select('id, slug'),
    supabase.from('milestones').select('conditions'),
  ])

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
  for (const c of characters ?? []) cardsPerCharacter[c.slug] = 0
  for (const card of cards ?? []) {
    if (card.character_id) {
      const char = characters?.find(c => c.id === card.character_id)
      if (char) cardsPerCharacter[char.slug] = (cardsPerCharacter[char.slug] ?? 0) + 1
    }
  }

  const pillarTouchCounts: Record<string, number> = {}
  for (const p of pillars ?? []) pillarTouchCounts[p.slug] = 0
  for (const card of cards ?? []) {
    for (const slug of [...Object.keys(card.yes_deltas ?? {}), ...Object.keys(card.no_deltas ?? {})]) {
      if (slug in pillarTouchCounts) pillarTouchCounts[slug]++
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
```

- [ ] **Step 6: Commit**

```bash
git add lib/game-validation.ts lib/__tests__/game-validation.test.ts app/api/game/validate/route.ts
git commit -m "feat: add validate endpoint with testable validation logic"
```

---

## Task 4: Reset endpoint

**Files:**
- Create: `app/api/game/reset/route.ts`

- [ ] **Step 1: Create `app/api/game/reset/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { invalidateSnapshot } from '@/lib/context-cache'

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body.confirm) {
    return NextResponse.json({ error: 'Must include { "confirm": true } in request body' }, { status: 400 })
  }

  const supabase = createClient()

  // Delete in dependency order: cards first (references characters), then the rest
  const deletions = await Promise.all([
    supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('milestones').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('effects').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('flags').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ])

  const firstError = deletions.find(d => d.error)?.error
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })

  // Delete characters after cards (FK dependency)
  const { error: charErr } = await supabase
    .from('characters')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (charErr) return NextResponse.json({ error: charErr.message }, { status: 500 })

  // Delete pillars last
  const { error: pillarErr } = await supabase
    .from('pillars')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (pillarErr) return NextResponse.json({ error: pillarErr.message }, { status: 500 })

  invalidateSnapshot()

  return NextResponse.json({
    deleted: { cards: true, milestones: true, effects: true, flags: true, characters: true, pillars: true },
  })
}
```

> **Why `.neq('id', '00000000-...')`?** Supabase requires a filter on DELETE to prevent accidental full-table deletes without a WHERE clause. This filter is always true (no row has that UUID) and acts as the required WHERE clause while deleting all rows.

- [ ] **Step 2: Verify the import exists**

Check that `invalidateSnapshot` is exported from `lib/context-cache.ts`. Open the file and confirm:

```bash
grep "export.*invalidateSnapshot" lib/context-cache.ts
```

If not found, open `lib/context-cache.ts` and add the export alongside `getSnapshot`/`setSnapshot`.

- [ ] **Step 3: Commit**

```bash
git add app/api/game/reset/route.ts
git commit -m "feat: add reset endpoint — deletes all game content"
```

---

## Task 5: System prompt + tool definitions

**Files:**
- Create: `lib/game-builder-prompt.ts`
- Create: `lib/game-builder-tools.ts`

- [ ] **Step 1: Create `lib/game-builder-prompt.ts`**

```typescript
export const GAME_BUILDER_SYSTEM_PROMPT = `You are a game designer and writer building swipe-based narrative card games. You create complete, mechanically sound, playable games from creative conversations with non-technical users.

YOU UNDERSTAND THE ENGINE:
- The game has N resource pillars (typically 4). Each has a floor (0) and ceiling (100). Breaching either kills the run.
- Characters (called "bearers" in the engine) present cards to the player. The player swipes right (yes) or left (no). Each choice affects pillar values and can trigger consequences.
- Cards have weights (how often they appear: 3-8 normal, 0 chain-only, -1 auto-fire), cooldowns (turns before they can reappear), and conditions (flags or resource thresholds that must be met).
- Chains are multi-card sequences. A card can queue the next card in the chain with an optional delay. Chains create narrative arcs.
- Flags are boolean state. flag_name = active, !flag_name = inactive. Flags with _keep suffix persist across run resets (deaths). Regular flags clear on death.
- Effects are persistent modifiers that drain or boost pillars every turn while active. They have durations or are tied to flags.
- Milestones are achievements that unlock when conditions are met. They can gate act progression.
- Acts/stages are NOT an engine concept. They are created entirely through flags and conditions. Act 1 cards have no flag requirements. Act 2 cards require a stage flag (e.g., stage_act2_keep). The engine just filters by conditions.
- Death resets the run. _keep flags persist. Dynasty count increments. The player starts a new run with accumulated progression.

YOU UNDERSTAND BALANCE:
- Most cards should affect 2-3 pillars. Single-pillar cards need justification. Four-pillar cards are rare crisis moments.
- Normal magnitude: ±5 to ±15. Crisis: ±15 to ±25. Never exceed ±30.
- Both choices should have tradeoffs. Never make one choice obviously correct.
- Target pillar balance: roughly 40-50% of cards increase each pillar, 50-60% decrease. Slight negative bias creates tension.
- No character should present more than 20% of the deck.
- Chain entry cards should have weight 5 (appear in normal pool). Chain continuation cards should have weight 0 (only appear when queued).
- Auto-fire crisis cards should trigger at pillar value ≤ 20 as warning shots before death at 0.
- Death cards fire automatically at floor (0) and ceiling (100). Write both for every killer pillar.

YOU UNDERSTAND WRITING:
- Card prompts are 2-4 sentences. Present a situation, not a question.
- Third person present tense. "The chef throws a pan." Not "Your chef has thrown a pan."
- Swipe labels are actions, not answers. "Back the chef" not "Yes." Keep under 5 words.
- Tone matches the user's stated preference. Comedy is deadpan. Drama is understated. Absurdist is internally logical.
- Characters never break voice. Every card should sound like its bearer.
- Both choices should feel like real dilemmas. The comedy or drama is in the tension, not the outcome.

YOU NEVER EXPLAIN MECHANICS UNLESS ASKED:
- Don't say "I'll set the weight to 5." Just do it.
- Don't say "This card uses a flag condition." Just create the condition.
- Don't say "I'm creating a chain sequence." Just write the cards.
- If the user asks "why does the chef show up so much?" say "I'll make him appear less often" — not "I'll reduce his card weights from 8 to 4."
- Only explain mechanics when the user explicitly asks how something works.

YOU CREATE GAMES BY CALLING API ENDPOINTS:
When you have enough creative direction from the user, build the game by calling tools in this order:
1. create_pillars — create all resource pillars
2. create_characters — create all characters for all acts
3. create_effects — create persistent effects (if any)
4. create_cards — create all cards, calling in batches of 10-20
5. create_milestones — create milestones and act gates
6. create_flags — populate flag registry from all card consequences
7. validate_game — run self-check and report results

After generation, report results conversationally: "Your game is ready — [X] cards across [Y] characters." Summarize each character's role and card count. Offer to adjust anything.

YOU HANDLE REFINEMENT REQUESTS IN PLAIN ENGLISH:
- "The chef shows up too much" → call create_cards to update weights on chef cards
- "I want a storyline where the landlord tries to sell" → create a chain sequence with flags and conditions
- "The game is too hard" → reduce negative magnitude across the deck
- "Add a health inspector character" → create character, write 15-20 cards, integrate with existing flags
- Always make changes through API calls. Always run validate_game after batch changes.`
```

- [ ] **Step 2: Create `lib/game-builder-tools.ts`**

```typescript
// Plain objects — no Anthropic SDK import needed.
// The claude route passes these to client.messages.create({ tools: GAME_TOOLS })
// which accepts any array of objects matching the Tool shape.

export const GAME_TOOLS = [
  {
    name: 'create_pillars',
    description: 'Create or update resource pillars. Each pillar tracks one resource. Call this first when building a new game.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pillars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:         { type: 'string', description: 'Unique identifier, lowercase_underscores' },
              display_name: { type: 'string', description: 'Name shown to player, e.g. REVIEWS' },
              start_value:  { type: 'number', description: 'Starting value, typically 50' },
              floor:        { type: 'number', description: 'Value at which run ends (typically 0)' },
              ceiling:      { type: 'number', description: 'Value at which run ends (typically 100)' },
              is_killer:    { type: 'boolean', description: 'Whether breaching floor/ceiling ends the run' },
              color:        { type: 'string', description: 'Hex color, e.g. #FFD700' },
              icon:         { type: 'string', description: 'Icon name string' },
              sort_order:   { type: 'number', description: 'Display order, 0 = first' },
            },
            required: ['slug', 'display_name', 'start_value', 'floor', 'ceiling', 'is_killer', 'color', 'icon', 'sort_order'],
          },
        },
      },
      required: ['pillars'],
    },
  },
  {
    name: 'create_characters',
    description: 'Create or update characters who present cards to the player. Call after creating pillars.',
    input_schema: {
      type: 'object' as const,
      properties: {
        characters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:         { type: 'string' },
              display_name: { type: 'string' },
              voice:        { type: 'string', description: 'How this character speaks' },
              motivation:   { type: 'string', description: 'What this character wants' },
              dynamic:      { type: 'string', description: 'Their relationship to the player' },
              escalation:   { type: 'string', description: 'How their behavior escalates over time' },
            },
            required: ['slug', 'display_name', 'voice', 'motivation', 'dynamic', 'escalation'],
          },
        },
      },
      required: ['characters'],
    },
  },
  {
    name: 'create_cards',
    description: 'Create or update cards. Call in batches of 10-20. Use character_slug (not UUID) to reference characters. Chain cards with yes_chain_target/no_chain_target.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:             { type: 'string' },
              character_slug:   { type: 'string', description: 'Character slug. Omit or null for narrator cards.' },
              thematic:         { type: 'string', description: 'Grouping label, e.g. act1_chef' },
              stage_label:      { type: 'string', description: 'Display label e.g. Act 1. Optional.' },
              weight:           { type: 'number', description: '3-8 normal, 0 chain-only, -1 auto-fire' },
              cooldown:         { type: 'string', description: 'Cycles before reappearing. null = no cooldown.' },
              conditions:       { type: 'array', items: { type: 'object' }, description: 'ICondition objects' },
              prompt:           { type: 'string', description: '2-4 sentences, third-person present tense' },
              yes_label:        { type: 'string', description: 'Action label, under 5 words' },
              yes_deltas:       { type: 'object', description: 'pillar_slug → integer delta' },
              yes_consequences: { type: 'array', items: { type: 'object' }, description: 'ICommand objects' },
              yes_chain_target: { type: 'string', description: 'Slug of next chain card, or null' },
              yes_chain_delay:  { type: 'number', description: 'Cycles before chain fires. 0 = immediate.' },
              no_label:         { type: 'string' },
              no_deltas:        { type: 'object' },
              no_consequences:  { type: 'array', items: { type: 'object' } },
              no_chain_target:  { type: 'string' },
              no_chain_delay:   { type: 'number' },
              notes:            { type: 'string' },
            },
            required: ['slug', 'thematic', 'weight', 'prompt', 'yes_label', 'yes_deltas', 'no_label', 'no_deltas'],
          },
        },
      },
      required: ['cards'],
    },
  },
  {
    name: 'create_effects',
    description: 'Create persistent effects that drain or boost pillars every turn while active.',
    input_schema: {
      type: 'object' as const,
      properties: {
        effects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:             { type: 'string' },
              title:            { type: 'string' },
              description:      { type: 'string' },
              duration:         { type: 'number', description: 'Cycles active. -1 = indefinite.' },
              per_cycle_deltas: { type: 'object', description: 'pillar_slug → delta per cycle' },
            },
            required: ['slug', 'title', 'description', 'duration', 'per_cycle_deltas'],
          },
        },
      },
      required: ['effects'],
    },
  },
  {
    name: 'create_milestones',
    description: 'Create milestones that unlock when conditions are met. Use these to gate act progression.',
    input_schema: {
      type: 'object' as const,
      properties: {
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:        { type: 'string' },
              title:       { type: 'string' },
              description: { type: 'string' },
              conditions:  { type: 'array', items: { type: 'object' } },
              achievement: { type: 'string', description: 'Achievement text. null if none.' },
            },
            required: ['slug', 'title', 'description', 'conditions'],
          },
        },
      },
      required: ['milestones'],
    },
  },
  {
    name: 'create_flags',
    description: 'Register flags in the flag registry. Call after all cards are created so you know which cards set/clear each flag.',
    input_schema: {
      type: 'object' as const,
      properties: {
        flags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name:        { type: 'string', description: 'Flag name. Use _keep suffix for flags that survive run resets.' },
              description: { type: 'string' },
              is_keep:     { type: 'boolean' },
              set_by:      { type: 'array', items: { type: 'string' }, description: 'Card slugs that set this flag' },
              cleared_by:  { type: 'array', items: { type: 'string' }, description: 'Card slugs that clear this flag' },
            },
            required: ['name', 'description', 'is_keep', 'set_by', 'cleared_by'],
          },
        },
      },
      required: ['flags'],
    },
  },
  {
    name: 'validate_game',
    description: 'Run the validation suite on all game content. Call this after creating all content to check for issues.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
] as const

// Human-readable labels for the progress UI
export const TOOL_LABELS: Record<string, string> = {
  create_pillars:    'Creating pillars',
  create_characters: 'Creating characters',
  create_cards:      'Writing cards',
  create_effects:    'Creating effects',
  create_milestones: 'Creating milestones',
  create_flags:      'Building flag registry',
  validate_game:     'Running balance check',
}

// Maps tool name to the API endpoint it calls
export const TOOL_ENDPOINTS: Record<string, string> = {
  create_pillars:    '/api/game/pillars',
  create_characters: '/api/game/characters',
  create_cards:      '/api/game/cards',
  create_effects:    '/api/game/effects',
  create_milestones: '/api/game/milestones',
  create_flags:      '/api/game/flags',
  validate_game:     '/api/game/validate',
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/game-builder-prompt.ts lib/game-builder-tools.ts
git commit -m "feat: add game builder system prompt and tool definitions"
```

---

## Task 6: Update types + Claude route

**Files:**
- Modify: `lib/types.ts`
- Modify: `app/api/claude/route.ts`

- [ ] **Step 1: Add new types to `lib/types.ts`**

Add after the existing `ObservationItem` interface (around line 167):

```typescript
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}
```

Extend `ClaudeRequest` interface (around line 182) — add a `messages` field:

```typescript
export interface ClaudeRequest {
  action: ClaudeAction
  card?: Card | null
  side?: 'yes' | 'no'
  message?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  // For agentic loop: full message history in Anthropic format (content can be string or content blocks)
  messages?: Array<{ role: 'user' | 'assistant'; content: unknown }>
}
```

Extend `ClaudeResponse` union (around line 190) — add the `tool_use` variant:

```typescript
export type ClaudeResponse =
  | { action: 'write_prompt' | 'sharpen_tone' | 'make_funnier' | 'shorter'; text: string }
  | { action: 'suggest_deltas'; deltas: Record<string, number> }
  | { action: 'suggest_conditions'; conditions: ICondition[] }
  | { action: 'chat'; reply: string }
  | { action: 'observations'; items: ObservationItem[] }
  | { action: 'tool_use'; calls: ToolCall[]; assistantContent: unknown[] }
```

- [ ] **Step 2: Run existing tests to make sure nothing broke**

```bash
npm test
```

Expected: All existing tests pass.

- [ ] **Step 3: Update `app/api/claude/route.ts`**

Replace the entire file with:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ensureSnapshot } from '@/lib/build-snapshot'
import { GAME_BUILDER_SYSTEM_PROMPT } from '@/lib/game-builder-prompt'
import { GAME_TOOLS } from '@/lib/game-builder-tools'
import type { ClaudeRequest, ClaudeResponse } from '@/lib/types'
import type { GameStateSnapshot } from '@/lib/context-cache'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(snapshot: GameStateSnapshot | null): string {
  if (!snapshot) return GAME_BUILDER_SYSTEM_PROMPT

  const pillarList = snapshot.pillars
    .map(p => `  - ${p.display_name} (slug: ${p.slug}, range: ${p.floor}–${p.ceiling}, avg YES Δ: ${p.yes_avg_delta}, avg NO Δ: ${p.no_avg_delta})`)
    .join('\n')

  const charList = snapshot.characters
    .map(c => `  - ${c.display_name} (slug: ${c.slug}, cards: ${c.card_count})\n    Voice: ${c.voice}\n    Motivation: ${c.motivation}\n    Dynamic: ${c.dynamic}`)
    .join('\n')

  const flagList = snapshot.flags.length > 0
    ? snapshot.flags.map(f => `  - ${f.name} (set by: [${f.set_by.join(', ')}], cleared by: [${f.cleared_by.join(', ')}])`).join('\n')
    : '  (none yet)'

  const stageList = snapshot.stage_labels.length > 0
    ? snapshot.stage_labels.join(', ')
    : '(none defined)'

  return `${GAME_BUILDER_SYSTEM_PROMPT}

---

## Current Game State

### Resource Pillars
${pillarList || '  (none defined yet)'}

### Characters
${charList || '  (none defined yet)'}

### Stage Labels
${stageList}

### Flag Registry
${flagList}

${snapshot.character_bible ? `### Character Bible\n${snapshot.character_bible}\n` : ''}${snapshot.deck_guide ? `### Deck Guide\n${snapshot.deck_guide}\n` : ''}
## Response Rules
- For ALL actions except 'chat': respond with valid JSON matching the schema in the user message. Never wrap JSON in markdown code blocks.
- For the 'chat' action: respond with plain conversational text. No JSON. Markdown formatting (bold, bullet lists) is fine and encouraged for readability.
- Keep prompt text in the present tense, second-person POV (the character speaks to the player).
- Prompt text should be 2-4 sentences max.
- Delta suggestions should be integers within pillar ranges. Never suggest the same pillar on both YES and NO sides — that wastes a card.
- Condition suggestions should use only pillar slugs and flag names that already exist in the registry.`
}

function cardSummary(card: NonNullable<ClaudeRequest['card']>): string {
  return JSON.stringify({
    slug: card.slug,
    thematic: card.thematic,
    stage_label: card.stage_label,
    weight: card.weight,
    conditions: card.conditions,
    prompt: card.prompt,
    yes_label: card.yes_label,
    yes_deltas: card.yes_deltas,
    yes_consequences: card.yes_consequences,
    yes_chain_target: card.yes_chain_target,
    no_label: card.no_label,
    no_deltas: card.no_deltas,
    no_consequences: card.no_consequences,
    no_chain_target: card.no_chain_target,
  }, null, 2)
}

function buildUserMessage(req: ClaudeRequest): string {
  if (req.action === 'chat') return req.message ?? 'Hello'

  const card = cardSummary(req.card!)

  switch (req.action) {
    case 'write_prompt':
      return `Write a prompt for this card. The bearer is presenting a situation to the player. Make it specific, atmospheric, and leave the outcome genuinely ambiguous.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "write_prompt", "text": "<prompt text>" }`

    case 'sharpen_tone':
      return `Sharpen the tone of this prompt. Keep the meaning but make it more vivid and on-brand for the bearer's voice. Do not change the fundamental situation.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "sharpen_tone", "text": "<improved prompt text>" }`

    case 'make_funnier':
      return `Make this prompt funnier. Keep the situation intact but add wit, irony, or absurdity appropriate to the game's tone. Don't undermine the stakes.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "make_funnier", "text": "<funnier prompt text>" }`

    case 'shorter':
      return `Condense this prompt to its essentials. Target 1-2 punchy sentences. Preserve the core tension and the YES/NO choice clarity.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "shorter", "text": "<condensed prompt text>" }`

    case 'suggest_deltas': {
      const side = req.side ?? 'yes'
      const oppositeSide = side === 'yes' ? 'no' : 'yes'
      const oppositeDeltas = side === 'yes' ? req.card!.no_deltas : req.card!.yes_deltas
      return `Suggest pillar deltas for the ${side.toUpperCase()} choice on this card.\n\nRules:\n- Suggest 1-3 pillars. Fewer is better — every delta should feel meaningful.\n- Do NOT suggest pillars already used on the ${oppositeSide.toUpperCase()} side: ${JSON.stringify(Object.keys(oppositeDeltas))}\n- Values should be reasonable integers (typically ±5 to ±20). Dramatic swings need strong narrative justification.\n- Reflect the ${side === 'yes' ? 'accepting/agreeing' : 'refusing/declining'} direction of the choice.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "suggest_deltas", "deltas": { "<pillar_slug>": <integer>, ... } }`
    }

    case 'suggest_conditions':
      return `Suggest preconditions for this card. These control when the card is eligible to appear.\n\nRules:\n- Only use pillar slugs and flag names that already exist in the registry.\n- 1-2 conditions is usually enough. More than 3 makes the card too restrictive.\n- Consider what narrative state would make this card feel earned or timely.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "suggest_conditions", "conditions": [ <ICondition objects> ] }\n\nICondition shapes:\n- { "type": "flag", "id": "<flag_name>", "negated": false }\n- { "type": "resource", "id": "<pillar_slug>", "op": ">", "value": 50 }\n- { "type": "counter", "id": "<counter_name>", "op": ">", "value": 0 }\n- { "type": "entity", "id": "<character_slug>" }\n- { "type": "temporal", "field": "cycle", "op": ">", "value": 5 }`

    case 'observations':
      return `Review this card and return observations about potential design issues. Be concise and specific.\n\nCheck for:\n1. Cards where only one side affects any pillars (asymmetric coverage often feels unfair)\n2. Weight 0 with no chain target set (orphaned chain slot)\n3. Flags set by consequences that never appear in any condition in the flag registry (check the Flag Registry above)\n4. Both YES and NO moving the same pillar in the same direction (e.g. YES: ego +10, NO: ego +8 — one choice is strictly better, the dilemma is false)\n5. Empty prompt, yes_label, or no_label\n6. Very high weight (>15) that could crowd out other cards\n7. Chain target slug set but no flag or condition gating the chain\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "observations", "items": [ { "severity": "warn" | "info", "message": "<specific message>" }, ... ] }\nReturn an empty items array if the card looks good.`
  }
}

export async function POST(request: NextRequest) {
  const body: ClaudeRequest = await request.json()
  const snapshot = await ensureSnapshot()
  const systemPrompt = buildSystemPrompt(snapshot)

  let messages: Anthropic.MessageParam[]

  if (body.messages) {
    // Agentic loop: client passes full Anthropic message array directly
    messages = body.messages as Anthropic.MessageParam[]
  } else {
    messages = []
    if (body.action === 'chat' && body.history?.length) {
      for (const msg of body.history) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: buildUserMessage(body) })
  }

  // Use tools only for chat/agentic loop — not for structured one-shot actions
  const isAgenticCall = body.action === 'chat' || !!body.messages

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: isAgenticCall ? 8096 : 1024,
      system: systemPrompt,
      messages,
      ...(isAgenticCall ? { tools: GAME_TOOLS as Anthropic.Tool[] } : {}),
    })

    // Check for tool use blocks
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
    if (toolUseBlocks.length > 0) {
      const result: ClaudeResponse = {
        action: 'tool_use',
        calls: toolUseBlocks.map(b => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> })),
        assistantContent: response.content,
      }
      return NextResponse.json(result)
    }

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    if (isAgenticCall) {
      const result: ClaudeResponse = { action: 'chat', reply: text }
      return NextResponse.json(result)
    }

    const parsed = JSON.parse(text) as ClaudeResponse
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude call failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run existing tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts app/api/claude/route.ts
git commit -m "feat: extend Claude route to support tool use and game builder system prompt"
```

---

## Task 7: useAgentLoop hook + tests

**Files:**
- Create: `lib/useAgentLoop.ts`
- Test: `lib/__tests__/agent-loop.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/agent-loop.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAgentLoop } from '@/lib/useAgentLoop'

describe('useAgentLoop', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    // suppress jsdom "not implemented" for dispatchEvent
    vi.stubGlobal('window', { ...window, dispatchEvent: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with empty state', () => {
    const { result } = renderHook(() => useAgentLoop())
    expect(result.current.messages).toEqual([])
    expect(result.current.toolProgress).toEqual([])
    expect(result.current.isRunning).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('adds user message immediately and assistant message on text reply', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ action: 'chat', reply: 'Hello back!' }),
      } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Hello')
    })

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hello back!' },
    ])
    expect(result.current.isRunning).toBe(false)
  })

  it('executes tool call and continues the loop', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      // First Claude call → tool_use
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          action: 'tool_use',
          calls: [{ id: 'tu_001', name: 'create_pillars', input: { pillars: [] } }],
          assistantContent: [{ type: 'tool_use', id: 'tu_001', name: 'create_pillars', input: { pillars: [] } }],
        }),
      } as Response)
      // Tool endpoint call
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ created: 4 }),
      } as Response)
      // Second Claude call → text
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ action: 'chat', reply: 'Game built!' }),
      } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Build a game')
    })

    expect(mockFetch).toHaveBeenCalledTimes(3)
    // First call: Claude
    expect(mockFetch.mock.calls[0][0]).toBe('/api/claude')
    // Second call: tool endpoint
    expect(mockFetch.mock.calls[1][0]).toBe('/api/game/pillars')
    // Third call: Claude again with tool results
    expect(mockFetch.mock.calls[2][0]).toBe('/api/claude')

    expect(result.current.messages).toContainEqual({ role: 'assistant', content: 'Game built!' })
    expect(result.current.toolProgress).toHaveLength(1)
    expect(result.current.toolProgress[0].status).toBe('done')
    expect(result.current.toolProgress[0].detail).toBe('4 records')
  })

  it('marks tool as error when endpoint fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          action: 'tool_use',
          calls: [{ id: 'tu_001', name: 'create_pillars', input: {} }],
          assistantContent: [{ type: 'tool_use', id: 'tu_001', name: 'create_pillars', input: {} }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'DB error' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ action: 'chat', reply: 'Had an issue.' }),
      } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Build')
    })

    expect(result.current.toolProgress[0].status).toBe('error')
    expect(result.current.toolProgress[0].detail).toBe('DB error')
  })

  it('reset clears all state', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ action: 'chat', reply: 'Hi' }),
    } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Hello')
    })

    act(() => { result.current.reset() })

    expect(result.current.messages).toEqual([])
    expect(result.current.toolProgress).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test lib/__tests__/agent-loop.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/useAgentLoop'"

- [ ] **Step 3: Create `lib/useAgentLoop.ts`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { TOOL_LABELS, TOOL_ENDPOINTS } from '@/lib/game-builder-tools'
import type { ClaudeResponse } from '@/lib/types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolProgress {
  id: string        // tool_use id — unique per call, even if same tool called twice
  tool: string      // tool name e.g. "create_cards"
  label: string     // human-readable e.g. "Writing cards"
  status: 'running' | 'done' | 'error'
  detail?: string   // "22 records" or error message
}

type AnthropicMessage = { role: 'user' | 'assistant'; content: unknown }

export function useAgentLoop() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [toolProgress, setToolProgress] = useState<ToolProgress[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Internal full Anthropic-format message history for multi-turn context
  const [anthropicHistory, setAnthropicHistory] = useState<AnthropicMessage[]>([])

  const send = useCallback(async (userText: string) => {
    setIsRunning(true)
    setError(null)

    setMessages(prev => [...prev, { role: 'user', content: userText }])

    const nextHistory: AnthropicMessage[] = [
      ...anthropicHistory,
      { role: 'user', content: userText },
    ]
    setAnthropicHistory(nextHistory)

    async function runLoop(history: AnthropicMessage[]) {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', messages: history }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Claude call failed')
      }

      const data: ClaudeResponse = await res.json()

      if (data.action === 'tool_use') {
        // Register all tool calls as "running"
        const newEntries: ToolProgress[] = data.calls.map(call => ({
          id: call.id,
          tool: call.name,
          label: TOOL_LABELS[call.name] ?? call.name,
          status: 'running',
        }))
        setToolProgress(prev => [...prev, ...newEntries])

        // Execute each tool call sequentially
        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []

        for (const call of data.calls) {
          try {
            const endpoint = TOOL_ENDPOINTS[call.name]
            if (!endpoint) throw new Error(`Unknown tool: ${call.name}`)

            const method = call.name === 'validate_game' ? 'POST' : 'POST'
            const toolRes = await fetch(endpoint, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(call.input),
            })

            const result = await toolRes.json()
            if (!toolRes.ok) throw new Error(result.error ?? 'Tool call failed')

            const detail =
              result.created !== undefined ? `${result.created} records`
              : result.ok !== undefined ? (result.ok ? 'No issues' : `${result.errors?.length ?? 0} error(s)`)
              : 'Done'

            setToolProgress(prev =>
              prev.map(p => p.id === call.id ? { ...p, status: 'done', detail } : p)
            )
            toolResults.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: JSON.stringify(result),
            })

            window.dispatchEvent(new Event('game:content-updated'))
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Tool error'
            setToolProgress(prev =>
              prev.map(p => p.id === call.id ? { ...p, status: 'error', detail: msg } : p)
            )
            toolResults.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: `Error: ${msg}`,
            })
          }
        }

        // Append assistant message (with tool_use blocks) + tool results to history
        const nextHistory: AnthropicMessage[] = [
          ...history,
          { role: 'assistant', content: data.assistantContent },
          { role: 'user', content: toolResults },
        ]
        setAnthropicHistory(nextHistory)
        await runLoop(nextHistory)
      } else if (data.action === 'chat') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setAnthropicHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    }

    try {
      await runLoop(nextHistory)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }, [anthropicHistory])

  const reset = useCallback(() => {
    setMessages([])
    setToolProgress([])
    setIsRunning(false)
    setError(null)
    setAnthropicHistory([])
  }, [])

  return { send, messages, toolProgress, isRunning, error, reset }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test lib/__tests__/agent-loop.test.ts
```

Expected: PASS, all tests.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/useAgentLoop.ts lib/__tests__/agent-loop.test.ts
git commit -m "feat: add useAgentLoop hook — client-driven agentic loop for Claude tool use"
```

---

## Task 8: BrainstormFlow component

**Files:**
- Create: `components/BrainstormFlow.tsx`

- [ ] **Step 1: Create `components/BrainstormFlow.tsx`**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAgentLoop, type ToolProgress } from '@/lib/useAgentLoop'

function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const content = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    return (
      <span key={i}>
        {content}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })
}

function ProgressList({ items }: { items: ToolProgress[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1 py-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 text-xs">
          {item.status === 'running' && (
            <span className="text-indigo-400 animate-pulse">⟳</span>
          )}
          {item.status === 'done' && (
            <span className="text-green-400">✓</span>
          )}
          {item.status === 'error' && (
            <span className="text-red-400">✗</span>
          )}
          <span className={
            item.status === 'done' ? 'text-gray-400' :
            item.status === 'error' ? 'text-red-400' :
            'text-white'
          }>
            {item.label}
          </span>
          {item.detail && (
            <span className={item.status === 'error' ? 'text-red-500' : 'text-gray-600'}>
              — {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function BrainstormFlow() {
  const router = useRouter()
  const { send, messages, toolProgress, isRunning, error } = useAgentLoop()
  const [input, setInput] = useState('')
  const [showDashboardBtn, setShowDashboardBtn] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isGenerating = toolProgress.length > 0

  // Synthetic opening message from Claude
  const displayMessages = [
    { role: 'assistant' as const, content: "Let's build your game. What's it about?" },
    ...messages,
  ]

  // Show "Go to dashboard" button 1.5s after generation completes
  useEffect(() => {
    if (isGenerating && !isRunning) {
      const timer = setTimeout(() => setShowDashboardBtn(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [isGenerating, isRunning])

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolProgress])

  function handleSend() {
    const text = input.trim()
    if (!text || isRunning) return
    setInput('')
    send(text)
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center">
      {/* Header */}
      <div className="w-full px-6 py-4 border-b border-gray-800 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          ✦ Game Builder
        </span>
      </div>

      {/* Chat area */}
      <div className="flex-1 w-full max-w-2xl overflow-y-auto px-6 py-4 space-y-3">
        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-indigo-900/40 text-indigo-100 ml-auto text-right'
                : 'bg-gray-800 text-gray-200'
            }`}
          >
            {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
          </div>
        ))}

        {/* Progress list — shows during generation */}
        {toolProgress.length > 0 && (
          <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">
              Building your game
            </p>
            <ProgressList items={toolProgress} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-xs bg-red-900/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Go to dashboard button */}
        {showDashboardBtn && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Go to dashboard →
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area — hidden during generation */}
      {!isGenerating && (
        <div className="w-full max-w-2xl px-6 pb-6 pt-3 shrink-0 border-t border-gray-800">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Describe your game idea…"
              rows={2}
              disabled={isRunning}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-40"
            />
            <button
              onClick={handleSend}
              disabled={isRunning || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg px-4 self-end py-2 text-sm font-medium"
            >
              {isRunning ? '…' : '↑'}
            </button>
          </div>
          <p className="text-xs text-gray-700 mt-1.5">Enter to send · Shift+Enter for newline</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/BrainstormFlow.tsx
git commit -m "feat: add BrainstormFlow full-screen onboarding component"
```

---

## Task 9: Onboarding detection in layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

The layout is a server component. It checks card count and conditionally renders `BrainstormFlow` vs `AppShell`.

Replace the current file with:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import BrainstormFlow from '@/components/BrainstormFlow'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Deck Builder',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hasContent = false
  if (user) {
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
    hasContent = (count ?? 0) > 0
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        {user ? (
          hasContent
            ? <AppShell>{children}</AppShell>
            : <BrainstormFlow />
        ) : (
          children
        )}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Test the onboarding flow manually**

1. In Supabase, delete all rows from the `cards` table (or run `DELETE FROM cards;` in SQL Editor).
2. Open the app in a browser.
3. Confirm you see the BrainstormFlow ("Let's build your game. What's it about?") instead of the dashboard.
4. Re-insert one card via the Supabase dashboard.
5. Refresh. Confirm you now see the normal dashboard.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add onboarding detection — show BrainstormFlow when DB has no cards"
```

---

## Task 10: ClaudePanel chat upgrade

**Files:**
- Modify: `components/ClaudePanel.tsx`

The chat section of `ClaudePanel` currently manages its own history and calls `callClaude({ action: 'chat' })` directly. Replace it with `useAgentLoop`. All other sections (observations, action buttons) are unchanged.

- [ ] **Step 1: Update `components/ClaudePanel.tsx`**

Replace the entire file with:

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import { useAgentLoop, type ToolProgress } from '@/lib/useAgentLoop'
import type { Card, ObservationItem, ICondition, ClaudeRequest, ClaudeResponse } from '@/lib/types'

interface ClaudePanelProps {
  card: Card | null
  cardId: string | null
  width: number
  onPromptUpdate: (text: string) => void
  onYesDeltaUpdate: (deltas: Record<string, number>) => void
  onNoDeltaUpdate: (deltas: Record<string, number>) => void
  onConditionsUpdate: (conditions: ICondition[]) => void
}

type BusyKey = string

function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const content = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    return (
      <span key={i}>
        {content}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })
}

async function callClaude(req: ClaudeRequest): Promise<ClaudeResponse> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Claude call failed')
  }
  return res.json()
}

function CompactProgress({ items }: { items: ToolProgress[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-0.5 px-2 py-1.5 bg-gray-900 rounded border border-gray-700 my-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
          <span className={
            item.status === 'running' ? 'text-indigo-400' :
            item.status === 'done' ? 'text-green-400' : 'text-red-400'
          }>
            {item.status === 'running' ? '⟳' : item.status === 'done' ? '✓' : '✗'}
          </span>
          <span className={item.status === 'error' ? 'text-red-400' : 'text-gray-400'}>
            {item.label}{item.detail ? ` — ${item.detail}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ClaudePanel({
  card,
  cardId,
  width,
  onPromptUpdate,
  onYesDeltaUpdate,
  onNoDeltaUpdate,
  onConditionsUpdate,
}: ClaudePanelProps) {
  const [observations, setObservations] = useState<ObservationItem[]>([])
  const [obsLoading, setObsLoading] = useState(false)
  const [busy, setBusy] = useState<BusyKey | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { send, messages: chatMessages, toolProgress, isRunning: chatRunning, error: chatError, reset: resetChat } = useAgentLoop()

  // Clear chat when card changes
  useEffect(() => {
    resetChat()
    setChatInput('')
  }, [cardId, resetChat])

  // Auto-load observations when card ID changes
  useEffect(() => {
    if (!card) { setObservations([]); return }
    setObsLoading(true)
    setActionError(null)
    callClaude({ action: 'observations', card })
      .then(res => {
        if (res.action === 'observations') setObservations(res.items)
      })
      .catch(err => setActionError(err.message))
      .finally(() => setObsLoading(false))
  }, [cardId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runAction(action: ClaudeRequest['action'], side?: 'yes' | 'no') {
    if (!card) return
    const key = side ? `${action}_${side}` : action
    setBusy(key)
    setActionError(null)
    try {
      const res = await callClaude({ action, card, side })
      if (
        res.action === 'write_prompt' || res.action === 'sharpen_tone' ||
        res.action === 'make_funnier' || res.action === 'shorter'
      ) {
        onPromptUpdate(res.text)
      } else if (res.action === 'suggest_deltas') {
        if (side === 'no') onNoDeltaUpdate(res.deltas)
        else onYesDeltaUpdate(res.deltas)
      } else if (res.action === 'suggest_conditions') {
        onConditionsUpdate(res.conditions)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Claude error')
    } finally {
      setBusy(null)
    }
  }

  function handleSendChat() {
    const text = chatInput.trim()
    if (!text || chatRunning) return
    setChatInput('')
    send(text)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function ActionBtn({
    label,
    action,
    side,
  }: {
    label: string
    action: ClaudeRequest['action']
    side?: 'yes' | 'no'
  }) {
    const key = side ? `${action}_${side}` : action
    const isRunning = busy === key
    return (
      <button
        onClick={() => runAction(action, side)}
        disabled={!!busy || !card || chatRunning}
        className="text-left text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? '…' : label}
      </button>
    )
  }

  const isBusy = !!busy || chatRunning

  return (
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col text-xs overflow-hidden" style={{ width, minWidth: width, flexShrink: 0 }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="font-semibold text-indigo-400">✦ Claude</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-gray-800">

        {/* Observations */}
        <div className="px-3 py-2">
          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mb-1.5">
            Observations{obsLoading && <span className="text-gray-600 normal-case font-normal"> loading…</span>}
          </div>
          {observations.length === 0 && !obsLoading ? (
            <p className="text-gray-700 italic">{card ? 'No issues.' : 'Select a card.'}</p>
          ) : (
            <div className="space-y-1">
              {observations.map((obs, i) => (
                <div
                  key={i}
                  className={`rounded px-2 py-1 leading-snug ${
                    obs.severity === 'warn'
                      ? 'bg-yellow-900/30 text-yellow-300'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {obs.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smart buttons */}
        <div className="px-3 py-2">
          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mb-1.5">
            Prompt
          </div>
          <div className="flex flex-col gap-1.5">
            <ActionBtn label="✦ Write prompt"   action="write_prompt" />
            <ActionBtn label="✦ Sharpen tone"   action="sharpen_tone" />
            <ActionBtn label="✦ Make funnier"   action="make_funnier" />
            <ActionBtn label="✦ Shorter"        action="shorter" />
          </div>

          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mt-3 mb-1.5">
            Deltas
          </div>
          <div className="flex flex-col gap-1.5">
            <ActionBtn label="✦ Suggest YES deltas" action="suggest_deltas" side="yes" />
            <ActionBtn label="✦ Suggest NO deltas"  action="suggest_deltas" side="no" />
          </div>

          <div className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mt-3 mb-1.5">
            Conditions
          </div>
          <div className="flex flex-col gap-1.5">
            <ActionBtn label="✦ Suggest conditions" action="suggest_conditions" />
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col">
          <button
            onClick={() => setChatOpen(o => !o)}
            className="px-3 py-2 text-left text-gray-500 hover:text-gray-300 flex items-center justify-between"
          >
            <span className="uppercase tracking-widest text-[10px] font-semibold">Chat</span>
            <span className="text-gray-600">{chatOpen ? '▲' : '▼'}</span>
          </button>

          {chatOpen && (
            <div className="flex flex-col px-3 pb-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2">
                {chatMessages.length === 0 && toolProgress.length === 0 && (
                  <p className="text-gray-700 italic">Ask Claude anything…</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded px-2 py-1 leading-snug ${
                      msg.role === 'user'
                        ? 'bg-indigo-900/30 text-indigo-200 ml-4'
                        : 'bg-gray-800 text-gray-300 mr-4'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                ))}
                {/* Inline tool progress during chat */}
                <CompactProgress items={toolProgress} />
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-1">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() }
                  }}
                  placeholder="Ask Claude…"
                  disabled={isBusy}
                  className="flex-1 bg-gray-800 text-white rounded px-2 py-1 placeholder-gray-600 focus:outline-none disabled:opacity-40 text-xs"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isBusy || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded px-2 py-1"
                >
                  {chatRunning ? '…' : '↑'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {(actionError || chatError) && (
          <div className="px-3 py-2 text-red-400 bg-red-900/20 shrink-0 leading-snug">
            {actionError || chatError}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test chat in the browser**

1. Open the app with a card selected.
2. Open the Chat section in the Claude panel.
3. Type "How many characters do I have?" — Claude should respond with a text answer.
4. Type "Add a card for the head chef about a spilled sauce" — Claude should call `create_cards`, the progress should show "Writing cards ✓", and the sidebar count should update.

- [ ] **Step 3: Commit**

```bash
git add components/ClaudePanel.tsx
git commit -m "feat: upgrade ClaudePanel chat to use useAgentLoop with tool support"
```

---

## Task 11: Sidebar real-time updates + Settings "Start Over"

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Add `game:content-updated` listener to `components/Sidebar.tsx`**

Add an event listener that re-fetches nav counts when `useAgentLoop` dispatches `game:content-updated`.

Replace the `useEffect` in `Sidebar.tsx` that fetches counts with:

```typescript
useEffect(() => {
  function fetchCounts() {
    fetch('/api/nav-counts').then(r => r.json()).then(setCounts)
  }

  fetchCounts() // initial load

  window.addEventListener('game:content-updated', fetchCounts)
  return () => window.removeEventListener('game:content-updated', fetchCounts)
}, [])
```

The full updated `Sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavCounts {
  cards: number
  characters: number
  pillars: number
  milestones: number
  effects: number
  flags: number
}

const NAV_ITEMS = [
  { href: '/',           label: 'Cards',      countKey: 'cards'      as keyof NavCounts },
  { href: '/characters', label: 'Characters', countKey: 'characters' as keyof NavCounts },
  { href: '/pillars',    label: 'Pillars',    countKey: 'pillars'    as keyof NavCounts },
  { href: '/milestones', label: 'Milestones', countKey: 'milestones' as keyof NavCounts },
  { href: '/effects',    label: 'Effects',    countKey: 'effects'    as keyof NavCounts },
  { href: '/flags',      label: 'Flags',      countKey: 'flags'      as keyof NavCounts },
  { href: '/balance',    label: 'Balance',    countKey: null },
  { href: '/export',     label: 'Export',     countKey: null },
  { href: '/settings',   label: 'Settings',   countKey: null },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [counts, setCounts] = useState<NavCounts | null>(null)

  useEffect(() => {
    function fetchCounts() {
      fetch('/api/nav-counts').then(r => r.json()).then(setCounts)
    }

    fetchCounts()
    window.addEventListener('game:content-updated', fetchCounts)
    return () => window.removeEventListener('game:content-updated', fetchCounts)
  }, [])

  return (
    <nav className="w-[200px] min-w-[200px] bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Deck Builder
        </span>
      </div>

      <ul className="flex-1 py-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          const count = item.countKey && counts ? counts[item.countKey] : null
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-900/40 text-indigo-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.label}</span>
                {count !== null && (
                  <span className="text-xs text-gray-600 tabular-nums">{count}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Add "Start Over" danger zone to `app/settings/page.tsx`**

Replace the entire file with:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [characterBible, setCharacterBible] = useState('')
  const [deckGuide, setDeckGuide] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setCharacterBible(data.character_bible ?? '')
          setDeckGuide(data.deck_guide ?? '')
        }
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_bible: characterBible, deck_guide: deckGuide }),
    })
    await fetch('/api/claude/context', { method: 'POST' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleReset() {
    setResetting(true)
    const res = await fetch('/api/game/reset', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const err = await res.json()
      alert(`Reset failed: ${err.error}`)
      setResetting(false)
      setShowResetModal(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-medium"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
          Character Bible
        </label>
        <p className="text-xs text-gray-600 mb-2">
          Paste your character descriptions, world-building notes, and tone guide here. Claude reads this before every suggestion.
        </p>
        <textarea
          value={characterBible}
          onChange={e => setCharacterBible(e.target.value)}
          rows={12}
          placeholder="Characters, world tone, themes, setting details…"
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
          Deck Guide
        </label>
        <p className="text-xs text-gray-600 mb-2">
          Structural guidance: stage progression, thematic groups, chain patterns, balance targets. Claude uses this to suggest deltas and conditions that fit your deck&apos;s design.
        </p>
        <textarea
          value={deckGuide}
          onChange={e => setDeckGuide(e.target.value)}
          rows={10}
          placeholder="Stage progression, chain patterns, balance rules, thematic clusters…"
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-mono"
        />
      </div>

      {/* Danger zone */}
      <div className="border border-red-900/50 rounded-lg p-4 bg-red-950/10">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-500 mb-3">
          Start over from scratch. This permanently deletes all pillars, characters, cards, effects, milestones, and flags.
        </p>
        <button
          onClick={() => setShowResetModal(true)}
          className="border border-red-700 text-red-400 hover:bg-red-900/30 text-xs px-3 py-1.5 rounded transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-white font-semibold">Delete everything?</h3>
            <p className="text-sm text-gray-400">
              This will permanently delete all pillars, characters, cards, effects, milestones, and flags. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-medium"
              >
                {resetting ? 'Deleting…' : 'Delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.tsx app/settings/page.tsx
git commit -m "feat: sidebar live updates on game:content-updated + settings Start Over button"
```

- [ ] **Step 5: Push**

```bash
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| POST /api/game/pillars | Task 1 |
| POST /api/game/characters | Task 1 |
| POST /api/game/effects | Task 1 |
| POST /api/game/milestones | Task 1 |
| POST /api/game/flags | Task 1 |
| POST /api/game/cards with slug resolution | Task 2 |
| POST /api/game/validate | Task 3 |
| DELETE /api/game/reset | Task 4 |
| GAME_BUILDER_SYSTEM_PROMPT constant | Task 5 |
| GAME_TOOLS + TOOL_LABELS | Task 5 |
| Claude route: pass tools, return tool_use | Task 6 |
| useAgentLoop hook | Task 7 |
| BrainstormFlow full-screen component | Task 8 |
| Opening message auto-injected on mount | Task 8 |
| Progress overlay replaces input during generation | Task 8 |
| "Go to dashboard" button post-generation | Task 8 |
| Onboarding detection (cards count = 0) | Task 9 |
| Dashboard ClaudePanel chat upgrade | Task 10 |
| Compact tool progress in panel chat | Task 10 |
| Sidebar re-fetches on game:content-updated | Task 11 |
| Settings "Start Over" + confirmation modal | Task 11 |

All spec requirements covered.

**Type consistency check:**
- `ToolProgress.id` (Task 7) matches `ToolCall.id` (Task 6) — both are the Anthropic tool_use block id ✓
- `TOOL_ENDPOINTS` in `game-builder-tools.ts` (Task 5) is imported by `useAgentLoop.ts` (Task 7) ✓
- `ClaudeResponse` `tool_use` variant (Task 6) includes `assistantContent: unknown[]` — consumed by hook as `data.assistantContent` (Task 7) ✓
- `BrainstormFlow` imports `useAgentLoop` and `ToolProgress` from `lib/useAgentLoop` (Task 7 → Task 8) ✓
- `ClaudePanel` imports same hook (Task 10) ✓
