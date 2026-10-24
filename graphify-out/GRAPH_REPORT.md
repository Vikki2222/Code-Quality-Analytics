# Graph Report - Code-Quality-Analytics  (2026-10-24)

## Corpus Check
- 62 files · ~19,738 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .worker 1, .tgz 1)

## Summary
- 412 nodes · 636 edges · 19 communities (16 shown, 3 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cd7c284b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- query
- frontend/package.json
- user.service.js
- review.controller.js
- review.service.test.js
- backend/package.json
- dependencies
- github.service.js
- webhook.controller.js
- fingerprint.service.js
- app.js
- Code Quality Analytics
- diffBudget.js
- Code Quality Analytics — Backend (Phase 1: Foundation)
- CLAUDE.md
- .oxlintrc.json
- .claude/CLAUDE.md
- FindingsList.jsx

## God Nodes (most connected - your core abstractions)
1. `query()` - 26 edges
2. `Code Quality Analytics` - 9 edges
3. `createReview()` - 8 edges
4. `processQueuedReview()` - 8 edges
5. `buildReviewPayload()` - 8 edges
6. `react` - 8 edges
7. `App()` - 8 edges
8. `AnalyticsView()` - 8 edges
9. `express` - 7 edges
10. `requireRepoAccess()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `getRepoHistory()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/review.controller.js → backend/src/config/db.js
- `getReview()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/review.controller.js → backend/src/config/db.js
- `handleGitHubWebhook()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/webhook.controller.js → backend/src/config/db.js
- `findByGitHubUsername()` --calls--> `query()`  [EXTRACTED]
  backend/src/services/user.service.js → backend/src/config/db.js
- `findById()` --calls--> `query()`  [EXTRACTED]
  backend/src/services/user.service.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (19 total, 3 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (31): api, loginWithGitHub(), App(), LoginScreen(), FindingCard(), SEVERITY_COLOR, HealthBar(), Metric() (+23 more)

### Community 1 - "query"
Cohesion: 0.09
Nodes (39): logger, { Pool }, query(), withTransaction(), getDashboard(), getFileHotspots(), getIssueTrends(), getRecurringIssues() (+31 more)

### Community 2 - "frontend/package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, recharts, devDependencies, oxlint, tailwindcss, @tailwindcss/vite (+20 more)

### Community 3 - "user.service.js"
Cohesion: 0.07
Nodes (27): crypto, logger, decryptUser(), { encrypt, decrypt }, findByGitHubUsername(), findById(), findOrCreateFromGitHubProfile(), { query } (+19 more)

### Community 4 - "review.controller.js"
Cohesion: 0.08
Nodes (27): analyticsService, getDashboard(), { enqueueReview }, getRepoHistory(), getReview(), { hasRepoAccess }, { query }, reviewService (+19 more)

### Community 5 - "review.service.test.js"
Cohesion: 0.22
Nodes (8): analyzeDiff(), client, geminiClient, OpenAI, parseAndValidateFindings(), VALID_CATEGORIES, VALID_SEVERITIES, openai

### Community 6 - "backend/package.json"
Cohesion: 0.06
Nodes (30): devDependencies, jest, nodemon, pino-pretty, jest, testEnvironment, main, name (+22 more)

### Community 7 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, axios, bullmq, connect-pg-simple, cors, crypto, dotenv, express (+10 more)

### Community 8 - "github.service.js"
Cohesion: 0.11
Nodes (22): errSerializer(), logger, pino, getPullRequestFiles(), githubService, axios, canAccessRepository(), getPullRequest() (+14 more)

### Community 9 - "webhook.controller.js"
Cohesion: 0.10
Nodes (19): createReview(), { enqueueReview }, handleGitHubWebhook(), logger, { query }, REVIEW_ACTIONS, reviewService, userService (+11 more)

### Community 10 - "fingerprint.service.js"
Cohesion: 0.31
Nodes (8): {
  normalizeTitle,
  computeStructuralKey,
  cosineSimilarity,
  findBestMatch,
  SIMILARITY_THRESHOLD,
}, computeStructuralKey(), cosineSimilarity(), crudeStem(), crypto, findBestMatch(), normalizeTitle(), STOPWORDS

### Community 11 - "app.js"
Cohesion: 0.05
Nodes (34): analyticsRoutes, { apiLimiter, reviewLimiter, authLimiter }, app, authRoutes, cors, express, githubRoutes, helmet (+26 more)

### Community 12 - "Code Quality Analytics"
Cohesion: 0.10
Nodes (20): AI identifies, application calculates, Architecture, Async job architecture, Backend, Code Quality Analytics, Diff filtering before AI, Frontend, GitHub OAuth App setup (+12 more)

### Community 13 - "diffBudget.js"
Cohesion: 0.38
Nodes (7): {
  filterNoiseFiles,
  rankFilesBySignal,
  applyTokenBudget,
  buildReviewPayload,
}, applyTokenBudget(), buildReviewPayload(), filterNoiseFiles(), IGNORED_PATH_PATTERNS, rankFilesBySignal(), scoreFile()

### Community 14 - "Code Quality Analytics — Backend (Phase 1: Foundation)"
Cohesion: 0.33
Nodes (5): Code Quality Analytics — Backend (Phase 1: Foundation), Known Phase 1 shortcuts (intentional, revisit later), Next, Setup, What's here

### Community 16 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

## Knowledge Gaps
- **11 isolated node(s):** `@node-rs/argon2`, `connect-pg-simple`, `dotenv`, `ioredis`, `jest` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 233 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `backend/package.json`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `query()` (e.g. with `db.js` and `review.service.test.js`) actually correct?**
  _`query()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@node-rs/argon2`, `connect-pg-simple`, `dotenv` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0792156862745098 - nodes in this community are weakly interconnected._
- **Why does `query()` connect `query` to `webhook.controller.js`, `user.service.js`, `review.controller.js`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Why does `express` connect `app.js` to `review.controller.js`, `backend/package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._