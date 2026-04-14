// Plain objects — no Anthropic SDK import needed.
// The claude route passes these to client.messages.create({ tools: GAME_TOOLS })
// which accepts any array of objects matching the Tool shape.

export const GAME_TOOLS = [
  {
    name: 'create_pillars',
    description: 'Create or update resource pillars. Each pillar tracks one resource. Call this first when building a new game.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pillars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:         { type: 'string', description: 'Unique identifier, lowercase_underscores' },
              display_name: { type: 'string', description: 'Name shown to player, e.g. REVIEWS' },
              start_value:  { type: 'number', description: 'Starting value, typically 50' },
              floor:        { type: 'number', description: 'Value at which run ends (typically 0)' },
              ceiling:      { type: 'number', description: 'Value at which run ends (typically 100)' },
              is_killer:    { type: 'boolean', description: 'Whether breaching floor/ceiling ends the run' },
              color:        { type: 'string', description: 'Hex color, e.g. #FFD700' },
              icon:         { type: 'string', description: 'Icon name string' },
              sort_order:   { type: 'number', description: 'Display order, 0 = first' },
            },
            required: ['slug', 'display_name', 'start_value', 'floor', 'ceiling', 'is_killer', 'color', 'icon', 'sort_order'],
          },
        },
      },
      required: ['pillars'],
    },
  },
  {
    name: 'create_characters',
    description: 'Create or update characters who present cards to the player. Call after creating pillars.',
    input_schema: {
      type: 'object' as const,
      properties: {
        characters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:         { type: 'string' },
              display_name: { type: 'string' },
              voice:        { type: 'string', description: 'How this character speaks' },
              motivation:   { type: 'string', description: 'What this character wants' },
              dynamic:      { type: 'string', description: 'Their relationship to the player' },
              escalation:   { type: 'string', description: 'How their behavior escalates over time' },
            },
            required: ['slug', 'display_name', 'voice', 'motivation', 'dynamic', 'escalation'],
          },
        },
      },
      required: ['characters'],
    },
  },
  {
    name: 'create_cards',
    description: 'Create or update cards. Call in batches of 10-20. Use character_slug (not UUID) to reference characters. Chain cards with yes_chain_target/no_chain_target.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:             { type: 'string' },
              character_slug:   { type: 'string', description: 'Character slug. Omit or null for narrator cards.' },
              thematic:         { type: 'string', description: 'Grouping label, e.g. act1_chef' },
              stage_label:      { type: 'string', description: 'Display label e.g. Act 1. Optional.' },
              weight:           { type: 'number', description: '3-8 normal, 0 chain-only, -1 auto-fire' },
              cooldown:         { type: 'string', description: 'Cycles before reappearing. null = no cooldown.' },
              conditions:       { type: 'array', items: { type: 'object' }, description: 'ICondition objects' },
              prompt:           { type: 'string', description: '2-4 sentences, third-person present tense' },
              yes_label:        { type: 'string', description: 'Action label, under 5 words' },
              yes_deltas:       { type: 'object', description: 'pillar_slug → integer delta' },
              yes_consequences: { type: 'array', items: { type: 'object' }, description: 'ICommand objects' },
              yes_chain_target: { type: 'string', description: 'Slug of next chain card, or null' },
              yes_chain_delay:  { type: 'number', description: 'Cycles before chain fires. 0 = immediate.' },
              no_label:         { type: 'string' },
              no_deltas:        { type: 'object' },
              no_consequences:  { type: 'array', items: { type: 'object' } },
              no_chain_target:  { type: 'string' },
              no_chain_delay:   { type: 'number' },
              notes:            { type: 'string' },
            },
            required: ['slug', 'thematic', 'weight', 'prompt', 'yes_label', 'yes_deltas', 'no_label', 'no_deltas'],
          },
        },
      },
      required: ['cards'],
    },
  },
  {
    name: 'create_effects',
    description: 'Create persistent effects that drain or boost pillars every turn while active.',
    input_schema: {
      type: 'object' as const,
      properties: {
        effects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:             { type: 'string' },
              title:            { type: 'string' },
              description:      { type: 'string' },
              duration:         { type: 'number', description: 'Cycles active. -1 = indefinite.' },
              per_cycle_deltas: { type: 'object', description: 'pillar_slug → delta per cycle' },
            },
            required: ['slug', 'title', 'description', 'duration', 'per_cycle_deltas'],
          },
        },
      },
      required: ['effects'],
    },
  },
  {
    name: 'create_milestones',
    description: 'Create milestones that unlock when conditions are met. Use these to gate act progression.',
    input_schema: {
      type: 'object' as const,
      properties: {
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug:        { type: 'string' },
              title:       { type: 'string' },
              description: { type: 'string' },
              conditions:  { type: 'array', items: { type: 'object' } },
              achievement: { type: 'string', description: 'Achievement text. null if none.' },
            },
            required: ['slug', 'title', 'description', 'conditions'],
          },
        },
      },
      required: ['milestones'],
    },
  },
  {
    name: 'create_flags',
    description: 'Register flags in the flag registry. Call after all cards are created so you know which cards set/clear each flag.',
    input_schema: {
      type: 'object' as const,
      properties: {
        flags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name:        { type: 'string', description: 'Flag name. Use _keep suffix for flags that survive run resets.' },
              description: { type: 'string' },
              is_keep:     { type: 'boolean' },
              set_by:      { type: 'array', items: { type: 'string' }, description: 'Card slugs that set this flag' },
              cleared_by:  { type: 'array', items: { type: 'string' }, description: 'Card slugs that clear this flag' },
            },
            required: ['name', 'description', 'is_keep', 'set_by', 'cleared_by'],
          },
        },
      },
      required: ['flags'],
    },
  },
  {
    name: 'validate_game',
    description: 'Run the validation suite on all game content. Call this after creating all content to check for issues.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
] as const

// Human-readable labels for the progress UI
export const TOOL_LABELS: Record<string, string> = {
  create_pillars:    'Creating pillars',
  create_characters: 'Creating characters',
  create_cards:      'Writing cards',
  create_effects:    'Creating effects',
  create_milestones: 'Creating milestones',
  create_flags:      'Building flag registry',
  validate_game:     'Running balance check',
}

// Maps tool name to the API endpoint it calls
export const TOOL_ENDPOINTS: Record<string, string> = {
  create_pillars:    '/api/game/pillars',
  create_characters: '/api/game/characters',
  create_cards:      '/api/game/cards',
  create_effects:    '/api/game/effects',
  create_milestones: '/api/game/milestones',
  create_flags:      '/api/game/flags',
  validate_game:     '/api/game/validate',
}
