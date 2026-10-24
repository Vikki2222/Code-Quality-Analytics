# Deployment (Coolify)

## Topology

```
Internet ─HTTPS─> Coolify proxy (Traefik) ─> frontend (nginx :80) ─/api/─> api (:4000)
                                                                           │
                                       worker ─────────────┬───────────────┤
                                                           │               │
                                                       redis (queue)   postgres (data)
```

- Only `frontend` gets a domain. `api`, `worker`, `postgres` and `redis` publish no ports.
- `docker-compose.yml` is the production file. `docker-compose.override.yml` is local-only
  (publishes 80/4000) and must not be used on Coolify.
- Persistent data: volumes `postgres_data` (everything that matters) and `redis_data`
  (queue only; losing it loses in-flight jobs, not results).

## Before the first deploy

1. **GitHub OAuth App for production** (separate from the dev one), at
   github.com/settings/developers:
   - Homepage URL: `https://<your-domain>`
   - Callback URL: `https://<your-domain>/api/auth/github/callback`
2. **Generate fresh secrets.** Never reuse local values:
   ```bash
   openssl rand -hex 32   # SESSION_SECRET
   openssl rand -hex 32   # TOKEN_ENCRYPTION_KEY (must be exactly 64 hex chars)
   openssl rand -hex 32   # GITHUB_WEBHOOK_SECRET
   openssl rand -hex 24   # POSTGRES_PASSWORD (hex keeps it URL-safe for DATABASE_URL)
   ```
   Store them in your password manager. Losing `TOKEN_ENCRYPTION_KEY` logs every user out.
3. **Set `POSTGRES_PASSWORD` before the first deploy.** Postgres only reads it when the
   volume is first created. Changing it later requires `ALTER USER` inside the database.

## Coolify setup

1. New resource → your Git repository → build pack **Docker Compose**, compose file
   `docker-compose.yml`.
2. Assign the domain to the **frontend** service, port 80, with HTTPS enabled.
3. Environment variables (Coolify passes them into compose's `${...}` substitution):

   | Variable | Value |
   |---|---|
   | `FRONTEND_URL` | `https://<your-domain>` |
   | `GITHUB_CALLBACK_URL` | `https://<your-domain>/api/auth/github/callback` |
   | `TRUST_PROXY_HOPS` | `2` (Traefik + nginx). See "Verify proxy hops" below. |
   | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | from the production OAuth App |
   | `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GITHUB_WEBHOOK_SECRET`, `POSTGRES_PASSWORD` | generated above |
   | `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | provider keys |

   `NODE_ENV`, `DATABASE_URL`, `REDIS_URL` and `LOG_LEVEL` are set in the compose file.
4. Deploy. In the deployment log, confirm that no host ports are published for `api` and
   `frontend` (that would mean the override file was picked up).

## Verify after deploy

- [ ] All five containers are running, and `api` reports healthy. Its healthcheck calls
      `/health`, which fails when Postgres or Redis is unreachable.
- [ ] API logs show `Applied migration` (first deploy) or nothing pending, then `Server started`.
- [ ] `curl -i https://<domain>/api/auth/me` returns `401` with an `X-Request-Id` header.
- [ ] Sign in with GitHub. Afterwards the `connect.sid` cookie is `Secure; HttpOnly; SameSite=Lax`.
- [ ] Open a repo dashboard, run a review, and see it complete. Worker logs show
      `Review job completed` with a duration.
- [ ] **Verify proxy hops.** Call `/api/auth/me` from two different networks (e.g.
      laptop Wi-Fi and phone on mobile data) and compare `RateLimit-Remaining`. Each
      network should have its own counter. If both decrement one shared counter,
      `TRUST_PROXY_HOPS` is too low and every user shares one rate limit.

## Webhooks (optional auto-review)

Per repository: Settings → Webhooks → Add webhook

- Payload URL: `https://<domain>/api/webhooks/github`
- Content type: **application/json** (form-encoded deliveries are rejected with 400)
- Secret: `GITHUB_WEBHOOK_SECRET`
- Events: Pull requests

Reviews run only for repos **owned by a user who has signed in**. Organisation-owned repos
are ignored and logged as `no_connected_user`. If processing fails after GitHub got its 200,
use **Redeliver** in GitHub's webhook delivery log; the app frees the delivery id for that.

## Operations

**Logs.** These are JSON lines (pino). Useful fields:
- `reqId`: matches the `X-Request-Id` a user can report.
- `userId`, `reviewId`, `jobId`.
- `level` 50 means error and 60 means fatal.

Query strings and tokens are never logged.

**Redeploys.**
- The API drains in-flight requests (up to 10s).
- The worker waits for active reviews, up to `stop_grace_period: 4m`. A job that is still
  killed is retried by BullMQ as stalled.
- The worker starts only after the API is healthy, which means migrations are applied.

**Schema changes.** Add `backend/src/migrations/NNN_name.sql`. It applies once on the next API
start, inside a transaction. A failed migration stops the API from starting and leaves the
database unchanged. Fix it and redeploy.

**Backups.** Coolify's scheduled backups may only cover database resources it manages
itself, not a Postgres service inside a compose file. Check this in your Coolify version.
Otherwise, run a nightly dump from the host and copy it off the server:
```bash
docker exec <postgres-container> pg_dump -U postgres -Fc code_quality_analytics > cqa-$(date +%F).dump
# restore: docker exec -i <postgres-container> pg_restore -U postgres -d code_quality_analytics --clean < file.dump
```
Test a restore before you rely on it.

**Rotating secrets.**
- `SESSION_SECRET`: everyone is logged out once.
- `TOKEN_ENCRYPTION_KEY`: stored GitHub tokens become undecryptable. Affected users are
  logged out and their next login re-encrypts the token. Webhook reviews for those users
  pause until they sign in again.
- `GITHUB_WEBHOOK_SECRET`: update GitHub's webhook settings at the same time. Deliveries
  fail with 401 in between, and you can redeliver them afterwards.

## Scaling notes

The setup assumes one `api` replica. The rate-limit counters and the 5-minute repo-access
cache are in-process. With several replicas, limits apply per replica and access
revocations take up to 5 min per replica. Move the rate-limit store to Redis before
scaling out. The worker can scale (`concurrency: 2` per process), but free-tier AI rate
limits usually come first.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| API exits at boot with `Invalid environment configuration` | A variable is missing or malformed. The message lists them. |
| Login loops back to the sign-in screen | `GITHUB_CALLBACK_URL`/`FRONTEND_URL` don't match the domain, or the OAuth App callback differs |
| `GitHub sign-in was cancelled or failed` | The OAuth App callback URL doesn't exactly match `GITHUB_CALLBACK_URL` |
| All users get 429 together | `TRUST_PROXY_HOPS` is too low (see above) |
| `api` unhealthy, logs `Health check failed` | Postgres or Redis is unreachable. The log line says which. |
| Reviews stay "running" | The worker isn't running, or it can't reach Redis. Check the worker logs. |
| Webhook deliveries return 401 | The secret differs between GitHub and `GITHUB_WEBHOOK_SECRET` |
