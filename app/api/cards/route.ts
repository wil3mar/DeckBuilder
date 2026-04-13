import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CardCreateInput } from '@/lib/types'

const LIST_COLUMNS = [
  'id', 'slug', 'character_id', 'thematic', 'stage_label', 'weight',
  'prompt', 'yes_label', 'no_label',
  'yes_chain_target', 'no_chain_target',
  'yes_consequences', 'no_consequences',
].join(', ')

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = request.nextUrl

  let query = supabase
    .from('cards')
    .select(LIST_COLUMNS)
    .order('thematic', { ascending: true })
    .order('slug', { ascending: true })

  const stageLabel = searchParams.get('stage_label')
  const bearer     = searchParams.get('bearer')
  const thematic   = searchParams.get('thematic')
  const hasChain   = searchParams.get('has_chain')
  const missing    = searchParams.get('missing_fields')

  if (stageLabel) query = query.eq('stage_label', stageLabel)
  if (bearer)     query = query.eq('character_id', bearer)
  if (thematic)   query = query.eq('thematic', thematic)
  if (hasChain === 'true') {
    query = query.or('yes_chain_target.not.is.null,no_chain_target.not.is.null')
  }
  if (missing === 'true') {
    query = query.or('prompt.eq.,yes_label.eq.,no_label.eq.')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const body: CardCreateInput = await request.json()

  const { data, error } = await supabase
    .from('cards')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
