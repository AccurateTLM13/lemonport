-- Cloudflare D1 schema for The Million Dollar Receipt API

CREATE TABLE IF NOT EXISTS receipts (
  number INTEGER PRIMARY KEY,
  serial TEXT NOT NULL UNIQUE,
  alias TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  message_status TEXT NOT NULL DEFAULT 'published',
  tier TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 100,
  purchased_at TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_receipts_alias ON receipts(alias);
CREATE INDEX IF NOT EXISTS idx_receipts_tier ON receipts(tier);
CREATE INDEX IF NOT EXISTS idx_receipts_purchased_at ON receipts(purchased_at);

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO meta (key, value) VALUES ('next_number', '1');
