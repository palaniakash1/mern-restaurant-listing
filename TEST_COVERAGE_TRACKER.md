# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-14

| Metric | Value |
| --- | --- |
| Lines | 94.27% |
| Branches | 77.39% |
| Functions | 93.88% |
| Tests Passing | 120/120 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Smoke pass (`npm run test:load:smoke`); full baseline pending |

## Current Batch

Scope:
- validated `k6` execution locally and fixed the smoke load script in [auth-load-test.js](/d:/MARAA/coding-projects/mern-restaurant/api/load-tests/auth-load-test.js) so cookie handling, per-VU session isolation, and smoke thresholds reflect real deployment checks
- revalidated `npm test`, `npm run lint`, `npm run test:coverage`, `npm audit --audit-level=high`, and `npm run test:load:smoke`
- confirmed overall coverage remains strong, but the controller branch targets in category/menu/restaurant and audit-log are still below the desired `90%` branch bar

Notes:
- tracing lifecycle tests still emit collector shutdown warnings when no OTLP collector is listening on `127.0.0.1:4318` / `::1:4318`
- those warnings do not fail the suite
- `k6` is now installed locally and the smoke profile is green against a live API instance
- the full baseline profile remains pending because it is a much longer run and was not required to validate the smoke deployment gate in this batch

## Verified Commands

```powershell
npm test
npm run lint
npm run test:coverage
npm audit --audit-level=high
npm run test:load:smoke
```

## High-Value Coverage Targets

| Module | Lines | Branches | Functions | Priority |
| --- | --- | --- | --- | --- |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) | 88.29% | 50.00% | 100.00% | High |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) | 85.31% | 40.00% | 91.43% | High |
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | 92.76% | 69.60% | 96.77% | High |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) | 74.35% | 72.62% | 96.15% | High |
| [auditLog.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auditLog.controller.js) | 98.53% | 88.89% | 100.00% | High |
| [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) | 94.88% | 79.07% | 96.15% | Medium |
| [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js) | 87.86% | 79.07% | 84.62% | Medium |
| [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js) | 88.21% | 60.23% | 100.00% | Medium |

## Next Batches

1. Remaining controller batch
   - continue filling branch gaps in [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) on reorder, deleted-menu listing, and audit filter branches
   - continue filling branch gaps in [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) on export, bulk reorder/idempotency, and restore/hard-delete branches
   - continue filling branch gaps in [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) on create/update ownership and listing filters

2. Runtime follow-up batch
   - continue filling remaining lines in [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)
   - close the remaining collector-shutdown and invalid-trace-id branches in [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js)

3. Load and operations batch
   - run the full `npm run test:load` baseline profile in a suitable environment
   - capture and commit baseline latency/error thresholds for auth/session/refresh
   - wire the smoke load test into CI or release validation

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-14 | 94.27% | 77.39% | 93.88% | `k6` installed locally, smoke load test fixed and passing, audit repaired with `npm audit fix`; controller branch targets still remain below the desired 90% bar |
| 2026-03-11 | 94.27% | 77.30% | 93.88% | Rewrote the hanging controller test into `controller-deep-branches.unit.test.js`; full gates green and controller branch coverage materially improved |
| 2026-03-11 | 92.63% | 73.02% | 93.36% | Controller batch 4 verified; `controller-branch-4` added, full gates green, load-test wrapper added for clearer `k6` validation failures |
| 2026-03-11 | 92.25% | 72.23% | 93.28% | Runtime follow-up batch completed; Redis parse/serialization, metrics error paths, and tracing no-op metric coverage added |
| 2026-03-11 | 92.16% | 71.77% | 92.91% | Repository/auth batch completed; admin repository tests added, `lastLoginAt` integrated, `k6` scripts wired |
| 2026-03-11 | 90.76% | 70.90% | 89.18% | Controller branch batch completed; new restaurant/category/menu failure-path coverage added |
| 2026-03-11 | 90.42% | 69.89% | 88.92% | App/bootstrap batch completed; request logger and metrics/options coverage added |
| 2026-03-11 | 90.23% | 69.09% | 88.62% | Runtime reliability batch completed; Redis, health, logger, and telemetry coverage expanded |
| 2026-03-11 | 89.72% | 67.74% | 88.46% | Added `controller-branch-2` and improved controller branch coverage |
| 2026-03-11 | 89.47% | 66.73% | 88.31% | Controller-branch test stabilized; full gates green |
