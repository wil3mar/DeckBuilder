# AI Game Builder — Design Spec

**Goal:** Transform the deck builder from a manual editing tool into an AI-powered game creation platform. Claude conducts a creative conversation with a non-technical user and generates a complete, playable card game directly in Supabase — no understanding of game mechanics required.

**Architecture:** Client-driven agentic loop. The Claude API route returns `tool_use` blocks to the frontend. The frontend executes each tool call against batch write endpoints (`/api/game/*`), collects results, and sends `tool_result` turns back to Claude. This avoids serverless timeout constraints and enables real-time progress UI. Both the brainstorm flow and the dashboard Claude panel use the same `useAgentLoop` hook.

---

## 1. Batch API Endpoints (`/api/game/*`)

Seven new Next.js API routes. All use the existing Supabase server client and auth pattern. All accept arrays and upsert (not insert — idempotent on slug).

### POST `/api/game/pillars`
Upserts an array of pillars. Slug is the unique conflict key.

```json
{
  "pillars": [
    {
      "slug": "reviews",
      "display_name": "REVIEWS",
      "start_value": 50,
      "floor": 0,
      "ceiling": 100,
      "is_killer": true,
      "color": "#FFD700",
      "icon": "star",
      "sort_order": 0
    }
  ]
}
```

Returns: `{ created: number, updated: number }`

### POST `/api/game/characters`
Upserts an array of characters. Slug is the unique conflict key.

```json
{
  "characters": [
    {
      "slug": "head_chef",
      "display_name": "The Head Chef",
      "voice": "Volatile, passionate, speaks in kitchen metaphors",
      "motivation": "Wants creative freedom above all else",
      "dynamic": "Your most talented employee and biggest liability",
      "escalation": "Passionate → demanding → threatening to quit → quits → comes back"
    }
  ]
}
```

Returns: `{ created: number, updated: number }`

### POST `/api/game/cards`
Upserts an array of cards in batches of 10–20. Slug is the unique conflict key. The endpoint resolves `character_slug` → `character_id` server-side using a slug lookup — Claude never deals with UUIDs.

```json
{
  "cards": [
    {
      "slug": "chef_tantrum_001",
      "character_slug": "head_chef",
      "thematic": "act1_chef",
      "stage_label": "Act 1",
      "weight": 5,
      "cooldown": "3",
      "conditions": [],
      "prompt": "The Head Chef has thrown a saucepan at the new line cook. The line cook is in the walk-in, crying. The Chef is plating as if nothing happened.",
      "yes_label": "Back the chef",
      "yes_deltas": { "staff_morale": -10, "reviews": 10 },
      "yes_consequences": [],
      "yes_chain_target": null,
      "yes_chain_delay": 0,
      "no_label": "Back the line cook",
      "no_deltas": { "staff_morale": 10, "reviews": -5, "profit": -5 },
      "no_consequences": [],
      "no_chain_target": null,
      "no_chain_delay": 0,
      "notes": null
    }
  ]
}
```

Returns: `{ created: number, updated: number, skipped: string[] }` — `skipped` contains slugs of cards whose `character_slug` could not be resolved. Claude retries skipped cards after verifying character slugs.

### POST `/api/game/effects`
Upserts an array of persistent effects. Slug is the unique conflict key.

```json
{
  "effects": [
    {
      "slug": "health_inspection_pending",
      "title": "Health Inspection Pending",
      "description": "The inspector is coming. Every turn costs you HEALTH SCORE.",
      "duration": 5,
      "per_cycle_deltas": { "health_score": -5 }
    }
  ]
}
```

Returns: `{ created: number, updated: number }`

### POST `/api/game/milestones`
Upserts an array of milestones. Slug is the unique conflict key.

```json
{
  "milestones": [
    {
      "slug": "act2_unlock",
      "title": "Grand Opening",
      "description": "You survived the soft opening.",
      "conditions": [{ "type": "flag", "id": "stage_act1_complete_keep", "negated": false }],
      "achievement": null
    }
  ]
}
```

Returns: `{ created: number, updated: number }`

### POST `/api/game/flags`
Bulk upserts flags. Name is the unique conflict key.

```json
{
  "flags": [
    {
      "name": "chef_threatened_to_quit",
      "description": "The head chef has threatened to quit at least once.",
      "is_keep": false,
      "set_by": ["chef_ultimatum_003"],
      "cleared_by": []
    }
  ]
}
```

Returns: `{ created: number, updated: number }`

### POST `/api/game/validate`
Runs the validation suite and returns structured results. Claude calls this after generation to self-check.

Checks:
- Orphaned flags (set in consequences but never appear in any condition)
- Broken chain targets (slug referenced but no card with that slug exists)
- Pillar coverage (any pillar touched by fewer than 3 cards)
- Character coverage (any character with zero cards)
- Weight-0 cards with no chain target (orphaned chain slots)
- Both YES and NO affecting the same pillar on any card

Returns:
```json
{
  "ok": false,
  "errors": [{ "type": "broken_chain", "message": "Card chef_crisis_003 references chain target chef_crisis_004 which does not exist" }],
  "warnings": [{ "type": "low_coverage", "message": "Pillar 'profit' is only touched by 2 cards" }],
  "stats": {
    "total_cards": 180,
    "cards_per_character": { "head_chef": 22, "health_inspector": 18 },
    "pillar_touch_counts": { "reviews": 45, "staff_morale": 38, "profit": 2 }
  }
}
```

### DELETE `/api/game/reset`
Deletes all game content. Requires `{ "confirm": true }` in the request body to prevent accidental calls. Deletes in order: cards → milestones → effects → flags → characters → pillars. Then invalidates the snapshot cache.

Returns: `{ deleted: { cards: number, characters: number, pillars: number, ... } }`

---

## 2. Claude Tool-Calling Architecture

### Tool definitions — `lib/game-builder-tools.ts`
Exports `GAME_TOOLS`: an array of Anthropic tool definitions (one per `/api/game/*` endpoint). Each definition includes a name, description, and JSON schema matching the endpoint's request body. Claude uses these to know what tools are available and what inputs each expects.

Also exports `TOOL_LABELS`: a `Record<string, string>` mapping tool names to human-readable progress labels used in the UI — e.g. `{ create_cards: "Writing cards", create_pillars: "Creating pillars", validate_game: "Running balance check" }`.

### System prompt — `lib/game-builder-prompt.ts`
Exports `GAME_BUILDER_SYSTEM_PROMPT`: the full system instructions from the spec (game mechanics understanding, balance rules, writing rules, "never explain mechanics to users" rules, tool-calling instructions). This constant is included on every Claude API call from the dashboard — both brainstorm and chat.

### Updated `/api/claude/route.ts`
- Imports `GAME_TOOLS` and `GAME_BUILDER_SYSTEM_PROMPT`
- Passes `tools: GAME_TOOLS` to every `client.messages.create()` call
- Returns the full response to the client (text content + tool_use blocks)
- Accepts `history` for all actions (currently only chat does)
- Response shape extended: alongside the current `ClaudeResponse` union, a new `{ action: 'tool_use', calls: ToolCall[] }` type is returned when Claude wants to call tools

### Frontend hook — `lib/useAgentLoop.ts`
```typescript
interface ToolProgress {
  tool: string     // e.g. "create_cards"
  label: string    // e.g. "Writing Act 1 cards"
  status: 'pending' | 'running' | 'done' | 'error'
  detail?: string  // e.g. "22 cards created"
}

interface AgentLoopResult {
  send: (message: string, history?: ChatMessage[]) => Promise<void>
  messages: ChatMessage[]
  toolProgress: ToolProgress[]
  isRunning: boolean
  error: string | null
}
```

**Loop logic:**
1. POST `/api/claude` with user message + history + current tool progress context
2. If response contains `tool_use` blocks:
   - Mark each tool as `running` in `toolProgress`
   - Call the corresponding `/api/game/*` endpoint
   - Mark as `done` (or `error`)
   - POST `/api/claude` with `tool_results`
   - Repeat from step 2
3. When response is text only: append to `messages`, set `isRunning = false`

Both `BrainstormFlow` and the upgraded `ClaudePanel` use this hook.

---

## 3. Brainstorm UI — `components/BrainstormFlow.tsx`

Full-screen client component. Shown instead of the normal app shell when the database has 0 cards.

### Layout
- Full screen, dark background (`bg-gray-950`)
- Centered column, max-width 640px
- Top: app title / logo area (small, unobtrusive)
- Middle: scrollable chat history
- Bottom: input bar (textarea + send button)

### Chat behavior
- Claude's opening message is injected automatically on mount: *"Let's build your game. What's it about?"*
- User messages appear right-aligned (indigo bubble)
- Claude messages appear left-aligned (gray bubble) with markdown rendering (same `renderMarkdown` as `ClaudePanel`)
- Enter sends, Shift+Enter inserts newline
- Input disabled while `isRunning`

### Progress overlay
When the first tool call fires, the input bar is replaced by a vertical progress list:
```
✓  Pillars created (4 pillars)
✓  Characters created (6 characters)
⟳  Writing Act 1 cards...
   Writing Act 2 cards
   Writing death cards
   Writing crisis cards
   Creating milestones
   Building flag registry
   Running balance check
```
Each row activates when its corresponding tool call starts. Completed rows show a count ("22 cards created"). Error rows show in red with the error message.

### Completion
After the loop ends and Claude returns its final text message:
- Final message renders in the chat
- After 1.5 seconds, a "Go to dashboard →" button fades in
- Clicking it navigates to `/`
- The layout server component will now see cards > 0 and render the normal shell

### No persistence
The brainstorm conversation is not persisted. If the user navigates away mid-conversation, it's lost. On return, if cards exist they see the dashboard; if not, a fresh brainstorm starts.

---

## 4. Onboarding Detection

In `app/layout.tsx` (server component), add a card count query before rendering:

```typescript
const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true })
const hasContent = (count ?? 0) > 0
```

If `user` is authenticated and `hasContent` is false: render `<BrainstormFlow />` directly (full-screen, no AppShell wrapper).
If `user` is authenticated and `hasContent` is true: render `<AppShell>{children}</AppShell>` as today.

This is a server render decision — no client-side redirect, no flash of wrong content.

---

## 5. Dashboard Claude Panel Upgrade

`ClaudePanel` is updated to use `useAgentLoop` for freeform chat. The existing one-shot action buttons (write prompt, sharpen tone, suggest deltas, etc.) remain unchanged — they don't use tool calling.

**Chat upgrade:**
- `sendChat()` uses `useAgentLoop.send()` instead of a direct `callClaude({ action: 'chat' })`
- When tool calls fire during chat (e.g., user asks Claude to add cards), inline progress renders inside the chat panel below the last message — same `ToolProgress` list but compact
- Claude has the same tools available whether the user is in the brainstorm flow or the dashboard

**System prompt:** Both flows use `GAME_BUILDER_SYSTEM_PROMPT`. Claude understands when it's generating fresh vs. refining existing content from the snapshot context.

---

## 6. Real-time Sidebar Updates

When `useAgentLoop` completes a tool call successfully, it dispatches a custom DOM event:
```typescript
window.dispatchEvent(new Event('game:content-updated'))
```

`Sidebar` adds an event listener for `game:content-updated` and re-fetches `/api/nav-counts` when it fires. This updates the card/character/pillar counts in the sidebar in real time as Claude creates content.

No Supabase realtime subscription needed.

---

## 7. Settings "Start Over"

At the bottom of `/app/settings/page.tsx`, a danger zone section:

- Heading: "Danger Zone" (red border/background tint)
- Button: "Start Over" (red, outlined)
- Clicking opens a confirmation modal:
  - Title: "Delete everything?"
  - Body: "This will permanently delete all pillars, characters, cards, effects, milestones, and flags. This cannot be undone."
  - Buttons: "Cancel" + "Delete everything" (red, filled)
- On confirm: calls `DELETE /api/game/reset`, then `router.push('/')`
- The layout will see 0 cards and render the brainstorm flow

---

## Implementation Order

1. Build `/api/game/*` batch endpoints (pillars, characters, cards, effects, milestones, flags, validate, reset)
2. Write `lib/game-builder-prompt.ts` (system prompt constant)
3. Write `lib/game-builder-tools.ts` (Anthropic tool definitions)
4. Update `/api/claude/route.ts` to pass tools and return tool_use blocks
5. Write `lib/useAgentLoop.ts` hook
6. Build `components/BrainstormFlow.tsx`
7. Add onboarding detection to `app/layout.tsx`
8. Upgrade `ClaudePanel` chat to use `useAgentLoop`
9. Add `game:content-updated` event dispatch + Sidebar listener
10. Add "Start Over" danger zone to `/app/settings/page.tsx`

---

## What Does Not Change

- Card editor — unchanged, remains the manual editing layer
- Export pipeline — unchanged
- Balance dashboard — unchanged
- Settings page (character bible, deck guide fields) — new danger zone section added at bottom only
- Existing one-shot Claude action buttons (write prompt, suggest deltas, etc.) — unchanged
