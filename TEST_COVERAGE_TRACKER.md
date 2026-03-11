# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-11

| Metric | Value |
| --- | --- |
| Lines | 89.47% |
| Branches | 66.73% |
| Functions | 88.31% |
| Tests Passing | 94/94 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Blocked locally (`k6` unavailable) |

## Current Batch

Scope:
- stabilized [controller-branch.integration.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/controller-branch.integration.test.js)
- restored green gates for `test`, `lint`, `coverage`, and `audit`
- kept the new controller-branch suite focused on deterministic restaurant failure paths

Notes:
- The tracing lifecycle tests still log collector shutdown warnings when no OTLP collector is running on `127.0.0.1:4318` / `::1:4318`, but the suite passes

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
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | 85.21% | 32.35% | 93.55% | High |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) | 77.54% | 34.73% | 91.43% | High |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) | 76.25% | 26.77% | 85.71% | High |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) | 65.88% | 60.00% | 96.00% | High |
| [healthCheck.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/healthCheck.js) | 76.63% | 52.17% | 90.91% | Medium |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) | 87.40% | 74.36% | 78.95% | Medium |
| [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js) | 77.63% | 82.35% | 66.67% | Medium |
| [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js) | 82.01% | 40.00% | 50.00% | Medium |

## Next Batches

1. Controller branch batch
   - Expand failure-path integration tests for [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js)
   - Expand failure-path integration tests for [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js)
   - Start closing the larger branch gap in [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js)

2. Runtime reliability batch
   - Add deeper edge/error coverage for [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)
   - Add more branch coverage for [healthCheck.js](/d:/MARAA/coding-projects/mern-restaurant/api/middlewares/healthCheck.js)
   - Expand [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) and [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js)

3. App/bootstrap batch
   - Improve coverage for [app.js](/d:/MARAA/coding-projects/mern-restaurant/api/app.js)
   - Validate more middleware wiring and startup branches

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-11 | 89.47% | 66.73% | 88.31% | Controller-branch test stabilized; full gates green |
