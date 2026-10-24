# Backend

Express API + BullMQ worker. Project overview, architecture and design
decisions are in the root `README.md`; production deployment in
`docs/DEPLOYMENT.md`.

## Layout

```
src/
  app.js                 API entry: middleware order, /health, startup + graceful shutdown
  workers/review.worker.js  Worker entry: consumes review jobs (separate process)
  config/                env validation, db pool + withTransaction, pino logger, passport
  middleware/            requireAuth, requireRepoAccess (+ param validation),
                         verifyGitHubSignature, rate limiters
  routes/ controllers/   HTTP layer (thin)
  services/              review pipeline, fingerprinting, analytics, GitHub + AI clients
  queues/                BullMQ queue (producer side)
  db/migrate.js          forward-only SQL migration runner
  migrations/            numbered .sql files, applied in order on API boot
  utils/                 diff budgeting, fingerprint math, AES-256-GCM token encryption
  tests/                 Jest unit tests (no DB/Redis/network needed)
```

## Request flow (review)

`POST /api/reviews` → `createQueuedReview` (PR row + review row) → `enqueueReview`
(job data has no token) → worker loads the user's token from the DB →
`processQueuedReview`: fetch diff → filter/budget → AI → fingerprint + insert
findings in one transaction → mark resolved → complete. Earlier attempts that fail
leave the review `running` for BullMQ to retry; only the final attempt marks it `failed`.

Webhooks (`POST /api/webhooks/github`) follow the same path after HMAC verification
and delivery-id idempotency.

## Running

Usually via Docker from the repo root: `docker compose up --build`
(app on http://localhost, API debug port 4000 from `docker-compose.override.yml`).

Without Docker (needs local Postgres + Redis):

```
npm install
cp ../.env.example .env   # fill in values; startup fails fast listing anything missing
createdb code_quality_analytics
npm run dev               # API on :4000, runs pending migrations first
npm run worker            # separate terminal
npm test
```

`GET /health` returns 200 only when Postgres and Redis are reachable (503 otherwise).

## Schema changes

Add a new file `src/migrations/NNN_description.sql` (next number). It runs once,
inside a transaction, on the next API start, and is recorded in `schema_migrations`.
Never edit a migration that has already been applied anywhere.

## Things to know

- `TOKEN_ENCRYPTION_KEY` rotation makes stored GitHub tokens undecryptable; affected
  users are logged out and must sign in again (no data loss).
- Logs never include query strings, request bodies or tokens (see `config/logger.js`).
  Every request has an `X-Request-Id`, also logged as `reqId`.
- Express 4 does not catch rejected promises in async handlers: every async
  handler must `try/catch` and call `next(err)` (or respond) itself.
