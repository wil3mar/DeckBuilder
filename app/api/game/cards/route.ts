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

  const validCards = cards.filter(
    (c: unknown) => c !== null && typeof c === 'object' && typeof (c as { slug?: unknown }).slug === 'string'
  )
  const { resolved, skipped } = resolveCharacterSlugs(validCards, charMap)

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
