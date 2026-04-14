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
