import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const body = await request.json()

  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  const result = existing
    ? await supabase.from('settings').update(body).eq('id', existing.id).select().single()
    : await supabase.from('settings').insert(body).select().single()

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  return NextResponse.json(result.data)
}
