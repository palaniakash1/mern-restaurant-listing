# Test Coverage Tracker

Last verified: 2026-03-28

## Current Gate Status

- `npm run lint`: pass
- `npm test`: pass (`197/197`)
- `npm run test:coverage`: pass
- `npm audit --audit-level=high`: pass (`0 vulnerabilities`)

## Current Coverage

- Lines: `95.09%`
- Branches: `87.30%`
- Functions: `90.30%`

## High-Value Coverage Snapshot

- `api/controllers/auditLog.controller.js`: `98.53 / 93.33 / 100.00`
- `api/controllers/category.controller.js`: `96.71 / 90.33 / 100.00`
- `api/controllers/menu.controller.js`: `97.75 / 92.38 / 97.30`
- `api/controllers/restaurant.controller.js`: `86.44 / 90.11 / 91.43`
- `api/controllers/auth.controller.js`: `94.04 / 77.89 / 100.00`
- `api/controllers/review.controller.js`: `95.67 / 78.46 / 100.00`
- `api/controllers/fsa.controller.js`: `74.02 / 61.29 / 88.89`
- `api/controllers/places.controller.js`: `39.22 / 100.00 / 0.00`
- `api/config.js`: `97.85 / 30.77 / 100.00`
- `api/utils/redisCache.js`: `80.81 / 89.41 / 80.00`
- `api/utils/logger.js`: `93.14 / 82.64 / 90.91`
- `api/tracing.js`: `95.42 / 82.35 / 93.55`

## Recovery Notes

- Backend gates were restored to green after fixing controller/test contract drift around menu item payloads and category status payloads.
- Dependency audit is clean again after `npm audit fix`.
- Test runs complete without hanging in the current setup.

## Next Batch Targets

1. Raise branch coverage in `api/controllers/auth.controller.js` and `api/controllers/review.controller.js`.
2. Cover the remaining low-signal config/runtime gaps in `api/config.js`, `api/utils/logger.js`, `api/utils/redisCache.js`, and `api/tracing.js`.
3. Decide whether `api/controllers/fsa.controller.js` and `api/controllers/places.controller.js` are production-critical enough to require enterprise-level coverage, or explicitly mark them as lower-priority feature modules.
