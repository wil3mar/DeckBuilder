import { NextResponse } from 'next/server'
import { ensureSnapshot } from '@/lib/build-snapshot'
import { invalidateSnapshot } from '@/lib/context-cache'

export async function GET() {
  const snapshot = await ensureSnapshot()
  return NextResponse.json(snapshot)
}

// POST: invalidate cache (called after card saves and settings saves)
export async function POST() {
  invalidateSnapshot()
  return new Response(null, { status: 204 })
}
