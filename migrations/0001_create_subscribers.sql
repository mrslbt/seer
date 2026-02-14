-- Email subscribers collected at onboarding
-- Separate from app profiles (localStorage) — this is for marketing/comms
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  birth_date TEXT,
  birth_city TEXT,
  birth_country TEXT,
  email_consent INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
