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
