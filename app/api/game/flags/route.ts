import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { flags } = await request.json()

  if (!Array.isArray(flags) || flags.length === 0) {
    return NextResponse.json({ error: 'flags must be a non-empty array' }, { status: 400 })
  }

  // flags table uses 'name' as unique key (not 'slug' like other tables)
  const { data, error } = await supabase
    .from('flags')
    .upsert(flags, { onConflict: 'name' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ created: data?.length ?? 0 })
}
