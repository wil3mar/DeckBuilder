# Deck Builder — Claude Instructions

## What This Is

A Next.js 14 web app for building and editing narrative card game content (storylets, characters, pillars, etc.) for the Card Game Engine. Uses Supabase for persistence and Claude for AI-assisted content generation.

## Tech Stack

- **Framework:** Next.js 14 App Router (`app/` directory)
- **Database:** Supabase (postgres); client in `lib/supabase/`
- **AI:** Anthropic SDK, Claude tool use via `/api/claude`
- **Styling:** Tailwind CSS
- **Tests:** vitest + @testing-library/react (⚠️ currently broken with Node 22 — see below)

## Running Locally

```bash
npm run dev       # start dev server
npm test          # run tests (broken on Node 22 with vitest@1)
```

## Architecture

### Three-panel layout (main page)
- **Sidebar** (`components/Sidebar.tsx`) — nav with live content counts; listens for `game:content-updated` events to re-fetch
- **Card list / editor** — left panel with card list, right panel with full editor + ClaudePanel
- **ClaudePanel** (`components/ClaudePanel.tsx`) — observations, smart action buttons, and chat powered by `useAgentLoop`

### AI agentic loop
- **`lib/useAgentLoop.ts`** — client-driven loop: sends user message → handles tool_use blocks → POSTs to `/api/game/*` → sends tool_result → loops until Claude returns text. Has AbortController to cancel in-flight requests on reset.
- **`lib/game-builder-tools.ts`** — GAME_TOOLS (Claude function definitions), TOOL_LABELS, TOOL_ENDPOINTS
- **`lib/game-builder-prompt.ts`** — system prompt for game builder / brainstorm mode
- **`components/BrainstormFlow.tsx`** — full-screen onboarding shown when DB has 0 cards; uses useAgentLoop

### API routes
| Route | Purpose |
|---|---|
| `app/api/claude/route.ts` | Main Claude dispatch; supports tool use for game builder |
| `app/api/game/pillars` | Batch upsert pillars |
| `app/api/game/characters` | Batch upsert characters |
| `app/api/game/cards` | Batch upsert cards (resolves character slugs → IDs) |
| `app/api/game/effects` | Batch upsert effects |
| `app/api/game/milestones` | Batch upsert milestones |
| `app/api/game/flags` | Batch upsert flags |
| `app/api/game/validate` | Validation suite (orphaned flags, broken chains, etc.) |
| `app/api/game/reset` | DELETE all game content (requires `{ confirm: true }`) |
| `app/api/nav-counts` | Counts for sidebar nav badges |
| `app/api/settings` | GET/PUT character bible + deck guide |
| `app/api/claude/context` | Invalidate Claude context cache |

### Key lib files
| File | Purpose |
|---|---|
| `lib/types.ts` | Shared TypeScript types |
| `lib/useAgentLoop.ts` | Agentic loop hook |
| `lib/game-validation.ts` | Pure validation functions (testable) |
| `lib/resolve-character-slugs.ts` | Maps character_slug → character_id for cards batch |
| `lib/claude-context.tsx` | Claude context cache (character bible + deck guide) |
| `lib/flags.ts` | Flag extraction from card conditions/consequences |

## Known Issues

- **vitest@1 incompatible with Node 22** — crashes with `ERR_INVALID_PACKAGE_CONFIG`. Either upgrade vitest to v2 or pin Node to 20.x.
- After the 2026-04-13 crash, git object store was manually repaired. The push to GitHub is pending.

## Plan History

All plan docs live in `docs/superpowers/plans/`:
- Plan 1 (Foundation) ✅
- Plan 2 (Claude Integration) ✅
- Plan 3 (Secondary Screens) ✅ (no plan doc — executed inline)
- Plan 4 (AI Game Builder) ✅ — `2026-04-13-ai-game-builder.md`

## After Restart

First thing: `git push origin main` — two commits are waiting to be pushed.
