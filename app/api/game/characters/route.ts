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
