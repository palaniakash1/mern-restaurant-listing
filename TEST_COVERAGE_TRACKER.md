# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-11

| Metric | Value |
| --- | --- |
| Lines | 90.42% |
| Branches | 69.89% |
| Functions | 88.92% |
| Tests Passing | 104/104 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Blocked locally (`k6` unavailable) |

## Current Batch

Scope:
- added [app-request-logger.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/app-request-logger.test.js)
- covered request logging body/response/error branches and app `OPTIONS` / metrics-token guard branches
- stabilized [controller-branch-2.integration.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/controller-branch-2.integration.test.js) with fixture retries for transient setup collisions
- revalidated `test`, `lint`, `coverage`, and `audit`

Notes:
- tracing lifecycle tests still emit collector shutdown warnings when no OTLP collector is listening on `127.0.0.1:4318` / `::1:4318`
- those warnings do not fail the suite

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
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | 86.02% | 38.53% | 93.55% | High |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) | 77.67% | 35.33% | 91.43% | High |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) | 76.77% | 29.23% | 85.71% | High |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) | 72.05% | 67.11% | 96.15% | High |
| [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js) | 94.24% | 90.00% | 66.67% | Medium |
| [healthCheck.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/healthCheck.js) | 93.10% | 74.36% | 100.00% | Medium |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) | 92.91% | 79.55% | 89.47% | Medium |
| [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js) | 100.00% | 100.00% | 100.00% | Medium |
| [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) | 93.31% | 75.68% | 82.61% | Medium |
| [admin.repository.js](/d:/MARAA/coding-projects/mern-restaurant/api/repositories/admin.repository.js) | 36.06% | 100.00% | 13.33% | High |

## Next Batches

1. Runtime reliability batch
   - continue filling remaining lines in [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)
   - add direct tests around [metrics.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/metrics.js) and remaining [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) paths

2. Remaining controller batch
   - keep pushing [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js)
   - continue filling branch gaps in [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js)
   - continue filling branch gaps in [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js)

3. App/bootstrap batch
   - improve coverage for [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js)
   - validate more middleware wiring and startup branches

4. Repository depth batch
   - add direct tests for [admin.repository.js](/d:/MARAA/coding-projects/mern-restaurant/api/repositories/admin.repository.js)
   - close the large line/function gap in repository coverage

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-11 | 90.42% | 69.89% | 88.92% | App/bootstrap batch completed; request logger and metrics/options coverage added |
| 2026-03-11 | 90.23% | 69.09% | 88.62% | Runtime reliability batch completed; Redis, health, logger, and telemetry coverage expanded |
| 2026-03-11 | 89.72% | 67.74% | 88.46% | Added `controller-branch-2` and improved controller branch coverage |
| 2026-03-11 | 89.47% | 66.73% | 88.31% | Controller-branch test stabilized; full gates green |
