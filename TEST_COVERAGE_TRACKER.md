# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-11

| Metric | Value |
| --- | --- |
| Lines | 89.72% |
| Branches | 67.74% |
| Functions | 88.46% |
| Tests Passing | 97/97 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Blocked locally (`k6` unavailable) |

## Current Batch

Scope:
- added [controller-branch-2.integration.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/controller-branch-2.integration.test.js)
- expanded controller failure-path coverage across restaurant, category, and menu flows
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
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | 86.02% | 37.96% | 93.55% | High |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) | 77.67% | 35.33% | 91.43% | High |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) | 76.77% | 29.23% | 85.71% | High |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) | 65.88% | 60.00% | 96.00% | High |
| [healthCheck.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/healthCheck.js) | 76.63% | 52.17% | 90.91% | Medium |
| [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js) | 82.01% | 40.00% | 50.00% | Medium |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) | 87.40% | 74.36% | 78.95% | Medium |
| [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js) | 77.63% | 82.35% | 66.67% | Medium |

## Next Batches

1. Runtime reliability batch
   - add deeper edge/error coverage for [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)
   - expand branch coverage in [healthCheck.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/healthCheck.js)
   - expand [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) and [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js)

2. Remaining controller batch
   - keep pushing [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js)
   - continue filling branch gaps in [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js)
   - continue filling branch gaps in [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js)

3. App/bootstrap batch
   - improve coverage for [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js)
   - validate more middleware wiring and startup branches

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-11 | 89.72% | 67.74% | 88.46% | Added `controller-branch-2` and improved controller branch coverage |
| 2026-03-11 | 89.47% | 66.73% | 88.31% | Controller-branch test stabilized; full gates green |
