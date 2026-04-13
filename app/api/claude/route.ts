import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getSnapshot } from '@/lib/context-cache'
import type { ClaudeRequest, ClaudeResponse } from '@/lib/types'
import type { GameStateSnapshot } from '@/lib/context-cache'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(snapshot: GameStateSnapshot | null): string {
  if (!snapshot) return 'You are a narrative card game design assistant.'

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

  return `You are an expert narrative card game designer and writing assistant. You are helping the user author cards for a swipe-based narrative strategy game.

## Game System
Players swipe YES or NO on cards presented by characters. Each choice modifies resource pillars. If any pillar hits its floor or ceiling the run ends. Flags persist state across the game.

## Resource Pillars
${pillarList || '  (none defined yet)'}

## Characters
${charList || '  (none defined yet)'}

## Stage Labels (organizational — not exported to game engine)
${stageList}

## Flag Registry
${flagList}

${snapshot.character_bible ? `## Character Bible\n${snapshot.character_bible}\n` : ''}
${snapshot.deck_guide ? `## Deck Guide\n${snapshot.deck_guide}\n` : ''}

## Response Rules
- Always respond with valid JSON matching the schema specified in the user message.
- Never wrap JSON in markdown code blocks.
- Keep prompt text in the present tense, second-person POV (the character speaks to the player).
- Prompt text should be 2-4 sentences max.
- Delta suggestions should be integers within pillar ranges. Never suggest the same pillar on both YES and NO sides — that wastes a card.
- Condition suggestions should use only pillar slugs and flag names that already exist in the registry.`
}

function cardSummary(card: ClaudeRequest['card']): string {
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
  const card = cardSummary(req.card)

  switch (req.action) {
    case 'write_prompt':
      return `Write a prompt for this card. The bearer is presenting a situation to the player. Make it specific, atmospheric, and leave the outcome genuinely ambiguous.

Current card:
${card}

Respond with JSON: { "action": "write_prompt", "text": "<prompt text>" }`

    case 'sharpen_tone':
      return `Sharpen the tone of this prompt. Keep the meaning but make it more vivid and on-brand for the bearer's voice. Do not change the fundamental situation.

Current card:
${card}

Respond with JSON: { "action": "sharpen_tone", "text": "<improved prompt text>" }`

    case 'make_funnier':
      return `Make this prompt funnier. Keep the situation intact but add wit, irony, or absurdity appropriate to the game's tone. Don't undermine the stakes.

Current card:
${card}

Respond with JSON: { "action": "make_funnier", "text": "<funnier prompt text>" }`

    case 'shorter':
      return `Condense this prompt to its essentials. Target 1-2 punchy sentences. Preserve the core tension and the YES/NO choice clarity.

Current card:
${card}

Respond with JSON: { "action": "shorter", "text": "<condensed prompt text>" }`

    case 'suggest_deltas': {
      const side = req.side ?? 'yes'
      const oppositeSide = side === 'yes' ? 'no' : 'yes'
      const oppositeDeltas = side === 'yes' ? req.card.no_deltas : req.card.yes_deltas
      return `Suggest pillar deltas for the ${side.toUpperCase()} choice on this card.

Rules:
- Suggest 1-3 pillars. Fewer is better — every delta should feel meaningful.
- Do NOT suggest pillars already used on the ${oppositeSide.toUpperCase()} side: ${JSON.stringify(Object.keys(oppositeDeltas))}
- Values should be reasonable integers (typically ±5 to ±20). Dramatic swings need strong narrative justification.
- Reflect the ${side === 'yes' ? 'accepting/agreeing' : 'refusing/declining'} direction of the choice.

Current card:
${card}

Respond with JSON: { "action": "suggest_deltas", "deltas": { "<pillar_slug>": <integer>, ... } }`
    }

    case 'suggest_conditions':
      return `Suggest preconditions for this card. These control when the card is eligible to appear.

Rules:
- Only use pillar slugs and flag names that already exist in the registry.
- 1-2 conditions is usually enough. More than 3 makes the card too restrictive.
- Consider what narrative state would make this card feel earned or timely.

Current card:
${card}

Respond with JSON: { "action": "suggest_conditions", "conditions": [ <ICondition objects> ] }

ICondition shapes:
- { "type": "flag", "id": "<flag_name>", "negated": false }
- { "type": "resource", "id": "<pillar_slug>", "op": ">", "value": 50 }
- { "type": "counter", "id": "<counter_name>", "op": ">", "value": 0 }
- { "type": "entity", "id": "<character_slug>" }
- { "type": "temporal", "field": "cycle", "op": ">", "value": 5 }`

    case 'chat':
      return req.message ?? 'Hello'

    case 'observations':
      return `Review this card and return observations about potential design issues. Be concise and specific.

Check for:
1. Cards where only one side affects any pillars (asymmetric coverage often feels unfair)
2. Weight 0 with no chain target set (orphaned chain slot)
3. Flags set by consequences that never appear in any condition in the flag registry (check the Flag Registry above)
4. Both YES and NO affecting the same pillar (wasted card — players just pick the better delta)
5. Empty prompt, yes_label, or no_label
6. Very high weight (>15) that could crowd out other cards
7. Chain target slug set but no flag or condition gating the chain

Current card:
${card}

Respond with JSON: { "action": "observations", "items": [ { "severity": "warn" | "info", "message": "<specific message>" }, ... ] }
Return an empty items array if the card looks good.`
  }
}

export async function POST(request: NextRequest) {
  const body: ClaudeRequest = await request.json()
  const snapshot = getSnapshot()
  const systemPrompt = buildSystemPrompt(snapshot)

  const messages: Anthropic.MessageParam[] = []

  // For chat, include prior history
  if (body.action === 'chat' && body.history?.length) {
    for (const msg of body.history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: buildUserMessage(body) })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Chat returns plain text — wrap it
    if (body.action === 'chat') {
      const result: ClaudeResponse = { action: 'chat', reply: text }
      return NextResponse.json(result)
    }

    // All other actions return JSON from Claude
    const parsed = JSON.parse(text) as ClaudeResponse
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude call failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
