CREATE TABLE shop_poll_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  round integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL
);
INSERT INTO shop_poll_settings (id, data) VALUES (1, '{
  "enabled": true,
  "open": true,
  "title": "Who should I draw next?",
  "description": "Choose your Pokémon. Help shape the next page of the sketchbook.",
  "bannerEnabled": false,
  "bannerTitle": "Next print in progress — coming soon!",
  "bannerText": "A new favourite is taking shape in the studio. Watch this space for a first look.",
  "bannerWinner": "",
  "bannerImage": "",
  "bannerImageAlt": "Work in progress from the studio"
}'::jsonb);

CREATE TABLE shop_poll_entries (
  round integer NOT NULL,
  pokemon text NOT NULL,
  actual_votes integer NOT NULL DEFAULT 0 CHECK (actual_votes >= 0),
  adjustment integer NOT NULL DEFAULT 0,
  PRIMARY KEY (round, pokemon),
  CHECK (actual_votes + adjustment >= 0)
);

-- Cooldowns are global, so starting a fresh poll never bypasses the seven-day limit.
CREATE TABLE shop_poll_voters (
  email text PRIMARY KEY,
  name text NOT NULL,
  last_voted_at timestamptz NOT NULL DEFAULT now()
);

-- Preserve the submitted tally separately from admin adjustments.
CREATE TABLE shop_poll_adjustments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round integer NOT NULL,
  pokemon text NOT NULL,
  adjustment integer NOT NULL,
  admin_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
