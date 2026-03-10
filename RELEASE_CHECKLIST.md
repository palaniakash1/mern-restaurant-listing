# Release Checklist

This checklist ensures consistent, reliable releases of the MERN Restaurant API.

## Pre-Release

### Code Quality

- [ ] All tests pass (unit, integration, e2e)
- [ ] Code coverage meets minimum threshold (80%+)
- [ ] ESLint passes with no errors or warnings
- [ ] No security vulnerabilities in dependencies
- [ ] Code review completed and approved
- [ ] All TODOs and FIXMEs addressed or documented

### Documentation

- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] Changelog updated with breaking changes
- [ ] Migration guide created for breaking changes
- [ ] README updated if needed
- [ ] Load test baselines updated if performance changed

### Testing

- [ ] Unit tests pass: `npm test`
- [ ] Integration tests pass: `npm run test:integration`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Load tests pass baseline thresholds
- [ ] Manual testing of critical user flows
- [ ] Security testing completed

### Environment Preparation

- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Configuration files reviewed
- [ ] Secrets management verified
- [ ] Backup procedures tested

## Release Process

### Version Bumping

- [ ] Update version in `package.json`
- [ ] Update version in `api/package.json` (if exists)
- [ ] Update version in configuration files
- [ ] Update Docker tags if applicable
- [ ] Create git tag: `git tag -a v1.x.x -m "Release version 1.x.x"`

### Build and Package

- [ ] Clean build: `npm run build` (if applicable)
- [ ] Verify production build artifacts
- [ ] Package dependencies locked
- [ ] Docker image built and tagged (if applicable)
- [ ] Verify artifact integrity

### Deployment Preparation

- [ ] Deployment scripts reviewed
- [ ] Environment-specific configurations verified
- [ ] Database migration scripts ready
- [ ] Rollback procedures prepared
- [ ] Monitoring and alerting configured

## Deployment

### Staging Environment

- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Verify all endpoints respond correctly
- [ ] Test database migrations
- [ ] Validate configuration
- [ ] Performance testing completed

### Production Deployment

- [ ] Schedule maintenance window (if required)
- [ ] Notify stakeholders of deployment
- [ ] Deploy to production
- [ ] Monitor deployment progress
- [ ] Verify application health
- [ ] Run post-deployment tests

### Post-Deployment Verification

- [ ] All services healthy
- [ ] Database connections working
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Monitoring dashboards updated
- [ ] Logs showing normal operation

## Post-Release

### Monitoring

- [ ] Monitor application metrics for 24 hours
- [ ] Watch error rates and response times
- [ ] Check resource utilization
- [ ] Verify backup jobs running
- [ ] Monitor security alerts

### Documentation

- [ ] Update release notes
- [ ] Publish changelog
- [ ] Update API documentation
- [ ] Notify users of breaking changes
- [ ] Update support documentation

### Cleanup

- [ ] Merge release branch to main/master
- [ ] Delete feature branches
- [ ] Clean up temporary files
- [ ] Update dependency versions if needed
- [ ] Archive release artifacts

## Rollback Criteria

Rollback immediately if:

- [ ] Critical functionality broken
- [ ] Data corruption detected
- [ ] Security vulnerability introduced
- [ ] Performance degradation >50%
- [ ] Error rate >5%
- [ ] User authentication failing

## Emergency Procedures

### Rollback Process

1. [ ] Stop current deployment
2. [ ] Revert to previous version
3. [ ] Restore from backup if needed
4. [ ] Verify rollback success
5. [ ] Investigate root cause
6. [ ] Document incident

### Communication

- [ ] Notify stakeholders of rollback
- [ ] Update status page
- [ ] Document incident timeline
- [ ] Post-incident review scheduled

## Checklist Completion

**Release Manager:** **\*\*\*\***\_**\*\*\*\***
**Date:** **\*\*\*\***\_**\*\*\*\***
**Version:** **\*\*\*\***\_**\*\*\*\***

**Sign-off required from:**

- [ ] Development Team Lead
- [ ] QA Team Lead
- [ ] DevOps Engineer
- [ ] Product Manager

## Release Notes Template

```markdown
## [Version] - [Date]

### Added

- New features and enhancements

### Changed

- Modified functionality

### Fixed

- Bug fixes

### Removed

- Deprecated features

### Breaking Changes

- Migration required

### Security

- Security improvements
```

## Environment Variables Checklist

Ensure all required environment variables are documented:

- [ ] `NODE_ENV`
- [ ] `PORT`
- [ ] `DATABASE_URL` / `MONGO`
- [ ] `JWT_SECRET`
- [ ] `JWT_EXPIRE`
- [ ] `REFRESH_TOKEN_TTL_DAYS`
- [ ] `LOGIN_LOCKOUT_THRESHOLD`
- [ ] `LOGIN_LOCKOUT_BASE_MS`
- [ ] `LOGIN_LOCKOUT_MAX_MS`
- [ ] `CORS_ORIGINS`
- [ ] `METRICS_TOKEN`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `EMAIL_SERVICE_URL`
- [ ] `REDIS_URL`
- [ ] `CACHE_TTL`
- [ ] `REDIS_CONNECT_TIMEOUT`

## Database Migration Checklist

For releases with database changes:

- [ ] Migration scripts tested
- [ ] Rollback scripts prepared
- [ ] Data validation completed
- [ ] Index creation verified
- [ ] Performance impact assessed
- [ ] Backup before migration scheduled
