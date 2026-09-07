# Code Quality Analytics — Backend (Phase 1: Foundation)

## What's here
- Express server with GitHub OAuth (via Passport) as the sole identity provider
- PostgreSQL connection (raw `pg`, no ORM — kept simple until there's a real reason to add one)
- `users` table only — other tables are added in later phases when they're actually needed

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a Postgres database and run the schema:
   ```
   createdb code_quality_analytics
   psql code_quality_analytics -f src/config/schema.sql
   ```

3. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL`
   - `SESSION_SECRET` (any long random string)
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — create an OAuth App at
     https://github.com/settings/developers
     - Homepage URL: `http://localhost:5173`
     - Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
       (must match `GITHUB_CALLBACK_URL` exactly)

4. Run the dev server:
   ```
   npm run dev
   ```

5. Verify:
   - `GET http://localhost:4000/health` → `{ "status": "ok" }`
   - Visit `http://localhost:4000/api/auth/github` in a browser → should
     redirect to GitHub's OAuth consent screen → redirect back to
     `FRONTEND_URL/dashboard` on success.
   - `GET http://localhost:4000/api/auth/me` (with the session cookie) →
     returns the logged-in user.

## Known Phase 1 shortcuts (intentional, revisit later)
- Session store is in-memory (`express-session` default). Fine for local
  dev; swap for `connect-pg-simple` or `connect-redis` before Phase 7.
- `github_access_token` is stored in plaintext. Encrypt at rest before
  any real deployment — flagged in `schema.sql`.
- No rate limiting yet — add before exposing any public endpoint (Phase 7).

## Next
Phase 1 also needs: GitHub API integration (list a user's repos) before
moving to Phase 2 (PR review MVP). That's the next file to build.
