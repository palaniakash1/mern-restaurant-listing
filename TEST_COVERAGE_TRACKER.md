# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-19

| Metric | Value |
| --- | --- |
| Lines | 96.90% |
| Branches | 88.31% |
| Functions | 90.74% |
| Tests Passing | 149/149 |
| Lint | Pass |
| Audit | Pass |
| Coverage | Pass |
| Load Tests | Smoke pass (`npm run test:load:smoke`); full baseline pending |

## Current Batch

Scope:
- added focused branch tests in [branch-gap-helpers.unit.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/branch-gap-helpers.unit.test.js) for [paginate.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/paginate.js), [policy.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/policy.js), [openNow.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/openNow.js), [admin.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/admin.controller.js), and pre-persistence guard paths in [review.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/review.controller.js)
- added deterministic env and clock isolation so the new helper suite does not hang or depend on local timezone behavior
- revalidated `npm test`, `npm run lint`, `npm run test:coverage`, and `npm audit --audit-level=high`
- lifted the remaining helper/util modules that were near or below the requested floor into a safer range

Notes:
- tracing lifecycle tests still emit collector shutdown warnings when no OTLP collector is listening on `127.0.0.1:4318` / `::1:4318`
- those warnings do not fail the suite
- the load-test status is unchanged in this batch: smoke is already green and the full `k6` baseline remains pending
- test output remains materially quieter because logger transports are disabled during test runs
- the full suite now includes dedicated low-coverage helper coverage in both [low-coverage-utils.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/low-coverage-utils.test.js) and [branch-gap-helpers.unit.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/branch-gap-helpers.unit.test.js)
- [config.js](/d:/MARAA/coding-projects/mern-restaurant/api/config.js) still needs a more complete import-isolated pass; the missing-env error path is covered now, but branch accounting on that module remains anomalously low because of its import-time environment matrix

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
| [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) | 95.29% | 82.35% | 93.55% | Medium |
| [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js) | 93.93% | 93.18% | 92.31% | Completed |
| [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js) | 88.21% | 60.23% | 100.00% | Medium |
| [user.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/user.controller.js) | 100.00% | 100.00% | 100.00% | Completed |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) | 93.14% | 82.79% | 90.91% | Medium |
| [review.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/review.controller.js) | 95.67% | 78.79% | 100.00% | Medium |
| [generateUniqueSlug.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/generateUniqueSlug.js) | 100.00% | 100.00% | 100.00% | Completed |
| [geocode.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/geocode.js) | 100.00% | 100.00% | 100.00% | Completed |
| [roleGuards.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/roleGuards.js) | 96.61% | 95.45% | 100.00% | Completed |
| [softDeleteRestore.plugin.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/plugins/softDeleteRestore.plugin.js) | 100.00% | 87.50% | 100.00% | Completed |
| [rateLimit.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/rateLimit.js) | 100.00% | 71.43% | 100.00% | Completed |
| [paginate.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/paginate.js) | 100.00% | 75.00% | 100.00% | Completed |
| [policy.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/policy.js) | 100.00% | 100.00% | 100.00% | Completed |
| [openNow.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/openNow.js) | 100.00% | 100.00% | 100.00% | Completed |
| [config.js](/d:/MARAA/coding-projects/mern-restaurant/api/config.js) | 98.94% | 25.93% | 75.00% | High |

## Next Batches

1. Runtime follow-up batch
   - continue filling remaining lines in [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js), especially connection-failure and shutdown fallback branches
   - close the remaining branch gaps in [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js)
   - push [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js) branch coverage higher if we want the runtime layer uniformly above `90%`
   - finish a clean import-matrix test strategy for [config.js](/d:/MARAA/coding-projects/mern-restaurant/api/config.js), which is still the biggest low-branch outlier in the helper layer

2. Auth and user follow-up batch
   - push [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js) higher on branch coverage
   - deepen [user.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/user.service.js)
   - raise [review.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/review.controller.js) from the high-70s into the 90-range

3. Load and operations batch
   - run the full `npm run test:load` baseline profile in a suitable environment
   - capture and commit baseline latency/error thresholds for auth/session/refresh
   - wire the smoke load test into CI or release validation

## Update Log

| Date | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-19 | 96.90% | 88.31% | 90.74% | Branch-gap helper batch completed; paginate, policy, openNow, admin.controller, and review-controller guard paths were lifted with full gates green again |
| 2026-03-19 | 96.72% | 88.63% | 91.04% | Low-coverage helper batch completed; geocode, slug generation, role guards, soft-delete plugin, and rate limit are all now above the requested floor with full gates green |
| 2026-03-19 | 96.26% | 88.10% | 90.53% | User controller and JWT rotation edge coverage batch completed; timer-cleanup hang fixed, full gates green again |
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
