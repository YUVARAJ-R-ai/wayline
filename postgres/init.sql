-- This SQL script will be run automatically on first database creation.
-- It ensures all required extensions are enabled.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS hstore;

-- ─── Auth System Tables ──────────────────────────────────────────────────────

-- Stores registered user accounts.
-- password_hash: bcrypt hash of the user's password (never stored in plaintext).
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
  email         TEXT          UNIQUE NOT NULL,
  password_hash TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Stores hashed API keys linked to user accounts.
-- key_hash:   SHA-256 or bcrypt hash of the full API key (never stored in plaintext).
-- prefix:     First 8 characters of the raw key for display (e.g. "wl_abc123").
-- usage_count: Incremented each time the key is used for rate-limiting / analytics.
CREATE TABLE IF NOT EXISTS api_keys (
  id          SERIAL      PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash    TEXT        NOT NULL,
  prefix      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  usage_count INT         DEFAULT 0
);
