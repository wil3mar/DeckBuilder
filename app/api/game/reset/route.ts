import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { invalidateSnapshot } from '@/lib/context-cache'

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (body.confirm !== true) {
    return NextResponse.json({ error: 'Must include { "confirm": true } in request body' }, { status: 400 })
  }

  const supabase = createClient()

  // Delete in strict dependency order to avoid FK constraint violations
  const { count: cardCount, error: cardErr } = await supabase
    .from('cards').delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000')
  if (cardErr) return NextResponse.json({ error: cardErr.message }, { status: 500 })

  const { count: milestoneCount, error: msErr } = await supabase
    .from('milestones').delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000')
  if (msErr) return NextResponse.json({ error: msErr.message }, { status: 500 })

  const { count: effectCount, error: effectErr } = await supabase
    .from('effects').delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000')
  if (effectErr) return NextResponse.json({ error: effectErr.message }, { status: 500 })

  const { count: flagCount, error: flagErr } = await supabase
    .from('flags').delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000')
  if (flagErr) return NextResponse.json({ error: flagErr.message }, { status: 500 })

  const { count: charCount, error: charErr } = await supabase
    .from('characters').delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000')
  if (charErr) return NextResponse.json({ error: charErr.message }, { status: 500 })

  const { count: pillarCount, error: pillarErr } = await supabase
    .from('pillars').delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000')
  if (pillarErr) return NextResponse.json({ error: pillarErr.message }, { status: 500 })

  invalidateSnapshot()

  return NextResponse.json({
    deleted: {
      cards: cardCount ?? 0,
      milestones: milestoneCount ?? 0,
      effects: effectCount ?? 0,
      flags: flagCount ?? 0,
      characters: charCount ?? 0,
      pillars: pillarCount ?? 0,
    },
  })
}
