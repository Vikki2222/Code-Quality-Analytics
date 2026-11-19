-- Redesign v1: per-user tracked repositories, health history, and which
-- review resolved a fingerprint.

-- Repos a user has chosen to follow (the Portfolio). Separate from GitHub's
-- full repo list so the home screen shows only what the user cares about.
CREATE TABLE IF NOT EXISTS tracked_repos (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_owner  TEXT NOT NULL,
  repository_name   TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, repository_owner, repository_name)
);

-- Health score recorded after every completed review. Health is otherwise
-- computed live from current state, which can't answer "better or worse
-- than last week?".
CREATE TABLE IF NOT EXISTS repo_health_snapshots (
  id                SERIAL PRIMARY KEY,
  repository_owner  TEXT NOT NULL,
  repository_name   TEXT NOT NULL,
  review_id         INTEGER REFERENCES reviews(id) ON DELETE SET NULL,
  score             INTEGER NOT NULL,
  open_count        INTEGER NOT NULL,
  recurring_count   INTEGER NOT NULL,
  resolved_count    INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots_repo_time
  ON repo_health_snapshots(repository_owner, repository_name, created_at DESC);

-- Most recent resolution of a fingerprint ("resolved by this PR").
ALTER TABLE finding_fingerprints
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by_review_id INTEGER REFERENCES reviews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_findings_fingerprint_id ON findings(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_resolved_by ON finding_fingerprints(resolved_by_review_id);
