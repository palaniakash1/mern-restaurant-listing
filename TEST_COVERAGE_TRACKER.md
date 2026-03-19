# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-19

| Metric | Value |
| --- | --- |
| Lines | 96.01% |
| Branches | 87.15% |
| Functions | 90.12% |
| Tests Passing | 134/134 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Smoke pass (`npm run test:load:smoke`); full baseline pending |

## Current Batch

Scope:
- added runtime-focused test helpers for logger and tracing without changing production behavior
- expanded runtime coverage for redis-backed paths, logger transport/config builders, object-log wrappers, and tracing init/shutdown lifecycle branches
- revalidated `npm test`, `npm run lint`, `npm run test:coverage`, and `npm audit --audit-level=high`
- pushed overall branch coverage above `87%`
- materially improved runtime modules that were previously blocking the next backend hardening batch

Notes:
- tracing lifecycle tests still emit collector shutdown warnings when no OTLP collector is listening on `127.0.0.1:4318` / `::1:4318`
- those warnings do not fail the suite
- the load-test status is unchanged in this batch: smoke is already green and the full `k6` baseline remains pending
- test output remains materially quieter because logger transports are disabled during test runs

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
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js) | 97.44% | 91.32% | 100.00% | Completed |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js) | 97.92% | 92.82% | 97.30% | Completed |
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | 97.59% | 92.64% | 100.00% | Completed |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) | 80.81% | 89.41% | 80.00% | High |
| [auditLog.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auditLog.controller.js) | 98.53% | 93.33% | 100.00% | Completed |
| [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) | 95.29% | 83.02% | 93.55% | Medium |
| [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js) | 87.86% | 79.07% | 84.62% | Medium |
| [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js) | 88.21% | 60.23% | 100.00% | Medium |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) | 93.14% | 82.79% | 90.91% | Medium |

## Next Batches

1. Runtime follow-up batch
   - continue filling remaining lines in [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js), especially connection-failure and shutdown fallback branches
   - close the remaining branch gaps in [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js)
   - push [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) branch coverage higher if we want the runtime layer uniformly above `90%`

2. Auth and user follow-up batch
   - push [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js) and [user.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/user.controller.js) higher on branch coverage
   - deepen [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js) and [user.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/user.service.js)

3. Load and operations batch
   - run the full `npm run test:load` baseline profile in a suitable environment
   - capture and commit baseline latency/error thresholds for auth/session/refresh
   - wire the smoke load test into CI or release validation

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-19 | 96.01% | 87.15% | 90.12% | Runtime hardening batch completed; logger, tracing, and redis coverage improved materially with full gates green |
| 2026-03-18 | 95.07% | 86.20% | 89.22% | Controller deep branch pass completed; category, menu, restaurant, and audit-log are now all above 90% branch coverage with full gates green |
| 2026-03-18 | 94.38% | 82.70% | 90.05% | Second deep controller branch pass completed; category, menu, and restaurant controllers all moved materially upward with full gates green |
| 2026-03-18 | 93.95% | 80.73% | 89.84% | Deep controller branch batch completed; audit-log is now above 90% branch coverage, and category/menu/restaurant moved up materially with full gates green |
| 2026-03-18 | 93.26% | 76.92% | 92.60% | Test hanging fixed by correcting test-mode runtime detection; logger muted during tests; full gates green again after the helmet/dependency refresh |
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
