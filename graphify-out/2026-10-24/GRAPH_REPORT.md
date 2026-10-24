# Graph Report - Code-Quality-Analytics  (2026-10-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 329 nodes · 522 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cd7c284b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- query
- frontend/package.json
- webhook.routes.js
- analytics.routes.js
- review.service.test.js
- backend/package.json
- dependencies
- github.service.js
- review.controller.js
- fingerprint.service.js
- app.js
- Dashboard.jsx
- auth.routes.js
- db.js
- rateLimiter.js
- .oxlintrc.json
- scripts
- passport.js
- devDependencies
- FindingsList.jsx

## God Nodes (most connected - your core abstractions)
1. `query()` - 28 edges
2. `App()` - 8 edges
3. `AnalyticsView()` - 8 edges
4. `createReview()` - 8 edges
5. `buildReviewPayload()` - 8 edges
6. `fingerprintFinding()` - 8 edges
7. `react` - 8 edges
8. `processQueuedReview()` - 7 edges
9. `api` - 7 edges
10. `express` - 7 edges

## Surprising Connections (you probably didn't know these)
- `getRepoHistory()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/review.controller.js → backend/src/config/db.js
- `getReview()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/review.controller.js → backend/src/config/db.js
- `AnalyticsView()` --calls--> `TrendChart()`  [EXTRACTED]
  frontend/src/views/AnalyticsView.jsx → frontend/src/components/TrendChart.jsx
- `fingerprintFinding()` --calls--> `query()`  [EXTRACTED]
  backend/src/services/fingerprint.service.js → backend/src/config/db.js
- `recordOccurrence()` --calls--> `query()`  [EXTRACTED]
  backend/src/services/fingerprint.service.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (21 total, 1 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.11
Nodes (20): api, loginWithGitHub(), App(), LoginScreen(), FindingCard(), SEVERITY_COLOR, HealthBar(), Metric() (+12 more)

### Community 1 - "query"
Cohesion: 0.13
Nodes (29): query(), getDashboard(), getFileHotspots(), getIssueTrends(), getRecurringIssues(), getRepositoryHealth(), { query }, SEVERITY_WEIGHTS (+21 more)

### Community 2 - "frontend/package.json"
Cohesion: 0.07
Nodes (29): dependencies, react, react-dom, recharts, devDependencies, oxlint, tailwindcss, @tailwindcss/vite (+21 more)

### Community 3 - "webhook.routes.js"
Cohesion: 0.12
Nodes (19): crypto, { enqueueReview }, express, logger, { query }, reviewService, router, userService (+11 more)

### Community 4 - "analytics.routes.js"
Cohesion: 0.10
Nodes (15): analyticsService, getDashboard(), analyticsController, express, requireAuth, router, express, githubController (+7 more)

### Community 5 - "review.service.test.js"
Cohesion: 0.11
Nodes (16): analyzeDiff(), client, geminiClient, OpenAI, parseAndValidateFindings(), VALID_CATEGORIES, VALID_SEVERITIES, aiService (+8 more)

### Community 6 - "backend/package.json"
Cohesion: 0.11
Nodes (17): jest, testEnvironment, main, name, private, type, version, connect-pg-simple (+9 more)

### Community 7 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, axios, bullmq, connect-pg-simple, cors, crypto, dotenv, express (+10 more)

### Community 8 - "github.service.js"
Cohesion: 0.19
Nodes (14): getPullRequestFiles(), githubService, axios, getPullRequest(), getPullRequestFiles(), githubClient(), listPullRequests(), listUserRepositories() (+6 more)

### Community 9 - "review.controller.js"
Cohesion: 0.12
Nodes (15): createReview(), { enqueueReview }, getRepoHistory(), getReview(), { query }, reviewService, connection, enqueueReview() (+7 more)

### Community 10 - "fingerprint.service.js"
Cohesion: 0.21
Nodes (13): aiService, { computeStructuralKey, findBestMatch }, fingerprintFinding(), { query }, recordOccurrence(), {
  normalizeTitle,
  computeStructuralKey,
  cosineSimilarity,
  findBestMatch,
  SIMILARITY_THRESHOLD,
}, computeStructuralKey(), cosineSimilarity() (+5 more)

### Community 11 - "app.js"
Cohesion: 0.12
Nodes (15): analyticsRoutes, { apiLimiter, reviewLimiter, authLimiter }, app, authRoutes, cors, express, githubRoutes, helmet (+7 more)

### Community 12 - "Dashboard.jsx"
Cohesion: 0.24
Nodes (10): COLORS, CustomTooltip(), TrendChart(), AnalyticsDashboard(), CATEGORY_COLORS, HealthScore(), Hotspots(), RecurringIssues() (+2 more)

### Community 13 - "auth.routes.js"
Cohesion: 0.22
Nodes (5): logout(), authController, express, passport, router

### Community 14 - "db.js"
Cohesion: 0.25
Nodes (6): logger, { Pool }, logger, pino, pg, pino

### Community 15 - "rateLimiter.js"
Cohesion: 0.33
Nodes (5): apiLimiter, authLimiter, rateLimit, reviewLimiter, express-rate-limit

### Community 16 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 17 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, start, test, worker

### Community 18 - "passport.js"
Cohesion: 0.40
Nodes (4): passport, userService, passport, passport-github2

### Community 19 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, jest, nodemon, pino-pretty

## Knowledge Gaps
- **11 isolated node(s):** `oxlint`, `tailwindcss`, `@types/react`, `@types/react-dom`, `connect-pg-simple` (+6 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `backend/package.json`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `oxlint`, `tailwindcss`, `@types/react` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11095305832147938 - nodes in this community are weakly interconnected._
- **Why does `query()` connect `query` to `webhook.routes.js`, `review.service.test.js`, `review.controller.js`, `fingerprint.service.js`, `db.js`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.1265597147950089 - nodes in this community are weakly interconnected._
- **Why does `express` connect `analytics.routes.js` to `webhook.routes.js`, `app.js`, `auth.routes.js`, `backend/package.json`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06881720430107527 - nodes in this community are weakly interconnected._