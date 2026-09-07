-- Phase 1: Foundation
-- Only the users table is created now. repositories, pull_requests,
-- reviews, and findings are added in later phases as each is actually
-- needed - see doc section 21 (Development Order). Adding all tables
-- upfront before there's code that uses them is exactly the kind of
-- over-engineering the project explicitly wants to avoid.

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  github_id      BIGINT UNIQUE NOT NULL,
  username       TEXT NOT NULL,
  avatar_url     TEXT,
  email          TEXT,
  -- GitHub OAuth access token. In production this should be encrypted
  -- at rest (e.g. via pgcrypto or app-level encryption) - flagged here,
  -- not solved yet, so it isn't forgotten before Phase 7 (Security).
  github_access_token TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
