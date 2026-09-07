# Code Quality Analytics — Frontend (Phase 2 MVP)

Minimal functional UI to replace Postman for testing: log in, pick a
repo, pick a PR, run a review, see findings. Not the polished Phase 5
dashboard — just enough to exercise the backend through a real browser
session instead of manually copying cookies.

## Setup

```
npm install
npm run dev
```

Visit `http://localhost:5173`. Make sure the backend is running on
`http://localhost:4000` first (`npm run dev` in `backend/`).

## How auth works here (no more cookie copying)

- Clicking "Continue with GitHub" does a full page navigation to
  `http://localhost:4000/api/auth/github` (not a fetch) - GitHub OAuth
  requires a real browser redirect.
- After GitHub redirects back through the backend's callback, the
  backend redirects to `http://localhost:5173/dashboard` (this app).
- All other API calls (`/api/github/...`, `/api/reviews`) go through
  Vite's dev proxy (see `vite.config.js`) as relative `/api/...`
  requests - they're same-origin from the browser's perspective, so
  the session cookie is sent automatically. No manual cookie handling
  needed.

## Known shortcuts (intentional for this MVP)
- No router - view switching is plain React state. Fine for 2 screens;
  revisit with React Router once there's a real dashboard with more
  pages (Phase 5).
- No loading skeletons / polished error states - functional, not
  final. The Phase 5 dashboard is where real design effort belongs.
- Repo/PR selection resets review state naively; no caching of
  previously-run reviews client-side yet.
