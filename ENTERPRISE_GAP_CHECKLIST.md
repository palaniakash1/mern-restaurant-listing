# Enterprise Gap Checklist

## Current Gate Status

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run test:coverage` reports real coverage numbers
- [ ] `npm audit --audit-level=high` passes

## Testing

- [ ] Add unit tests for services and utilities
- [ ] Keep integration and contract tests green
- [ ] Add end-to-end smoke suite against a booted app
- [ ] Add load tests for auth, session, and high-traffic read endpoints
- [ ] Define minimum coverage thresholds and enforce them in CI

## Security

- [ ] Add JWT signing-key rotation strategy
- [ ] Add refresh-token anomaly thresholds and alerting
- [ ] Keep lockout, brute-force protection, rate limits, and replay detection covered by tests
- [ ] Add automated secret scanning to CI

## Architecture

- [ ] Refactor controllers toward controller-service-repository separation
- [ ] Keep API versioning consistent across new endpoints
- [ ] Expand centralized config validation for all operational env vars

## Observability

- [ ] Add distributed tracing with request/span correlation
- [ ] Keep structured logging, metrics, and health checks production-ready
- [ ] Ensure logs stream to platform collectors only

## Operations

- [ ] Add CI gates for lint, tests, coverage thresholds, and contract checks
- [ ] Add release checklist
- [ ] Add rollback runbook
- [ ] Add dependency upgrade policy

## Data Management

- [ ] Keep migrations and audit logs verified
- [ ] Add backup and restore runbook
- [ ] Add restore validation drill

## Scalability and Reliability

- [ ] Remove correctness-sensitive in-memory fallbacks for multi-instance production paths
- [ ] Add Redis outage chaos tests
- [ ] Validate idempotency behavior across multiple instances
- [ ] Define horizontal scaling assumptions explicitly
