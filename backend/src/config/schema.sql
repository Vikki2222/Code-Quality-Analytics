-- Phase 1: Foundation
CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  github_id           BIGINT UNIQUE NOT NULL,
  username            TEXT NOT NULL,
  avatar_url          TEXT,
  email               TEXT,
  github_access_token TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 2: PR Review MVP
CREATE TABLE IF NOT EXISTS pull_requests (
  id                SERIAL PRIMARY KEY,
  github_id         BIGINT UNIQUE NOT NULL,
  repository_owner  TEXT NOT NULL,
  repository_name   TEXT NOT NULL,
  number            INTEGER NOT NULL,
  title             TEXT NOT NULL,
  author_username   TEXT,
  state             TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_at         TIMESTAMPTZ,
  UNIQUE (repository_owner, repository_name, number)
);

CREATE TABLE IF NOT EXISTS reviews (
  id                    SERIAL PRIMARY KEY,
  pull_request_id       INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  requested_by_user_id  INTEGER NOT NULL REFERENCES users(id),
  status                TEXT NOT NULL DEFAULT 'queued',
  model                 TEXT,
  partial_analysis      BOOLEAN NOT NULL DEFAULT false,
  skipped_files         JSONB,
  error_message         TEXT,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 4: fingerprints must exist BEFORE findings references it
CREATE TABLE IF NOT EXISTS finding_fingerprints (
  id                    SERIAL PRIMARY KEY,
  repository_owner      TEXT NOT NULL,
  repository_name       TEXT NOT NULL,
  file_path             TEXT NOT NULL,
  category              TEXT NOT NULL,
  structural_key        TEXT NOT NULL,
  embedding             JSONB,
  representative_title  TEXT NOT NULL,
  occurrence_count      INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'open',
  first_detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repository_owner, repository_name, file_path, category, structural_key)
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_bucket
  ON finding_fingerprints(repository_owner, repository_name, file_path, category);

-- findings now references finding_fingerprints which already exists above
CREATE TABLE IF NOT EXISTS findings (
  id              SERIAL PRIMARY KEY,
  review_id       INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  pull_request_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  severity        TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  line_number     INTEGER,
  function_name   TEXT,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  recommendation  TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  fingerprint_id  INTEGER REFERENCES finding_fingerprints(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_findings_review_id ON findings(review_id);
CREATE INDEX IF NOT EXISTS idx_findings_pull_request_id ON findings(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pull_request_id ON reviews(pull_request_id);

-- Phase 6: Webhooks
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           SERIAL PRIMARY KEY,
  delivery_id  TEXT UNIQUE NOT NULL,
  event_type   TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);