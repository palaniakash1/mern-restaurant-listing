# Test Coverage Tracker

Update this file after every successful `npm run test:coverage` run.

## Latest Verified Snapshot

Date: 2026-03-19

| Metric        | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| Lines         | 97.08%                                                        |
| Branches      | 88.28%                                                        |
| Functions     | 90.54%                                                        |
| Tests Passing | 152/152                                                       |
| Lint          | Pass                                                          |
| Audit         | Pass                                                          |
| Coverage      | Pass                                                          |
| Load Tests    | Smoke pass (`npm run test:load:smoke`); full baseline pending |

## Verified Commands

```powershell
npm test
npm run lint
npm run test:coverage
npm audit --audit-level=high
npm run test:load:smoke
```

## Update Log

| Date       | Lines  | Branches | Functions | Notes                                                                                                                                                                      |
| ---------- | ------ | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-19 | 96.90% | 88.31%   | 90.74%    | Branch-gap helper batch completed; paginate, policy, openNow, admin.controller, and review-controller guard paths were lifted with full gates green again                  |
| 2026-03-19 | 96.72% | 88.63%   | 91.04%    | Low-coverage helper batch completed; geocode, slug generation, role guards, soft-delete plugin, and rate limit are all now above the requested floor with full gates green |
| 2026-03-19 | 96.26% | 88.10%   | 90.53%    | User controller and JWT rotation edge coverage batch completed; timer-cleanup hang fixed, full gates green again                                                           |
| 2026-03-19 | 96.01% | 87.15%   | 90.12%    | Runtime hardening batch completed; logger, tracing, and redis coverage improved materially with full gates green                                                           |
| 2026-03-18 | 95.07% | 86.20%   | 89.22%    | Controller deep branch pass completed; category, menu, restaurant, and audit-log are now all above 90% branch coverage with full gates green                               |
| 2026-03-18 | 94.38% | 82.70%   | 90.05%    | Second deep controller branch pass completed; category, menu, and restaurant controllers all moved materially upward with full gates green                                 |
| 2026-03-18 | 93.95% | 80.73%   | 89.84%    | Deep controller branch batch completed; audit-log is now above 90% branch coverage, and category/menu/restaurant moved up materially with full gates green                 |
| 2026-03-18 | 93.26% | 76.92%   | 92.60%    | Test hanging fixed by correcting test-mode runtime detection; logger muted during tests; full gates green again after the helmet/dependency refresh                        |
| 2026-03-14 | 94.27% | 77.39%   | 93.88%    | `k6` installed locally, smoke load test fixed and passing, audit repaired with `npm audit fix`; controller branch targets still remain below the desired 90% bar           |
| 2026-03-11 | 94.27% | 77.30%   | 93.88%    | Rewrote the hanging controller test into `controller-deep-branches.unit.test.js`; full gates green and controller branch coverage materially improved                      |
| 2026-03-11 | 92.63% | 73.02%   | 93.36%    | Controller batch 4 verified; `controller-branch-4` added, full gates green, load-test wrapper added for clearer `k6` validation failures                                   |
| 2026-03-11 | 92.25% | 72.23%   | 93.28%    | Runtime follow-up batch completed; Redis parse/serialization, metrics error paths, and tracing no-op metric coverage added                                                 |
| 2026-03-11 | 92.16% | 71.77%   | 92.91%    | Repository/auth batch completed; admin repository tests added, `lastLoginAt` integrated, `k6` scripts wired                                                                |
| 2026-03-11 | 90.76% | 70.90%   | 89.18%    | Controller branch batch completed; new restaurant/category/menu failure-path coverage added                                                                                |
| 2026-03-11 | 90.42% | 69.89%   | 88.92%    | App/bootstrap batch completed; request logger and metrics/options coverage added                                                                                           |
| 2026-03-11 | 90.23% | 69.09%   | 88.62%    | Runtime reliability batch completed; Redis, health, logger, and telemetry coverage expanded                                                                                |
| 2026-03-11 | 89.72% | 67.74%   | 88.46%    | Added `controller-branch-2` and improved controller branch coverage                                                                                                        |
| 2026-03-11 | 89.47% | 66.73%   | 88.31%    | Controller-branch test stabilized; full gates green                                                                                                                        |

## High-Value Coverage Targets

| Module                                                                                                                 | Lines   | Branches | Functions | Priority  |
| ---------------------------------------------------------------------------------------------------------------------- | ------- | -------- | --------- | --------- |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js)             | 97.44%  | 91.32%   | 100.00%   | Completed |
| [menu.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/menu.controller.js)                     | 97.92%  | 92.82%   | 97.30%    | Completed |
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js)         | 97.59%  | 92.64%   | 100.00%   | Completed |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)                                     | 80.81%  | 89.41%   | 80.00%    | High      |
| [auditLog.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auditLog.controller.js)             | 98.53%  | 93.33%   | 100.00%   | Completed |
| [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js)                                                 | 95.29%  | 82.35%   | 93.55%    | Medium    |
| [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js)                | 93.93%  | 93.18%   | 92.31%    | Completed |
| [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js)                     | 88.21%  | 60.23%   | 100.00%   | Medium    |
| [user.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/user.controller.js)                     | 100.00% | 100.00%  | 100.00%   | Completed |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js)                                             | 93.14%  | 82.79%   | 90.91%    | Medium    |
| [review.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/review.controller.js)                 | 95.67%  | 78.79%   | 100.00%   | Medium    |
| [generateUniqueSlug.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/generateUniqueSlug.js)                     | 100.00% | 100.00%  | 100.00%   | Completed |
| [geocode.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/geocode.js)                                           | 100.00% | 100.00%  | 100.00%   | Completed |
| [roleGuards.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/roleGuards.js)                                     | 96.61%  | 95.45%   | 100.00%   | Completed |
| [softDeleteRestore.plugin.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/plugins/softDeleteRestore.plugin.js) | 100.00% | 87.50%   | 100.00%   | Completed |
| [rateLimit.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/rateLimit.js)                                       | 100.00% | 71.43%   | 100.00%   | Completed |
| [paginate.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/paginate.js)                                         | 100.00% | 75.00%   | 100.00%   | Completed |
| [policy.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/policy.js)                                             | 100.00% | 100.00%  | 100.00%   | Completed |
| [openNow.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/openNow.js)                                           | 100.00% | 100.00%  | 100.00%   | Completed |
| [config.js](/d:/MARAA/coding-projects/mern-restaurant/api/config.js)                                                   | 98.94%  | 25.93%   | 75.00%    | High      |

Last verified run: 2026-03-19

## Current Gate Status

- `npm test`: pass (`152/152`)
- `npm run test:coverage`: pass
- `npm run lint`: pass
- `npm audit --audit-level=high`: pass

## Current Verified Coverage

- Lines: `97.08%`
- Branches: `88.25%`
- Functions: `90.54%`

## Latest Backend Hardening Updates

- Added configurable CSRF token lifetime with `CSRF_TOKEN_TTL_MS` fallback to `24h`.
- Persisted CSRF cookie with `maxAge` in auth cookie options.
- Updated CSRF middleware expiry handling to use config-driven TTL.
- Added auth controller unit coverage for signup, signin, google, refresh, revoke, and password guard branches.
- Added config import-matrix coverage for env parsing and fallback behavior.
- Fixed coverage runner instability by restoring clean Mongo memory-server lifecycle and increasing launch timeout in `api/tests/helpers/testDb.js`.

## High-Value Modules Below 90% Branch Coverage

### Priority 1

- `api/controllers/auth.controller.js`: `77.89%`
- `api/controllers/review.controller.js`: `76.56%`
- `api/middlewares/healthCheck.js`: `74.36%`
- `api/services/user.service.js`: `74.23%`
- `api/services/admin.service.js`: `75.00%`
- `api/utils/paginate.js`: `75.00%`
- `api/middlewares/metrics.js`: `81.82%`
- `api/tracing.js`: `82.35%`
- `api/utils/logger.js`: `82.79%`
- `api/utils/redisCache.js`: `89.41%`

### Priority 2

- `api/config.js`: `30.77%`
- `api/middlewares/csrfProtection.js`: `82.05%`
- `api/utils/controllerHelpers.js`: `78.57%`
- `api/utils/auditLogger.js`: `80.00%`
- `api/repositories/user.repository.js`: `84.62%`
- `api/utils/rateLimit.js`: `71.43%`
- `api/utils/withTransaction.js`: `85.00%`
- `api/utils/plugins/softDeleteRestore.plugin.js`: `87.50%`

## Controllers Already Above 90% Branch Coverage

- `api/controllers/auditLog.controller.js`: `93.33%`
- `api/controllers/category.controller.js`: `91.32%`
- `api/controllers/menu.controller.js`: `92.82%`
- `api/controllers/restaurant.controller.js`: `92.59%`
- `api/controllers/admin.controller.js`: `100.00%`
- `api/controllers/user.controller.js`: `100.00%`

## Load Test Status

- `npm run test:load:smoke`: previously validated
- `npm run test:load`: repo wiring exists
- `k6`: still needs to be available in the target local/CI environment for repeatable execution

## Next Batch

1. Push `auth.controller.js` branch coverage above `90%`.
2. Push `review.controller.js` branch coverage above `90%`.
3. Add an isolated config-import batch to lift `config.js` branch coverage.
4. Raise runtime/supporting branch coverage in `healthCheck.js`, `metrics.js`, `tracing.js`, `logger.js`, and `redisCache.js`.

## Update Rule

After every successful `npm run test:coverage`:

1. Update the gate status.
2. Replace the overall lines/branches/functions snapshot.
3. Re-sort the below-90 branch coverage list by impact.
4. Record any test-runner or infrastructure fixes that changed stability.
