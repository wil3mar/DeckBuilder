export type ResourceOperator = '>' | '<' | '=' | '>=' | '<=';

// ── Conditions ──────────────────────────────────────────────

export interface FlagCondition {
  type: 'flag';
  negated: boolean;
  id: string;
}

export interface ResourceCondition {
  type: 'resource';
  id: string;       // pillar slug
  op: ResourceOperator;
  value: number;
}

export interface CounterCondition {
  type: 'counter';
  id: string;
  op: ResourceOperator;
  value: number;
}

export interface EntityCondition {
  type: 'entity';
  id: string;       // character slug
}

export interface TemporalCondition {
  type: 'temporal';
  field: 'cycle' | 'dynasty';
  op: ResourceOperator;
  value: number;
}

export type ICondition =
  | FlagCondition
  | ResourceCondition
  | CounterCondition
  | EntityCondition
  | TemporalCondition;

// ── Commands ─────────────────────────────────────────────────

export interface SetFlagCommand          { type: 'set_flag';           id: string; }
export interface ClearFlagCommand        { type: 'clear_flag';         id: string; }
export interface IncrementCounterCommand { type: 'increment_counter';  id: string; amount: number; }
export interface ActivateEntityCommand   { type: 'activate_entity';    id: string; }
export interface DeactivateEntityCommand { type: 'deactivate_entity';  id: string; }
export interface ApplyModifierCommand    { type: 'apply_modifier';     effect_slug: string; }
export interface RemoveModifierCommand   { type: 'remove_modifier';    effect_slug: string; }
export interface ChainCommand            { type: 'chain';              target: string; delay: number; }

export type ICommand =
  | SetFlagCommand
  | ClearFlagCommand
  | IncrementCounterCommand
  | ActivateEntityCommand
  | DeactivateEntityCommand
  | ApplyModifierCommand
  | RemoveModifierCommand
  | ChainCommand;

// ── Deltas ───────────────────────────────────────────────────

/** Fixed delta or random range. e.g. 5 or { min: 5, max: 15 } */
export type DeltaValue = number | { min: number; max: number };
/** Map of pillar slug → delta value */
export type CardDeltas = Record<string, DeltaValue>;

// ── Database row types ───────────────────────────────────────

export interface Card {
  id: string;
  character_id: string | null;
  slug: string;
  thematic: string;
  stage_label: string | null;
  weight: number;
  cooldown: string | null;
  conditions: ICondition[];
  prompt: string;
  yes_label: string;
  yes_feedback: string | null;
  yes_deltas: CardDeltas;
  yes_consequences: ICommand[];
  yes_chain_target: string | null;
  yes_chain_delay: number;
  no_label: string;
  no_feedback: string | null;
  no_deltas: CardDeltas;
  no_consequences: ICommand[];
  no_chain_target: string | null;
  no_chain_delay: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  slug: string;
  display_name: string;
  stage_labels: string[] | null;
  voice: string;
  motivation: string;
  dynamic: string;
  escalation: string;
  portrait_url: string | null;
}

export interface Pillar {
  id: string;
  slug: string;
  display_name: string;
  start_value: number;
  floor: number;
  ceiling: number;
  is_killer: boolean;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Milestone {
  id: string;
  slug: string;
  title: string;
  description: string;
  conditions: ICondition[];
  achievement: string | null;
  created_at: string;
}

export interface Effect {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration: number;
  per_cycle_deltas: Record<string, number>;
  created_at: string;
}

export interface Flag {
  id: string;
  name: string;
  description: string;
  is_keep: boolean;
  set_by: string[];
  cleared_by: string[];
}

export interface Settings {
  id: string;
  stage_labels: string[] | null;
  character_bible: string | null;
  deck_guide: string | null;
  github_repo: string | null;
  github_branch: string;
  github_token_encrypted: string | null;
}

// ── Claude integration types ─────────────────────────────────

export interface ObservationItem {
  severity: 'warn' | 'info';
  message: string;
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export type ClaudeAction =
  | 'write_prompt'
  | 'sharpen_tone'
  | 'make_funnier'
  | 'shorter'
  | 'suggest_deltas'
  | 'suggest_conditions'
  | 'chat'
  | 'observations';

export interface ClaudeRequest {
  action: ClaudeAction;
  card?: Card | null;  // null when chatting without a card selected
  side?: 'yes' | 'no';
  message?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  // For agentic loop: full message history in Anthropic format (content can be string or content blocks)
  messages?: Array<{ role: 'user' | 'assistant'; content: unknown }>;
}

export type ClaudeResponse =
  | { action: 'write_prompt' | 'sharpen_tone' | 'make_funnier' | 'shorter'; text: string }
  | { action: 'suggest_deltas'; deltas: Record<string, number> }
  | { action: 'suggest_conditions'; conditions: ICondition[] }
  | { action: 'chat'; reply: string }
  | { action: 'observations'; items: ObservationItem[] }
  | { action: 'tool_use'; calls: ToolCall[]; assistantContent: unknown[] };

// ── API convenience types ─────────────────────────────────────

export type CardCreateInput = Omit<Card, 'id' | 'created_at' | 'updated_at'>;
export type CardUpdateInput = Partial<CardCreateInput>;

export interface CardListItem {
  id: string;
  slug: string;
  character_id: string | null;
  thematic: string;
  stage_label: string | null;
  weight: number;
  prompt: string;
  yes_label: string;
  no_label: string;
  yes_chain_target: string | null;
  no_chain_target: string | null;
  yes_consequences: ICommand[];
  no_consequences: ICommand[];
}
