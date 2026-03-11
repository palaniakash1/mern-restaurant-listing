# Test Coverage Tracker

This file tracks backend coverage progress and should be updated after every successful `npm run test:coverage` run.

## Update Rule

After each coverage run, update:

- the latest coverage snapshot
- gate status (`lint`, `audit`, `test`, `coverage`, `load`)
- the modules that improved
- the next weakest production-critical targets

## Latest Verified Snapshot

Date: 2026-03-11
Source: last fully green verified run before the current batch

| Metric        | Value                              |
| ------------- | ---------------------------------- |
| Lines         | 89.40%                             |
| Branches      | 66.50%                             |
| Functions     | 88.23%                             |
| Tests Passing | 93/93                              |
| Lint          | Pass                               |
| Audit         | Pass                               |
| Coverage      | Pass                               |
| Load Tests    | Blocked locally (`k6` unavailable) |

## Current Batch Status

Date: 2026-03-11
Status: Pending verification

Changes made in this batch:

- Added controller branch integration coverage in [controller-branch.integration.test.js](/d:/MARAA/coding-projects/mern-restaurant/api/tests/controller-branch.integration.test.js)
- Patched the unstable restaurant status assertion so the suite can be re-run cleanly

Verification blocker:

- Shell command execution is currently failing in this environment, so `npm run lint`, `npm test`, `npm run test:coverage`, and `npm audit --audit-level=high` need to be re-run once command execution is available again

## Recent Improvements

| Date       | Scope                                  | Result                                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-11 | JWT rotation + tracing lifecycle tests | Raised [jwtRotation.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/jwtRotation.service.js) and [tracing.js](/d:/MARAA/coding-projects/mern-restaurant/api/tracing.js) coverage materially                                                                                          |
| 2026-03-11 | Auth integration hardening             | Raised [auth.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/auth.controller.js) failure-path coverage                                                                                                                                                                        |
| 2026-03-11 | User/admin service tests               | Raised [user.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/user.service.js), [admin.service.js](/d:/MARAA/coding-projects/mern-restaurant/api/services/admin.service.js), and [user.repository.js](/d:/MARAA/coding-projects/mern-restaurant/api/repositories/user.repository.js) |

## Priority Targets

These remain the highest-value modules to improve for production readiness:

| Module                                                                                                         | Priority | Notes                                                               |
| -------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) | High     | Branch coverage remains a major gap                                 |
| [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js)     | High     | Business-rule and authorization branches still need deeper coverage |
| [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js)                             | High     | Shared-state fallback and error-path reliability remains critical   |
| [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js)               | Medium   | More edge and fallback paths still need direct tests                |
| [logger.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/logger.js)                                     | Medium   | Buffer and suppression paths can still be expanded                  |

## Production Gate Checklist

| Gate                           | Status              | Notes                                                    |
| ------------------------------ | ------------------- | -------------------------------------------------------- |
| `npm run lint`                 | Pending rerun       | Last verified pass before current batch                  |
| `npm audit --audit-level=high` | Pending rerun       | Last verified pass before current batch                  |
| `npm test`                     | Pending rerun       | Last verified pass before current batch                  |
| `npm run test:coverage`        | Pending rerun       | Update snapshot after rerun                              |
| `npm run test:load`            | Environment-blocked | Requires `k6` to be installed in CI/staging/local runner |

## Next Batch

1. Re-run the full gates and update this file with the new verified baseline.
2. Continue increasing branch coverage in [restaurant.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/restaurant.controller.js) and [category.controller.js](/d:/MARAA/coding-projects/mern-restaurant/api/controllers/category.controller.js).
3. Add deeper runtime error-path tests for [redisCache.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/redisCache.js) and [securityTelemetry.js](/d:/MARAA/coding-projects/mern-restaurant/api/utils/securityTelemetry.js).
