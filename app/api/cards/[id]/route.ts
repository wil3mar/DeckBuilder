import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { extractFlagsFromConsequences } from '@/lib/flags'
import type { CardUpdateInput } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const body: CardUpdateInput = await request.json()

  const { data, error } = await supabase
    .from('cards')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Auto-populate flag registry from yes + no consequences
  const allConsequences = [
    ...(body.yes_consequences ?? []),
    ...(body.no_consequences ?? []),
  ]
  const { setFlags, clearFlags } = extractFlagsFromConsequences(allConsequences)
  const slug = data.slug

  await Promise.all([
    ...setFlags.map(name =>
      supabase.rpc('upsert_flag_set_by', { flag_name: name, card_slug: slug })
    ),
    ...clearFlags.map(name =>
      supabase.rpc('upsert_flag_cleared_by', { flag_name: name, card_slug: slug })
    ),
  ])

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { error } = await supabase.from('cards').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
