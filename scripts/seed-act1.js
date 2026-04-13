#!/usr/bin/env node
// Seed script — Act 1 starter content
// Run from the DeckBuilder project root: node scripts/seed-act1.js
//
// Creates:
//   4 pillars   (EGO, CASH, LOYALTY, APPROVAL)
//   4 characters (Fixer, Banker, Rival Developer, PR Woman)
//  30 cards     (standard, chain, death, crisis, milestone)

const fs = require('fs')
const path = require('path')

// ── Load env ──────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').trim().split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function req(method, table, body, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${method} ${table}: ${res.status} ${err}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── 1. PILLARS ────────────────────────────────────────────────
const PILLARS = [
  { slug: 'ego',      display_name: 'EGO',      start_value: 50, floor: 0, ceiling: 100, is_killer: true, icon: 'ego',      color: '#c084fc', sort_order: 0 },
  { slug: 'cash',     display_name: 'CASH',     start_value: 50, floor: 0, ceiling: 100, is_killer: true, icon: 'cash',     color: '#4ade80', sort_order: 1 },
  { slug: 'loyalty',  display_name: 'LOYALTY',  start_value: 50, floor: 0, ceiling: 100, is_killer: true, icon: 'loyalty',  color: '#fb923c', sort_order: 2 },
  { slug: 'approval', display_name: 'APPROVAL', start_value: 50, floor: 0, ceiling: 100, is_killer: true, icon: 'approval', color: '#38bdf8', sort_order: 3 },
]

// ── 2. CHARACTERS ─────────────────────────────────────────────
const CHARACTERS = [
  {
    slug: 'fixer',
    display_name: 'The Fixer',
    voice: 'Clipped, conspiratorial, always eating. Speaks in implications. Never elaborates. The word "handled" does a lot of work.',
    motivation: 'Absolute loyalty to the player character, which he confuses with absolute power. He is loyal the way a barnacle is loyal.',
    dynamic: 'Fixer-enabler. Removes obstacles the player character pretends not to know about.',
    escalation: 'As loyalty drops, his "solutions" become more visible and more expensive. As loyalty peaks, he starts solving problems that don\'t exist.',
    portrait_url: null,
  },
  {
    slug: 'banker',
    display_name: 'The Banker',
    voice: 'Precise, Swiss-inflected, never raises his voice. Uses financial terminology as a dominance display. "Covenant" appears often.',
    motivation: 'Return on investment. The player character is a product he has financed. He is not sentimental about products.',
    dynamic: 'Creditor. Polite until the numbers say otherwise.',
    escalation: 'Increasingly in-person as cash drops. Distance correlates with solvency.',
    portrait_url: null,
  },
  {
    slug: 'rival',
    display_name: 'The Rival Developer',
    voice: 'Warmly aggressive. Every compliment is a threat. Sends gifts. The gifts are pointed.',
    motivation: 'Zero-sum. Winning is only meaningful if someone else loses.',
    dynamic: 'Rival/mirror. Shows the player what they look like from outside.',
    escalation: 'Escalates tactically — joint ventures when player is weak, aggressive moves when player is strong.',
    portrait_url: null,
  },
  {
    slug: 'pr_woman',
    display_name: 'The PR Woman',
    voice: 'Bloodlessly professional. Presents options without judgment, except for the micro-pause before the bad ones.',
    motivation: 'Control the narrative. She does not care what the truth is. She cares what prints.',
    dynamic: 'Fixer for public image. Parallel to The Fixer for private problems.',
    escalation: 'As approval drops, her options become more ethically flexible. She never comments on this.',
    portrait_url: null,
  },
]

// ── 3. CARDS ──────────────────────────────────────────────────
// Helper to build a conditions array
function flag(id, negated = false) { return { type: 'flag', id, negated } }
function resource(id, op, value) { return { type: 'resource', id, op, value } }
function temporal(field, op, value) { return { type: 'temporal', field, op, value } }

// Helper to build a consequence
function setFlag(id) { return { type: 'set_flag', id } }
function clearFlag(id) { return { type: 'clear_flag', id } }
function chain(target, delay = 1) { return { type: 'chain', target, delay } }

// Cards array — character_id filled in after character insert
const CARDS = [

  // ── GROUP 1: THE FIXER — 5 Standard Cards ──────────────────

  {
    slug: 'fixer_001',
    _character: 'fixer',
    weight: 5,
    cooldown: '3',
    thematic: 'fixer',
    conditions: [],
    prompt: 'The Fixer drops an envelope on your desk. Inside: photos of the Rival Developer at a charity gala with your ex-wife. "This is a gift," he says. "Or it\'s nothing. Your call, boss."',
    yes_label: 'Use it',
    yes_deltas: { ego: 10, loyalty: 5, approval: -10 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Burn it',
    no_deltas: { ego: -5, loyalty: 10, approval: 5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'fixer_002',
    _character: 'fixer',
    weight: 5,
    cooldown: '4',
    thematic: 'fixer',
    conditions: [],
    prompt: '"I took care of the parking lot thing," the Fixer says. He does not elaborate on the parking lot thing. He never elaborates. You have learned not to ask about the parking lot thing.',
    yes_label: "Don't ask",
    yes_deltas: { loyalty: 10, cash: -10 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Ask',
    no_deltas: { loyalty: -15, ego: 5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'fixer_003',
    _character: 'fixer',
    weight: 4,
    cooldown: '5',
    thematic: 'fixer',
    conditions: [resource('cash', '<', 70)],
    prompt: 'The Fixer says he knows a notary in Delaware who can date a document whatever you need it dated. "Completely legal," he adds, in the tone of a man for whom legality is a courtesy, not a constraint.',
    yes_label: 'Date it',
    yes_deltas: { cash: 15, loyalty: 5, approval: -10 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Too risky',
    no_deltas: { cash: -5, ego: -5, loyalty: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'fixer_004',
    _character: 'fixer',
    weight: 4,
    cooldown: '6',
    thematic: 'fixer',
    conditions: [resource('loyalty', '<', 60)],
    prompt: 'The Fixer wants a title. Not a raise — a title. "Senior Executive Vice President of Strategic Resolution." He has already ordered the business cards. They are gold-foil.',
    yes_label: 'Give him the title',
    yes_deltas: { loyalty: 15, cash: -5, ego: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Titles cost nothing, deny anyway',
    no_deltas: { loyalty: -15, ego: 10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'fixer_005',
    _character: 'fixer',
    weight: 3,
    cooldown: '8',
    thematic: 'fixer',
    conditions: [flag('act2_tv_keep', true)],
    prompt: 'The Fixer mentions, unprompted, that a cable news producer keeps calling. Something about a documentary. "I told him you weren\'t interested," the Fixer says. "Unless you are. In which case I told him nothing."',
    yes_label: 'Take the call',
    yes_deltas: { ego: 10, approval: 10, loyalty: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Not yet',
    no_deltas: { loyalty: 5, approval: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Breadcrumb — hints at Act 2 TV arc',
  },

  // ── GROUP 2: THE BANKER — 5 Standard Cards ─────────────────

  {
    slug: 'banker_001',
    _character: 'banker',
    weight: 5,
    cooldown: '3',
    thematic: 'banker',
    conditions: [],
    prompt: 'The Banker calls from Zurich. He says the word "covenant" four times in one sentence. You do not know what a covenant is. You say the tower will be finished on schedule. There is a long pause from Zurich.',
    yes_label: 'Reassure him',
    yes_deltas: { cash: 10, ego: -5, loyalty: 5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Renegotiate terms',
    no_deltas: { cash: -15, ego: 10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'banker_002',
    _character: 'banker',
    weight: 5,
    cooldown: '4',
    thematic: 'banker',
    conditions: [],
    prompt: 'A second bank has agreed to extend the credit line, contingent on a personal guarantee. The Banker slides the document across the table. "It is a formality," he says, in a way that suggests it is not a formality.',
    yes_label: 'Sign it',
    yes_deltas: { cash: 20, loyalty: -5, approval: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Counter-offer',
    no_deltas: { cash: -10, ego: 10, loyalty: 5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'banker_003',
    _character: 'banker',
    weight: 4,
    cooldown: '5',
    thematic: 'banker',
    conditions: [resource('cash', '<', 50)],
    prompt: 'The Banker arrives in person, which has never happened before. He has brought a colleague. The colleague has a briefcase. Nobody mentions what is in the briefcase. He calls it a "restructuring conversation."',
    yes_label: 'Restructure',
    yes_deltas: { cash: 15, approval: -10, ego: -10 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Show them out',
    no_deltas: { cash: -20, ego: 15 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'banker_004',
    _character: 'banker',
    weight: 4,
    cooldown: '5',
    thematic: 'banker',
    conditions: [resource('cash', '>', 40)],
    prompt: 'The Banker wants to put the Golden Son name on the bank\'s new premium card. Matte black. Heavy. Makes a sound when you set it down. "Our clients enjoy the association," he says. You enjoy the sound it makes.',
    yes_label: 'License the name',
    yes_deltas: { cash: 10, ego: 15, approval: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'The name is worth more than that',
    no_deltas: { ego: 10, cash: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'banker_005',
    _character: 'banker',
    weight: 3,
    cooldown: '7',
    thematic: 'banker',
    conditions: [flag('act2_tv_keep', true)],
    prompt: 'The Banker mentions, while reviewing quarterly figures, that one of his clients produces television. "Not my world," he says. "But he asked if you would take a lunch." He returns to the figures without further comment.',
    yes_label: 'Schedule the lunch',
    yes_deltas: { approval: 5, cash: 5, loyalty: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Focus on the numbers',
    no_deltas: { cash: 5, ego: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Breadcrumb — hints at Act 2 TV arc',
  },

  // ── GROUP 3: THE RIVAL DEVELOPER — 5 Standard Cards ────────

  {
    slug: 'rival_001',
    _character: 'rival',
    weight: 5,
    cooldown: '3',
    thematic: 'rival',
    conditions: [],
    prompt: 'The Rival Developer sends a gift basket the morning your new tower is announced. The card reads: "Congratulations. May it be everything you\'ve promised." The fruit is excellent. The tone is not.',
    yes_label: 'Send one back',
    yes_deltas: { ego: 10, cash: -5, approval: 5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Keep the basket, say nothing',
    no_deltas: { ego: 5, loyalty: 5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'rival_002',
    _character: 'rival',
    weight: 5,
    cooldown: '4',
    thematic: 'rival',
    conditions: [],
    prompt: 'The Rival has outbid you on a city block you\'ve been circling for two years. He did it quietly. He did it the day after your charity gala. You are fairly certain he was at the gala.',
    yes_label: 'Make a counter-offer',
    yes_deltas: { cash: -20, ego: 10, approval: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Let it go, find something better',
    no_deltas: { ego: -10, loyalty: 5, approval: 5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'rival_003',
    _character: 'rival',
    weight: 4,
    cooldown: '4',
    thematic: 'rival',
    conditions: [],
    prompt: 'The Rival is at your table at a fundraising dinner. He mentions that a mutual friend told him something you said. He smiles when he says it. You do not remember saying it. You probably said it.',
    yes_label: 'Deny it',
    yes_deltas: { ego: 10, loyalty: -10, approval: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Lean in, own it',
    no_deltas: { ego: 5, loyalty: 5, approval: -10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'rival_004',
    _character: 'rival',
    weight: 4,
    cooldown: '5',
    thematic: 'rival',
    conditions: [resource('loyalty', '>', 30)],
    prompt: 'The Rival calls with a joint venture proposal. Equal billing on the letterhead. His name first, alphabetically. You have spent thirty seconds looking at that detail and have not read the rest of the proposal.',
    yes_label: 'Counter with your name first',
    yes_deltas: { cash: 10, ego: 10, loyalty: -10, approval: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Pass entirely',
    no_deltas: { ego: 5, loyalty: 5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'rival_005',
    _character: 'rival',
    weight: 3,
    cooldown: '6',
    thematic: 'rival',
    conditions: [],
    prompt: 'The Rival is quoted in a trade magazine calling you "a brand, not a builder." The magazine is on your desk. The Fixer put it there. The Fixer has highlighted the sentence in yellow.',
    yes_label: 'Respond publicly',
    yes_deltas: { ego: 15, approval: 5, loyalty: -5, cash: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'File it',
    no_deltas: { ego: -5, loyalty: 10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },

  // ── GROUP 4: THE PR WOMAN — 5 Standard Cards ───────────────

  {
    slug: 'pr_001',
    _character: 'pr_woman',
    weight: 5,
    cooldown: '3',
    thematic: 'pr',
    conditions: [],
    prompt: 'The PR Woman has drafted three responses to the zoning story. Version A is accurate. Version B is misleading but defensible. Version C is a photograph of you shaking hands with a veteran at a ribbon-cutting. "C performs best," she says.',
    yes_label: 'Go with C',
    yes_deltas: { approval: 15, ego: 5, cash: -5, loyalty: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Run B',
    no_deltas: { approval: 5, cash: 5, loyalty: 5, ego: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'pr_002',
    _character: 'pr_woman',
    weight: 5,
    cooldown: '3',
    thematic: 'pr',
    conditions: [],
    prompt: 'The PR Woman says a journalist is working on a long piece. "Sympathetic, I think. Maybe." She pauses. "The photographer they sent has very thorough notes."',
    yes_label: 'Grant the interview',
    yes_deltas: { approval: 15, ego: 10, loyalty: -5, cash: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Kill it through back channels',
    no_deltas: { approval: -5, loyalty: 5, cash: -10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'pr_003',
    _character: 'pr_woman',
    weight: 4,
    cooldown: '4',
    thematic: 'pr',
    conditions: [resource('approval', '<', 60)],
    prompt: 'The PR Woman wants to plant a story about your philanthropy. "We\'d need something philanthropic to have happened," she says. "I can work around that."',
    yes_label: 'Plant it',
    yes_deltas: { approval: 15, cash: -10, loyalty: 5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Actual philanthropy',
    no_deltas: { approval: 5, cash: -15, ego: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'pr_004',
    _character: 'pr_woman',
    weight: 4,
    cooldown: '5',
    thematic: 'pr',
    conditions: [resource('approval', '<', 50)],
    prompt: 'A gossip column has published the square footage of your apartment, rounded down by fifteen percent. The PR Woman says this is "correctable." She means it will cost money to correct it.',
    yes_label: 'Correct it',
    yes_deltas: { ego: 10, cash: -10, approval: 5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: "Let it stand, nobody checks",
    no_deltas: { ego: -10, cash: 5, approval: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'pr_005',
    _character: 'pr_woman',
    weight: 3,
    cooldown: '6',
    thematic: 'pr',
    conditions: [],
    prompt: 'The PR Woman mentions that a woman has been outside the building three mornings in a row with a highlighted copy of your book and a folding chair. "She\'s not press," she says. "She just wants to meet you."',
    yes_label: 'Let her up',
    yes_deltas: { approval: 10, ego: 15, loyalty: 5, cash: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Security handles it',
    no_deltas: { approval: -5, ego: -5 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Breadcrumb — hints at the Superfan character',
  },

  // ── GROUP 5: THE FIXER CHAIN — 3 Cards ─────────────────────

  {
    slug: 'fixer_chain_001',
    _character: 'fixer',
    weight: 0,
    cooldown: 'permanent',
    thematic: 'fixer_chain',
    conditions: [],
    prompt: 'The Fixer comes in and closes the door. A contractor on the Jersey project is talking to someone he shouldn\'t be talking to. "I can make it a paperwork problem," the Fixer says. "Or I can make it a him problem."',
    yes_label: 'Paperwork problem',
    yes_deltas: { loyalty: 10, cash: -15 },
    yes_consequences: [setFlag('flag_fixer_chain_active'), chain('fixer_chain_002', 1)],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Him problem',
    no_deltas: { loyalty: 5, cash: -5, approval: -10 },
    no_consequences: [setFlag('flag_fixer_chain_active'), chain('fixer_chain_002', 1)],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Chain entry. Both choices advance the chain — player chooses method, not whether to proceed.',
  },
  {
    slug: 'fixer_chain_002',
    _character: 'fixer',
    weight: 0,
    cooldown: null,
    thematic: 'fixer_chain',
    conditions: [flag('flag_fixer_chain_active')],
    prompt: 'The Fixer handled it. He is very confident he handled it. The contractor\'s brother, however, was not part of the original assessment, and the contractor\'s brother has retained counsel.',
    yes_label: 'Double down, pay the brother off',
    yes_deltas: { cash: -20, loyalty: 5, approval: -5 },
    yes_consequences: [chain('fixer_chain_003', 1)],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Distance yourself now',
    no_deltas: { ego: -10, loyalty: -15, approval: 5 },
    no_consequences: [chain('fixer_chain_003', 1)],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: null,
  },
  {
    slug: 'fixer_chain_003',
    _character: 'fixer',
    weight: 0,
    cooldown: null,
    thematic: 'fixer_chain',
    conditions: [flag('flag_fixer_chain_active')],
    prompt: 'The Fixer is in your office at seven in the morning. He has not slept. He has a folder. He has also, separately, a lawyer. He says these are two different things and you need to decide which one you\'re using.',
    yes_label: 'Use the folder. Bury it.',
    yes_deltas: { cash: -15, loyalty: 15, ego: 10, approval: -10 },
    yes_consequences: [setFlag('act1_fixer_buried_keep'), clearFlag('flag_fixer_chain_active')],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Use the lawyer. Let him confess.',
    no_deltas: { cash: -5, loyalty: -20, ego: -10, approval: 15 },
    no_consequences: [setFlag('act1_fixer_confessed_keep'), clearFlag('flag_fixer_chain_active')],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Permanent branching — sets a _keep flag that carries forward to Act 2.',
  },

  // ── GROUP 6: DEATH CARDS — 8 Cards (floor + ceiling per pillar)

  {
    slug: 'death_ego_floor',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('ego', '<=', 0)],
    prompt: 'The cover of the Post is a photo taken from below, at an angle nobody approved. The headline is four words. Inside, the full story runs nine pages, with a sidebar. The sidebar is about the parking garage.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — EGO floor breach. Run ends.',
  },
  {
    slug: 'death_ego_ceiling',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('ego', '>=', 100)],
    prompt: 'The address to the joint session of Congress is going well until the part where you announce, without prior coordination, that elections are cancelled pending a structural review. The Joint Chiefs exchange a look. The look takes about four seconds.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — EGO ceiling breach. Run ends.',
  },
  {
    slug: 'death_cash_floor',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('cash', '<=', 0)],
    prompt: 'The creditor calls at 6:47 AM, which means it is already afternoon in Frankfurt. He does not use the word "bankruptcy." He uses the phrase "involuntary restructuring event." There are three more calls before nine. Then there are cameras outside the lobby.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — CASH floor breach. Run ends.',
  },
  {
    slug: 'death_cash_ceiling',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('cash', '>=', 100)],
    prompt: 'A financial journalist calculates, in a newsletter that goes briefly viral, that you have made more money this quarter than the GDP of Luxembourg. Congress schedules a hearing. The invitation is technically a subpoena.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — CASH ceiling breach. Run ends.',
  },
  {
    slug: 'death_loyalty_floor',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('loyalty', '<=', 0)],
    prompt: 'A resignation letter appears on the desk. Then another. By noon there are six, stacked neatly, which suggests someone organized them, which means the organizing started before this morning. The Fixer\'s letter is on the bottom. His is the longest.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — LOYALTY floor breach. Run ends.',
  },
  {
    slug: 'death_loyalty_ceiling',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('loyalty', '>=', 100)],
    prompt: 'The inner circle has, collectively, stopped telling you things. Not because they are disloyal. Because they have decided, unanimously and without discussion, that you are always right. Three weeks later, the building permit situation becomes a federal matter.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — LOYALTY ceiling breach. Run ends.',
  },
  {
    slug: 'death_approval_floor',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('approval', '<=', 0)],
    prompt: 'The rally is scheduled for a Thursday. On Thursday, three hundred people come. The venue holds twelve thousand. The staff walks the risers so the cameras stay tight. A woman in the fourth row is reading a different person\'s book. She is enjoying it.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — APPROVAL floor breach. Run ends.',
  },
  {
    slug: 'death_approval_ceiling',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'death',
    conditions: [resource('approval', '>=', 100)],
    prompt: 'The support group that started as a fan page has incorporated in three states. Their newsletter has more subscribers than the Times. This morning they did something in his name that he did not authorize, would not authorize, and cannot now disavow.',
    yes_label: '',
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: '',
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Death card — APPROVAL ceiling breach. Run ends.',
  },

  // ── GROUP 7: AUTO-FIRE CRISIS CARDS — 2 Cards ──────────────

  {
    slug: 'crisis_approval_crash',
    _character: 'pr_woman',
    weight: -1,
    cooldown: null,
    thematic: 'crisis',
    conditions: [resource('approval', '<=', 20)],
    prompt: 'The PR Woman calls an emergency meeting. She has a slideshow. Slide one is a graph. The line on the graph goes in one direction. She does not say which direction because you can see which direction.',
    yes_label: 'Emergency rally, full spend',
    yes_deltas: { approval: 20, cash: -20, loyalty: 5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Blame the pollsters',
    no_deltas: { approval: -10, ego: 10, loyalty: -10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Crisis warning — fires when approval hits 20. Not a death card.',
  },
  {
    slug: 'crisis_cash_crash',
    _character: 'banker',
    weight: -1,
    cooldown: null,
    thematic: 'crisis',
    conditions: [resource('cash', '<=', 20)],
    prompt: 'The Banker calls. Not from Zurich this time — from the lobby. He has not called ahead. He is wearing his coat, which means he did not plan to stay long, which means he planned for this to be short.',
    yes_label: 'Take his terms',
    yes_deltas: { cash: 20, ego: -15, loyalty: -5 },
    yes_consequences: [],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Stall, find another bank',
    no_deltas: { cash: -10, ego: 10, loyalty: 5, approval: -10 },
    no_consequences: [],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Crisis warning — fires when cash hits 20. Not a death card.',
  },

  // ── GROUP 8: MILESTONE TRIGGER — 1 Card ────────────────────

  {
    slug: 'act1_survivor',
    _character: null,
    weight: -1,
    cooldown: null,
    thematic: 'milestone',
    conditions: [temporal('cycle', '>=', 10), flag('act1_survivor_keep', true)],
    prompt: 'Ten cycles in. The empire is intact. The lawyers have been paid. The Banker has been managed. The Rival has not won. This is, by any measure, a successful quarter. The Fixer sends a fruit basket. It is not as good as the Rival\'s.',
    yes_label: 'Keep going',
    yes_deltas: { ego: 5, loyalty: 5 },
    yes_consequences: [setFlag('act1_survivor_keep')],
    yes_chain_target: null, yes_chain_delay: 0, yes_feedback: null,
    no_label: 'Take stock, slow down',
    no_deltas: { approval: 5, cash: 5 },
    no_consequences: [setFlag('act1_survivor_keep')],
    no_chain_target: null, no_chain_delay: 0, no_feedback: null,
    notes: 'Milestone trigger. Sets act1_survivor_keep so it fires exactly once across all runs.',
  },
]

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('Seeding Act 1...\n')

  // 1. Pillars
  console.log('Creating pillars...')
  // Clear existing pillars first to avoid conflicts
  await req('DELETE', 'pillars', null, '?id=neq.00000000-0000-0000-0000-000000000000')
  for (const pillar of PILLARS) {
    await req('POST', 'pillars', pillar)
    console.log(`  ✓ ${pillar.display_name}`)
  }

  // 2. Characters
  console.log('\nCreating characters...')
  await req('DELETE', 'characters', null, '?id=neq.00000000-0000-0000-0000-000000000000')
  const charIdMap = {}
  for (const char of CHARACTERS) {
    const [created] = await req('POST', 'characters', char)
    charIdMap[char.slug] = created.id
    console.log(`  ✓ ${char.display_name} (${created.id})`)
  }

  // 3. Cards
  console.log('\nCreating cards...')
  // Clear existing cards
  await req('DELETE', 'cards', null, '?id=neq.00000000-0000-0000-0000-000000000000')
  for (const card of CARDS) {
    const { _character, ...rest } = card
    const row = {
      ...rest,
      character_id: _character ? charIdMap[_character] : null,
      stage_label: null,
    }
    await req('POST', 'cards', row)
    console.log(`  ✓ ${card.slug}`)
  }

  // 4. Invalidate Claude context cache so next suggestion has fresh data
  console.log('\nInvalidating Claude context cache...')
  try {
    await fetch('http://localhost:3000/api/claude/context', { method: 'POST' })
    console.log('  ✓ Cache invalidated')
  } catch {
    console.log('  ⚠ Dev server not running — cache will rebuild on next Claude call')
  }

  console.log(`\nDone! Seeded ${PILLARS.length} pillars, ${CHARACTERS.length} characters, ${CARDS.length} cards.`)
}

main().catch(err => { console.error(err); process.exit(1) })
