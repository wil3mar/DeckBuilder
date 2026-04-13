-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Characters (bearers)
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  stage_labels text[],
  voice text NOT NULL DEFAULT '',
  motivation text NOT NULL DEFAULT '',
  dynamic text NOT NULL DEFAULT '',
  escalation text NOT NULL DEFAULT '',
  portrait_url text
);

-- Resource pillars
CREATE TABLE pillars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  start_value int NOT NULL DEFAULT 50,
  floor int NOT NULL DEFAULT 0,
  ceiling int NOT NULL DEFAULT 100,
  is_killer bool NOT NULL DEFAULT true,
  icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#888888',
  sort_order int NOT NULL DEFAULT 0
);

-- Cards (main table)
CREATE TABLE cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  thematic text NOT NULL DEFAULT '',
  stage_label text,
  weight int NOT NULL DEFAULT 5,
  cooldown text,
  conditions jsonb NOT NULL DEFAULT '[]',
  prompt text NOT NULL DEFAULT '',
  yes_label text NOT NULL DEFAULT '',
  yes_feedback text,
  yes_deltas jsonb NOT NULL DEFAULT '{}',
  yes_consequences jsonb NOT NULL DEFAULT '[]',
  yes_chain_target text,
  yes_chain_delay int NOT NULL DEFAULT 0,
  no_label text NOT NULL DEFAULT '',
  no_feedback text,
  no_deltas jsonb NOT NULL DEFAULT '{}',
  no_consequences jsonb NOT NULL DEFAULT '[]',
  no_chain_target text,
  no_chain_delay int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on cards
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Milestones
CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  conditions jsonb NOT NULL DEFAULT '[]',
  achievement text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Persistent effects
CREATE TABLE effects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  duration int NOT NULL DEFAULT -1,
  per_cycle_deltas jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Flag registry (auto-populated on card save)
CREATE TABLE flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  is_keep bool NOT NULL DEFAULT false,
  set_by text[] NOT NULL DEFAULT '{}',
  cleared_by text[] NOT NULL DEFAULT '{}'
);

-- App settings (single row)
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_labels text[],
  character_bible text,
  deck_guide text,
  github_repo text,
  github_branch text NOT NULL DEFAULT 'main',
  github_token_encrypted text
);

-- RPC: upsert a flag with a card slug in set_by
CREATE OR REPLACE FUNCTION upsert_flag_set_by(flag_name text, card_slug text)
RETURNS void AS $$
BEGIN
  INSERT INTO flags (name, set_by, cleared_by)
  VALUES (flag_name, ARRAY[card_slug], '{}')
  ON CONFLICT (name) DO UPDATE
  SET set_by = CASE
    WHEN card_slug = ANY(flags.set_by) THEN flags.set_by
    ELSE array_append(flags.set_by, card_slug)
  END;
END;
$$ LANGUAGE plpgsql;

-- RPC: upsert a flag with a card slug in cleared_by
CREATE OR REPLACE FUNCTION upsert_flag_cleared_by(flag_name text, card_slug text)
RETURNS void AS $$
BEGIN
  INSERT INTO flags (name, set_by, cleared_by)
  VALUES (flag_name, '{}', ARRAY[card_slug])
  ON CONFLICT (name) DO UPDATE
  SET cleared_by = CASE
    WHEN card_slug = ANY(flags.cleared_by) THEN flags.cleared_by
    ELSE array_append(flags.cleared_by, card_slug)
  END;
END;
$$ LANGUAGE plpgsql;
