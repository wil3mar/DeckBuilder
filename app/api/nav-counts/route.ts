import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  const [cards, characters, pillars, milestones, effects, flags] = await Promise.all([
    supabase.from('cards').select('id', { count: 'exact', head: true }),
    supabase.from('characters').select('id', { count: 'exact', head: true }),
    supabase.from('pillars').select('id', { count: 'exact', head: true }),
    supabase.from('milestones').select('id', { count: 'exact', head: true }),
    supabase.from('effects').select('id', { count: 'exact', head: true }),
    supabase.from('flags').select('id', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    cards:      cards.count      ?? 0,
    characters: characters.count ?? 0,
    pillars:    pillars.count    ?? 0,
    milestones: milestones.count ?? 0,
    effects:    effects.count    ?? 0,
    flags:      flags.count      ?? 0,
  })
}
