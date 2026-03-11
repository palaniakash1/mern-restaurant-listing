# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-11

| Metric | Value |
| --- | --- |
| Lines | 92.25% |
| Branches | 72.23% |
| Functions | 93.28% |
| Tests Passing | 113/113 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Blocked locally (`k6` unavailable) |

## Current Batch

Scope:
- expanded [runtime-hardening.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/runtime-hardening.test.js) for Redis serialization/parse failures, metrics status-class/error forwarding, and tracing no-op metrics
- improved runtime coverage for [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js), [metrics.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/metrics.js), and [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js)
- revalidated `test`, `lint`, `coverage`, and `audit`
- revalidated `test`, `lint`, `coverage`, and `audit`

Notes:
- tracing lifecycle tests still emit collector shutdown warnings when no OTLP collector is listening on `127.0.0.1:4318` / `::1:4318`
- those warnings do not fail the suite
- `k6` scripts are wired as `npm run test:load` and `npm run test:load:smoke`, but the runner is not installed in this environment

## Verified Commands

```powershell
npm test
npm run lint
npm run test:coverage
npm audit --audit-level=high
```

## High-Value Coverage Targets

| Module | Lines | Branches | Functions | Priority |
| --- | --- | --- | --- | --- |
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | 87.22% | 42.45% | 93.55% | High |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) | 77.80% | 35.54% | 91.43% | High |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) | 78.33% | 31.20% | 88.57% | High |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) | 74.35% | 72.62% | 96.15% | High |
| [admin.repository.js](/d:/MARAA/coding-projects/mern-restaurant/api/repositories/admin.repository.js) | 98.89% | 95.08% | 100.00% | Medium |
| [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) | 94.88% | 80.00% | 96.15% | Medium |
| [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js) | 87.86% | 79.07% | 84.62% | Medium |
| [metrics.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/metrics.js) | 97.39% | 81.82% | 100.00% | Medium |

## Next Batches

1. Runtime reliability batch
   - continue filling remaining lines in [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)
   - close the remaining collector-shutdown and invalid-trace-id branches in [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js)

2. Remaining controller batch
   - keep pushing [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) on reorder, deleted-menu listing, and audit filter branches
   - continue filling branch gaps in [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) on create/update ownership and listing filters
   - continue filling branch gaps in [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) on export, bulk reorder/idempotency, and restore/hard-delete branches

3. Load and operations batch
   - install `k6` in local/CI runner environments
   - validate `npm run test:load` and `npm run test:load:smoke`
   - capture baseline latency/error thresholds for auth/session/refresh

4. App/bootstrap follow-up
   - improve coverage for [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js)
   - validate more middleware wiring and startup branches

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-11 | 92.25% | 72.23% | 93.28% | Runtime follow-up batch completed; Redis parse/serialization, metrics error paths, and tracing no-op metric coverage added |
| 2026-03-11 | 92.16% | 71.77% | 92.91% | Repository/auth batch completed; admin repository tests added, `lastLoginAt` integrated, `k6` scripts wired |
| 2026-03-11 | 90.76% | 70.90% | 89.18% | Controller branch batch completed; new restaurant/category/menu failure-path coverage added |
| 2026-03-11 | 90.42% | 69.89% | 88.92% | App/bootstrap batch completed; request logger and metrics/options coverage added |
| 2026-03-11 | 90.23% | 69.09% | 88.62% | Runtime reliability batch completed; Redis, health, logger, and telemetry coverage expanded |
| 2026-03-11 | 89.72% | 67.74% | 88.46% | Added `controller-branch-2` and improved controller branch coverage |
| 2026-03-11 | 89.47% | 66.73% | 88.31% | Controller-branch test stabilized; full gates green |
