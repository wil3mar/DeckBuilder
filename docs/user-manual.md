# Deck Builder — User Manual

A tool for authoring narrative card game content: cards, characters, resource pillars, flags, effects, and milestones.

---

## Table of Contents

1. [Setup Order](#1-setup-order)
2. [Navigation](#2-navigation)
3. [Pillars](#3-pillars)
4. [Characters](#4-characters)
5. [Cards](#5-cards)
   - [Card List](#51-card-list)
   - [Card Editor](#52-card-editor)
   - [Conditions](#53-conditions)
   - [Choices: YES and NO](#54-choices-yes-and-no)
   - [Deltas](#55-deltas)
   - [Consequences](#56-consequences)
   - [Chains](#57-chains)
6. [Claude Panel](#6-claude-panel)
7. [Effects](#7-effects)
8. [Milestones](#8-milestones)
9. [Flags](#9-flags)
10. [Settings](#10-settings)
11. [Concepts Reference](#11-concepts-reference)

---

## 1. Setup Order

Some data must exist before other data can reference it. Follow this order on a new project:

1. **Pillars** — Define your resource stats first. Cards need pillars to assign deltas.
2. **Characters** — Create your cast. Cards need characters to assign a presenter.
3. **Effects** — Create any persistent modifiers your cards will apply (optional, can be done later).
4. **Cards** — Build the card library.
5. **Milestones** — Define unlock conditions last, after cards and flags exist to reference.

You can return to any page at any time to add or edit content.

---

## 2. Navigation

The left sidebar has links to every section. The main content area changes based on which page is active. You must be logged in — the login page appears if your session has expired.

| Page | Purpose |
|---|---|
| Cards (home) | The main authoring workspace |
| Characters | Cast management |
| Pillars | Resource stat configuration |
| Effects | Persistent per-cycle modifiers |
| Milestones | Achievement definitions |
| Flags | Flag registry and cross-reference |
| Settings | Claude context documents |

---

## 3. Pillars

Pillars are the resource stats that drive the game — Treasury, Morale, Reputation, etc. Cards push and pull pillar values through deltas. A pillar breaching its floor or ceiling (if it is a killer pillar) ends the run.

**Fields:**

| Field | Description |
|---|---|
| Slug | Machine identifier used in conditions and deltas. Use `snake_case`. Cannot be changed after cards reference it. |
| Display Name | Player-facing label shown in the game UI. |
| Start Value | Value at the beginning of each run (0–100). |
| Floor | Minimum value (default 0). Breaching this triggers death on killer pillars. |
| Ceiling | Maximum value (default 100). Breaching this triggers death on killer pillars. |
| Color | Hex color used to tint this pillar's delta chips in the card editor. |
| Icon slug | Identifier for the pillar's icon sprite. |
| Sort Order | Display order of pillars in the game UI (lower = first). |
| Killer pillar | If checked, the run ends when this pillar breaches floor or ceiling. |

**Tip:** Set up all your pillars before building any cards. The card editor's delta system pulls from the pillars list.

---

## 4. Characters

Characters are the entities who present cards to the player. Each card can be assigned one character as its presenter.

**Fields:**

| Field | Description |
|---|---|
| Slug | Machine identifier. Used in entity conditions and consequences. |
| Display Name | The name shown in the game. |
| Voice | A few sentences describing how this character speaks — their diction, cadence, verbal tics. Claude reads this when writing or editing prompts for cards assigned to this character. |
| Motivation | What this character wants and why. Used by Claude for tonal alignment. |
| Dynamic | How this character relates to the player — ally, adversary, neutral, etc. |
| Escalation | How this character's behavior changes over time or under pressure. |
| Portrait URL | Path or URL to the character's portrait sprite. |

**Deleting a character:** Cards that reference this character will have their character field cleared. You will be warned before deletion.

---

## 5. Cards

The Cards page is the primary workspace. It has three panels:

```
[ Card List ] [ Card Editor                    ] [ ✦ Claude ]
  220px fixed   flex-1, scrollable                220px fixed
```

### 5.1 Card List

The left panel lists all cards with filter controls at the top.

**Filters:**
- **Stage** — Filter to cards assigned a specific stage label. (Stage labels are defined in Settings.)
- **Character** — Filter to cards assigned a specific character.
- **Thematic** — Filter by thematic group slug (partial match).
- **Has chain** — Show only cards with a chain target on either choice.
- **Missing fields** — Show only cards missing critical data (no prompt, no deltas on either side, no slug).

**Icons in the list:**
- `⛓` — This card is chain-only (weight = 0). It will never be drawn randomly; it only appears when explicitly chained from another card.
- `⚡` — This card is auto-fire (weight = −1). It fires automatically whenever its conditions pass, bypassing the normal draw.

Click any card to load it into the editor. Click **+ New card** at the bottom to start a blank card.

### 5.2 Card Editor

The center panel. Fields appear in this order from top to bottom:

**Header row (sticky):**
- **Slug** — The unique machine identifier for this card (e.g., `border_threat_01`). Required to save. Use `snake_case`. This is how other cards reference this card in chain targets.
- **Stage** — Dropdown populated from your stage labels in Settings. Optional grouping for act/chapter structure.
- **Save** — Saves the current card. Disabled until a slug is entered.

**Metadata row:**
- **Character** — Which character presents this card. Populated from the Characters page.
- **Weight** — Draw probability relative to other cards in the active pool.
  - `5` is a normal card.
  - `0` = chain-only (never drawn randomly).
  - `−1` = auto-fire (fires automatically when conditions pass).
  - Higher values increase draw frequency.
- **Cooldown** — How long before this card can be drawn again after it fires. Accepts:
  - A number: cycles to wait (e.g., `3` = unavailable for 3 cycles after firing).
  - `run` = fires at most once per run.
  - `permanent` = fires once, ever. Consumed permanently.
  - Leave blank for no cooldown.
- **Thematic** — A free-text group slug (e.g., `war_arc`, `financial_crisis`). Used for audio/visual grouping in the game engine and for filtering in the card list.

**Conditions** — See [Section 5.3](#53-conditions).

**Prompt** — The narrative text shown to the player. Write this in the voice of the assigned character, presenting a situation that requires a binary choice.

Below the prompt field, four inert `✦` shortcut links show the available Claude actions. The actual buttons that trigger Claude are in the Claude Panel on the right.

**YES / NO columns** — See [Section 5.4](#54-choices-yes-and-no).

**Notes** — Internal notes for authors. Not exported or shown in the game.

### 5.3 Conditions

Conditions gate when a card is eligible for the draw pool. All conditions must pass simultaneously for the card to be considered. A card with no conditions is always eligible (subject to cooldown and weight).

Click **+ add** below the condition tags to open the condition builder.

**Condition types:**

| Type | What it checks | Example |
|---|---|---|
| **Flag** | Whether a flag is set (or not set, if negated) | `war_declared` is set |
| **Resource** | Whether a pillar value passes a comparison | `treasury > 30` |
| **Counter** | Whether a named counter passes a comparison | `crises_survived >= 3` |
| **Entity** | Whether a character is currently active in the roster | `The General` is active |
| **Temporal** | Current cycle count or dynasty (run) count | `cycle > 10` |

**Operators available for Resource, Counter, Temporal:** `>`, `<`, `=`, `>=`, `<=`

**Flag negation:** Check the "negated" box to make the condition pass when the flag is *absent* (e.g., "fire this card only if `war_declared` is NOT set").

Each condition appears as a colored tag. Click the `×` on a tag to remove it.

**Condition colors:**
- Purple = flag
- Red = resource
- Orange = counter
- Blue = entity
- Gray = temporal

### 5.4 Choices: YES and NO

Each card has two choices presented side by side. The green column is YES (right swipe); the red column is NO (left swipe).

**Per-choice fields:**

| Field | Description |
|---|---|
| Action label | Short verb shown on the swipe affordance (e.g., "Agree", "Refuse"). If blank, the game uses a default. |
| Deltas | Pillar value changes when this choice is made. See [Section 5.5](#55-deltas). |
| Consequences | Structured game-state changes beyond pillar deltas. See [Section 5.6](#56-consequences). |
| Chain target | Slug of the next card to force-show after this choice. See [Section 5.7](#57-chains). |
| Chain delay | Cycles to wait before the chained card fires (0 = immediately next cycle). Only visible after a chain target is entered. |
| Feedback text | Brief narrative text shown briefly after the player commits this choice. Optional. |

### 5.5 Deltas

Deltas are pillar value changes applied when a choice is made. A positive delta raises the pillar; negative lowers it.

**Adding a delta:** Click the **+ pillar** dropdown in the YES or NO column and select a pillar. A chip appears showing `0`.

**Editing a delta:** Click the value on a chip to edit it. Type a number and press Enter or click away.

**Range deltas:** Type `5~15` to set a randomized range. The game engine will pick a random value between 5 and 15 when the card resolves.

**Removing a delta:** Click `×` on the chip.

Delta chips are colored with the pillar's configured color for easy scanning.

### 5.6 Consequences

Consequences are structured commands that fire after deltas when a choice is committed. They modify game state beyond pillar values.

Click **+ add consequence** to open the consequence builder. Select a type and fill in the required fields, then click Add.

**Consequence types:**

| Type | Effect |
|---|---|
| `+flag` | Sets a flag (adds it to the game state). |
| `-flag` | Clears a flag (removes it). |
| `counter++` | Increments a named counter by a specified amount. |
| `+entity` | Adds a character to the active roster (they start presenting cards). |
| `-entity` | Removes a character from the active roster. |
| `apply modifier` | Activates a persistent effect (by effect slug). The effect's per-cycle deltas begin applying immediately. |
| `remove modifier` | Deactivates a persistent effect by slug. |
| `chain →` | Forces a specific card next (by slug), with optional delay in cycles. Same as the chain target fields above but as an explicit consequence. |

Flags created by `+flag` consequences are automatically registered in the Flag Registry when the card is saved.

**Note:** Consequences execute in the order they are listed. Order can matter if one consequence depends on another (e.g., setting a flag that is later checked).

### 5.7 Chains

A chain forces a specific card to appear after a choice is made, bypassing the normal draw pool. Use chains to create scripted sequences — a multi-card story beat, a debate, a crisis arc.

- Enter the **slug** of the target card in the Chain target field.
- Set **Chain delay** to `0` for the chained card to appear on the very next cycle.
- Set a higher delay (e.g., `3`) to have the chained card fire after N normal cycles. This creates a "time bomb" — the consequence is coming, but the player sees other cards first.

A chain-only card (weight = 0) will only ever appear via a chain. It never enters the random draw pool.

**Chains are one-way.** The chained card does not know it was chained from. If you want a card sequence to loop or branch, wire the chain targets on both choices of the chained card.

---

## 6. Claude Panel

The right panel (`✦ Claude`) provides AI assistance for the currently selected card. It reads the full card state (prompt, deltas, conditions, character, your character bible and deck guide from Settings) before making any suggestion.

### Observations

When you select a card, Claude automatically analyzes it and lists any issues or notes. Observations appear as colored pills:

- **Yellow** = warning (e.g., "YES and NO deltas are nearly identical — consider differentiating outcomes", "Prompt references a character not assigned as bearer")
- **Gray** = informational

Observations reload when you select a different card. They do not reload on every keystroke.

### Prompt Actions

| Button | Effect |
|---|---|
| **✦ Write prompt** | Generates a full prompt from scratch, using the character's voice and the card's assigned stage/thematic context. Replaces the current prompt. |
| **✦ Sharpen tone** | Rewrites the existing prompt to be more vivid and character-specific without changing the situation. |
| **✦ Make funnier** | Adds levity while keeping the core scenario intact. |
| **✦ Shorter** | Trims the prompt to the essentials. |

All prompt actions replace the content of the Prompt field directly. You can undo by typing or clicking the action again to regenerate.

### Delta Suggestions

| Button | Effect |
|---|---|
| **✦ Suggest YES deltas** | Suggests pillar changes that fit the YES choice, given the prompt and game context. Merges into existing deltas — does not clear them first. |
| **✦ Suggest NO deltas** | Same, for the NO choice. |

Suggested deltas are added to the existing delta map. If a pillar already has a delta set, the suggestion overwrites it for that pillar.

### Condition Suggestions

**✦ Suggest conditions** — Suggests preconditions that make narrative sense for this card (e.g., "this card should probably only appear after the war has started"). Suggested conditions are appended to the existing list — they do not replace conditions you have already set.

### Chat

Click **Chat** to expand the chat drawer. Ask Claude anything about the card:

- "Why does this card feel flat?"
- "What would make the NO outcome feel more punishing without touching Treasury?"
- "Does this chain make narrative sense after `border_threat_01`?"

The chat history is scoped to the current card and clears when you switch to a different card. Press Enter (without Shift) to send. The chat maintains conversation context within a session.

**All Claude actions are disabled when no card is selected.** Select or create a card first.

---

## 7. Effects

Effects are persistent modifiers that apply pillar deltas every cycle while active. A card consequence (`apply modifier`) activates an effect; another card's consequence (`remove modifier`) or the effect's own duration can deactivate it.

**Fields:**

| Field | Description |
|---|---|
| Slug | Machine identifier. Used in `apply modifier` and `remove modifier` consequences. |
| Title | Short display name shown to the player while the effect is active. |
| Description | Flavor text explaining what the effect represents. |
| Duration | How many cycles the effect lasts. `-1` = indefinite (active until explicitly removed or its associated flag is cleared). |
| Per-Cycle Deltas | Pillar changes applied each cycle. Click **+ add pillar** to add a pillar, then enter the delta value (positive or negative). |

**Example:** An effect called `war_economy` with `treasury: −5, morale: −3` and duration `−1` would drain Treasury and Morale every cycle until a card removes it.

---

## 8. Milestones

Milestones are one-time achievements that unlock when their conditions pass at the end of a cycle. Once unlocked, they persist across runs forever. Milestones can gate content — a storylet requiring a milestone flag only becomes eligible after that milestone is earned.

**Fields:**

| Field | Description |
|---|---|
| Slug | Machine identifier. Also the flag name set in global state when this milestone unlocks. |
| Title | Achievement title shown to the player. |
| Description | Flavor text shown when the milestone unlocks. |
| Unlock Conditions | All conditions must be true simultaneously at cycle end. Uses the same condition types as cards (flag, resource, counter, entity, temporal). |
| Achievement text | Optional extra text shown at unlock — e.g., "Unlocks the Endgame storylet pack." |

Milestone conditions are evaluated the same way as card conditions. You can gate a milestone on a combination of flags, pillar values, counters, cycle count, and dynasty count.

---

## 9. Flags

Flags are boolean state: set (true) or not set (false). They are the primary mechanism for tracking story progress, unlocking content, and gating card conditions.

**The Flag Registry** shows all flags that exist in the system, along with which cards set them and which cards clear them.

### How Flags Are Created

Flags are **auto-created** when you save a card that has a `+flag` or `-flag` consequence. You don't need to pre-register flags — save the card and the flag appears in the registry.

You can also create flags manually using the name input and **+ Add** button at the top of the Flags page (e.g., if you want to document a flag before the card that sets it is built).

### Flag Fields

| Field | Description |
|---|---|
| Name | The flag identifier. Must be `snake_case`. Cannot contain spaces. |
| Description | A note about what this flag represents. Visible only in the deck builder. |
| Persists across resets | If checked (or if the name ends in `_keep`), this flag is not cleared when the player dies and the run resets. Use sparingly — for dynasty-level progression only. |

### _keep Flags

Any flag whose name ends in `_keep` automatically persists across resets. This is enforced by convention in the game engine. The is-keep checkbox in the flag editor reflects this but can be set independently. If a flag name ends in `_keep`, the checkbox is pre-checked when the flag is created.

### Cross-References

Each flag row shows:
- **Set by** — Cards that have a `+flag` consequence for this flag (green).
- **Cleared by** — Cards that have a `-flag` consequence for this flag (red).
- **Not referenced** — Flag exists but no card sets or clears it. May indicate a flag used only as a condition gate (set elsewhere in the engine) or an orphaned flag that can be deleted.

### Search and Edit

Use the search bar to filter by name or description. Click a flag row to expand it and edit the description or _keep toggle. Click **Save** when a flag has unsaved changes.

### Deleting Flags

The `×` button deletes a flag from the registry. This does not remove references to the flag from cards — cards that condition on or set/clear this flag continue to function. The flag will be re-created in the registry automatically the next time a card referencing it is saved.

---

## 10. Settings

Settings provides context documents that Claude reads before every suggestion.

### Character Bible

Paste your character descriptions, world-building notes, tone guide, and setting details here. Claude reads this in full before writing or editing any prompt. The more specific and detailed this is, the more on-brand Claude's suggestions will be.

Good things to include:
- Each character's name, voice style, verbal tics
- The game's tone (satirical, grim, comedic, etc.)
- World-building context the player would know
- Any phrases or vocabulary that are in-universe

### Deck Guide

Structural guidance for your deck's design. Claude uses this when suggesting deltas and conditions.

Good things to include:
- Stage progression (what changes between early/mid/late game)
- Thematic clusters and what they represent
- Balance targets (e.g., "Treasury swings should average ±8 per card")
- Which pillars are most dangerous and should be handled carefully
- Chain patterns and how arcs are structured

**Saving settings** invalidates Claude's context cache immediately — the next Claude action in any session will use the updated documents.

---

## 11. Concepts Reference

### Weight and Draw Probability

Weight is a relative value. A card with weight `10` is twice as likely to be drawn as a card with weight `5`. All eligible cards in the current draw pool compete by weight.

Special values:
- `0` = chain-only. Never enters the random draw pool.
- `−1` = auto-fire. Fires automatically the next cycle its conditions pass, bypassing the draw entirely.

### Cooldown

After a card fires, it is removed from the draw pool for the duration of its cooldown.

- **Number (e.g., `3`)** — Unavailable for that many cycles. Cooldown counts down by 1 each cycle.
- **`run`** — Unavailable for the rest of the current run. Resets on death.
- **`permanent`** — Fires once, ever. Will not fire again in any run.

### Flags vs. Counters

**Flags** are boolean (on/off). Use them for story gates: has this event happened? Is this relationship established? Is the war active?

**Counters** are integers. Use them for tracked quantities that need arithmetic: how many elections have passed? How many duels has the player won? Counters can be incremented by consequences and compared in conditions.

### Chains vs. Auto-Fire

**Chains** are explicit: a specific choice on a specific card forces a specific next card. Useful for scripted narrative beats.

**Auto-fire** (weight = −1) is condition-based: whenever this card's conditions pass, it fires on the next cycle, regardless of what the previous card was. Useful for crisis cards, milestone revelations, or system events that should interrupt the normal flow when certain conditions are met.

### Entity Activate / Deactivate

The entity roster controls which characters are currently presenting cards. A character who is deactivated will not present any cards — their cards are excluded from the draw pool. Use this to model arrival and departure of characters: an advisor joins your court (activate), a general dies in battle (deactivate).

Cards assigned to a deactivated character become ineligible. Chain targets on deactivated characters will still fire — the chain takes precedence over the roster state.

### Persistent Modifiers (Effects)

An effect applied via `apply modifier` runs every cycle, draining or boosting pillars silently in the background. Players feel the pressure without a card being drawn. Use effects for ongoing situations: economic collapse, a disease spreading, wartime rationing.

Effects with duration `−1` run indefinitely. To stop them, a card must use `remove modifier` on the same effect slug — or you can wire them to a flag and have the engine remove the effect when the flag clears.
