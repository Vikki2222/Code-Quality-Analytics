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
-- Phase 4: Code Quality Memory (fingerprinting + lifecycle)

CREATE TABLE IF NOT EXISTS finding_fingerprints (
  id                    SERIAL PRIMARY KEY,
  repository_owner      TEXT NOT NULL,
  repository_name       TEXT NOT NULL,
  file_path             TEXT NOT NULL,
  category              TEXT NOT NULL,

  -- Tier 1: exact/near-exact match key (repo+file+category+normalized title)
  structural_key        TEXT NOT NULL,

  -- Tier 2: embedding of the representative title+description, used for
  -- fuzzy matching within the same repo+file+category bucket. Stored as
  -- a plain JSON float array rather than pgvector - at this project's
  -- scale (one user, a handful of repos), comparing a few candidate
  -- embeddings in application code is simpler and fast enough. Revisit
  -- with pgvector only if this ever needs to scale to many repos/orgs.
  embedding             JSONB,

  representative_title  TEXT NOT NULL,
  occurrence_count      INTEGER NOT NULL DEFAULT 1,

  -- Lifecycle: open (seen once or more, still showing up) |
  -- resolved (hasn't appeared in N most recent reviews of this file) |
  -- recurring (reappeared after being marked resolved)
  status                TEXT NOT NULL DEFAULT 'open',

  first_detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (repository_owner, repository_name, file_path, category, structural_key)
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_bucket
  ON finding_fingerprints(repository_owner, repository_name, file_path, category);

-- Link each finding to the fingerprint group it belongs to. Nullable
-- because Phase 2/3 findings already exist without one - backfilling
-- those is optional, not required for new findings to work correctly.
ALTER TABLE findings ADD COLUMN IF NOT EXISTS fingerprint_id INTEGER REFERENCES finding_fingerprints(id);

-- Phase 6: Automation (webhooks)
-- Tracks GitHub's delivery ID for each webhook event we've processed,
-- so a redelivered webhook (GitHub retries on timeout/5xx) doesn't
-- trigger a duplicate review job.
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            SERIAL PRIMARY KEY,
  delivery_id   TEXT UNIQUE NOT NULL,  -- from the X-GitHub-Delivery header
  event_type    TEXT NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);