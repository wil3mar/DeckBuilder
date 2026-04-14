import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ensureSnapshot } from '@/lib/build-snapshot'
import { GAME_BUILDER_SYSTEM_PROMPT } from '@/lib/game-builder-prompt'
import { GAME_TOOLS } from '@/lib/game-builder-tools'
import type { ClaudeRequest, ClaudeResponse } from '@/lib/types'
import type { GameStateSnapshot } from '@/lib/context-cache'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(snapshot: GameStateSnapshot | null): string {
  if (!snapshot) return GAME_BUILDER_SYSTEM_PROMPT

  const pillarList = snapshot.pillars
    .map(p => `  - ${p.display_name} (slug: ${p.slug}, range: ${p.floor}–${p.ceiling}, avg YES Δ: ${p.yes_avg_delta}, avg NO Δ: ${p.no_avg_delta})`)
    .join('\n')

  const charList = snapshot.characters
    .map(c => `  - ${c.display_name} (slug: ${c.slug}, cards: ${c.card_count})\n    Voice: ${c.voice}\n    Motivation: ${c.motivation}\n    Dynamic: ${c.dynamic}`)
    .join('\n')

  const flagList = snapshot.flags.length > 0
    ? snapshot.flags.map(f => `  - ${f.name} (set by: [${f.set_by.join(', ')}], cleared by: [${f.cleared_by.join(', ')}])`).join('\n')
    : '  (none yet)'

  const stageList = snapshot.stage_labels.length > 0
    ? snapshot.stage_labels.join(', ')
    : '(none defined)'

  return `${GAME_BUILDER_SYSTEM_PROMPT}

---

## Current Game State

### Resource Pillars
${pillarList || '  (none defined yet)'}

### Characters
${charList || '  (none defined yet)'}

### Stage Labels
${stageList}

### Flag Registry
${flagList}

${snapshot.character_bible ? `### Character Bible\n${snapshot.character_bible}\n` : ''}${snapshot.deck_guide ? `### Deck Guide\n${snapshot.deck_guide}\n` : ''}
## Response Rules
- For ALL actions except 'chat': respond with valid JSON matching the schema in the user message. Never wrap JSON in markdown code blocks.
- For the 'chat' action: respond with plain conversational text. No JSON. Markdown formatting (bold, bullet lists) is fine and encouraged for readability.
- Keep prompt text in the present tense, second-person POV (the character speaks to the player).
- Prompt text should be 2-4 sentences max.
- Delta suggestions should be integers within pillar ranges. Never suggest the same pillar on both YES and NO sides — that wastes a card.
- Condition suggestions should use only pillar slugs and flag names that already exist in the registry.`
}

function cardSummary(card: NonNullable<ClaudeRequest['card']>): string {
  return JSON.stringify({
    slug: card.slug,
    thematic: card.thematic,
    stage_label: card.stage_label,
    weight: card.weight,
    conditions: card.conditions,
    prompt: card.prompt,
    yes_label: card.yes_label,
    yes_deltas: card.yes_deltas,
    yes_consequences: card.yes_consequences,
    yes_chain_target: card.yes_chain_target,
    no_label: card.no_label,
    no_deltas: card.no_deltas,
    no_consequences: card.no_consequences,
    no_chain_target: card.no_chain_target,
  }, null, 2)
}

function buildUserMessage(req: ClaudeRequest): string {
  if (req.action === 'chat') return req.message ?? 'Hello'

  if (!req.card) throw new Error(`Action '${req.action}' requires a card but none was provided`)
  const card = cardSummary(req.card)

  switch (req.action) {
    case 'write_prompt':
      return `Write a prompt for this card. The bearer is presenting a situation to the player. Make it specific, atmospheric, and leave the outcome genuinely ambiguous.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "write_prompt", "text": "<prompt text>" }`

    case 'sharpen_tone':
      return `Sharpen the tone of this prompt. Keep the meaning but make it more vivid and on-brand for the bearer's voice. Do not change the fundamental situation.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "sharpen_tone", "text": "<improved prompt text>" }`

    case 'make_funnier':
      return `Make this prompt funnier. Keep the situation intact but add wit, irony, or absurdity appropriate to the game's tone. Don't undermine the stakes.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "make_funnier", "text": "<funnier prompt text>" }`

    case 'shorter':
      return `Condense this prompt to its essentials. Target 1-2 punchy sentences. Preserve the core tension and the YES/NO choice clarity.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "shorter", "text": "<condensed prompt text>" }`

    case 'suggest_deltas': {
      const side = req.side ?? 'yes'
      const oppositeSide = side === 'yes' ? 'no' : 'yes'
      const oppositeDeltas = side === 'yes' ? req.card!.no_deltas : req.card!.yes_deltas
      return `Suggest pillar deltas for the ${side.toUpperCase()} choice on this card.\n\nRules:\n- Suggest 1-3 pillars. Fewer is better — every delta should feel meaningful.\n- Do NOT suggest pillars already used on the ${oppositeSide.toUpperCase()} side: ${JSON.stringify(Object.keys(oppositeDeltas))}\n- Values should be reasonable integers (typically ±5 to ±20). Dramatic swings need strong narrative justification.\n- Reflect the ${side === 'yes' ? 'accepting/agreeing' : 'refusing/declining'} direction of the choice.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "suggest_deltas", "deltas": { "<pillar_slug>": <integer>, ... } }`
    }

    case 'suggest_conditions':
      return `Suggest preconditions for this card. These control when the card is eligible to appear.\n\nRules:\n- Only use pillar slugs and flag names that already exist in the registry.\n- 1-2 conditions is usually enough. More than 3 makes the card too restrictive.\n- Consider what narrative state would make this card feel earned or timely.\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "suggest_conditions", "conditions": [ <ICondition objects> ] }\n\nICondition shapes:\n- { "type": "flag", "id": "<flag_name>", "negated": false }\n- { "type": "resource", "id": "<pillar_slug>", "op": ">", "value": 50 }\n- { "type": "counter", "id": "<counter_name>", "op": ">", "value": 0 }\n- { "type": "entity", "id": "<character_slug>" }\n- { "type": "temporal", "field": "cycle", "op": ">", "value": 5 }`

    case 'observations':
      return `Review this card and return observations about potential design issues. Be concise and specific.\n\nCheck for:\n1. Cards where only one side affects any pillars (asymmetric coverage often feels unfair)\n2. Weight 0 with no chain target set (orphaned chain slot)\n3. Flags set by consequences that never appear in any condition in the flag registry (check the Flag Registry above)\n4. Both YES and NO moving the same pillar in the same direction (e.g. YES: ego +10, NO: ego +8 — one choice is strictly better, the dilemma is false)\n5. Empty prompt, yes_label, or no_label\n6. Very high weight (>15) that could crowd out other cards\n7. Chain target slug set but no flag or condition gating the chain\n\nCurrent card:\n${card}\n\nRespond with JSON: { "action": "observations", "items": [ { "severity": "warn" | "info", "message": "<specific message>" }, ... ] }\nReturn an empty items array if the card looks good.`
  }
}

export async function POST(request: NextRequest) {
  const body: ClaudeRequest = await request.json()
  const snapshot = await ensureSnapshot()
  const systemPrompt = buildSystemPrompt(snapshot)

  let messages: Anthropic.MessageParam[]

  if (body.messages) {
    // Agentic loop: client passes full Anthropic message array directly
    messages = body.messages as Anthropic.MessageParam[]
  } else {
    messages = []
    if (body.action === 'chat' && body.history?.length) {
      for (const msg of body.history) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: buildUserMessage(body) })
  }

  // Use tools only for chat/agentic loop — not for structured one-shot actions
  const isAgenticCall = body.action === 'chat' || !!body.messages

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: isAgenticCall ? 8096 : 1024,
      system: systemPrompt,
      messages,
      ...(isAgenticCall ? { tools: GAME_TOOLS as Anthropic.Tool[] } : {}),
    })

    // Check for tool use blocks
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
    if (toolUseBlocks.length > 0) {
      const result: ClaudeResponse = {
        action: 'tool_use',
        calls: toolUseBlocks.map(b => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> })),
        assistantContent: response.content,
      }
      return NextResponse.json(result)
    }

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    if (isAgenticCall) {
      const result: ClaudeResponse = { action: 'chat', reply: text }
      return NextResponse.json(result)
    }

    const parsed = JSON.parse(text) as ClaudeResponse
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude call failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
