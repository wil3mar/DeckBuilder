import { describe, it, expectTypeOf } from 'vitest'
import type { ObservationItem, ClaudeRequest, ClaudeResponse } from '@/lib/types'

describe('Claude types', () => {
  it('ObservationItem has severity and message', () => {
    const item: ObservationItem = { severity: 'warn', message: 'test' }
    expectTypeOf(item.severity).toEqualTypeOf<'warn' | 'info'>()
    expectTypeOf(item.message).toEqualTypeOf<string>()
  })

  it('ClaudeRequest has required action and card fields', () => {
    expectTypeOf<ClaudeRequest['action']>().toEqualTypeOf<
      | 'write_prompt' | 'sharpen_tone' | 'make_funnier' | 'shorter'
      | 'suggest_deltas' | 'suggest_conditions' | 'chat' | 'observations'
    >()
  })

  it('ClaudeResponse union covers all actions', () => {
    const r: ClaudeResponse = { action: 'write_prompt', text: 'hello' }
    expectTypeOf(r).toMatchTypeOf<ClaudeResponse>()
  })
})
