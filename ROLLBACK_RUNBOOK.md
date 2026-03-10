# Rollback Runbook

This runbook provides step-by-step procedures for rolling back releases in the MERN Restaurant API.

## When to Rollback

Execute rollback procedures immediately if any of the following occur:

### Critical Issues

- [ ] Application completely unavailable
- [ ] Database corruption or data loss
- [ ] Security vulnerability introduced
- [ ] Authentication system failure
- [ ] Payment processing broken
- [ ] User data inaccessible

### Performance Issues

- [ ] Response times degraded by >50%
- [ ] Error rate >5% sustained for >5 minutes
- [ ] Memory leaks causing OOM errors
- [ ] CPU usage consistently >90%
- [ ] Database connection pool exhausted

### Functional Issues

- [ ] Core business functionality broken
- [ ] User registration/login failing
- [ ] API endpoints returning 500 errors
- [ ] Database migrations failed
- [ ] Configuration errors preventing startup

## Rollback Decision Matrix

| Issue Severity | Response Time     | Rollback Required |
| -------------- | ----------------- | ----------------- |
| Critical (P1)  | Immediately       | Yes               |
| High (P2)      | Within 15 minutes | Yes               |
| Medium (P3)    | Within 30 minutes | Evaluate          |
| Low (P4)       | Within 60 minutes | No                |

## Pre-Rollback Checklist

### Assessment

- [ ] Confirm issue is release-related (not infrastructure)
- [ ] Verify rollback target version is stable
- [ ] Check backup integrity
- [ ] Notify stakeholders of rollback decision
- [ ] Document current state for investigation

### Preparation

- [ ] Ensure rollback scripts are available
- [ ] Verify rollback version deployment artifacts
- [ ] Confirm database rollback procedures
- [ ] Prepare communication templates
- [ ] Assign rollback team roles

## Rollback Procedures

### 1. Application Rollback

#### Kubernetes Deployment

```bash
# Check current deployment
kubectl get deployments
kubectl rollout history deployment/restaurant-api

# Rollback to previous version
kubectl rollout undo deployment/restaurant-api

# Verify rollback
kubectl rollout status deployment/restaurant-api
kubectl get pods
```

#### Docker Compose

```bash
# Stop current containers
docker-compose down

# Deploy previous version
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose ps
```

#### Manual Deployment

```bash
# Stop current application
pm2 stop restaurant-api

# Deploy previous version
git checkout tags/v1.x.x
npm install --production
pm2 start ecosystem.config.js

# Verify deployment
pm2 status
```

### 2. Database Rollback

#### MongoDB Rollback

```bash
# Check current migration state
node api/migrations/migrate.js migrate:status

# Rollback last migration
node api/migrations/migrate.js migrate:rollback

# Verify rollback
node api/migrations/migrate.js migrate:status
```

#### Manual Database Rollback

```bash
# Restore from backup
mongorestore --host localhost --db restaurant_db /path/to/backup/

# Verify data integrity
mongo restaurant_db --eval "db.users.count()"
```

### 3. Configuration Rollback

#### Environment Variables

```bash
# Restore previous environment file
cp .env.backup .env

# Restart application to pick up changes
pm2 restart restaurant-api
```

#### Nginx Configuration

```bash
# Restore previous nginx config
cp nginx.conf.backup nginx.conf
nginx -s reload
```

## Rollback Verification

### Application Health Check

```bash
# Check application status
curl -f http://localhost:3000/health

# Verify API endpoints
curl -f http://localhost:3000/api/auth/session

# Check logs for errors
pm2 logs restaurant-api --lines 100
```

### Database Health Check

```bash
# Verify database connectivity
mongo --eval "db.adminCommand('ping')"

# Check data integrity
mongo restaurant_db --eval "db.users.find().limit(1).pretty()"
```

### Monitoring Verification

- [ ] Application metrics returning to baseline
- [ ] Error rates decreased to acceptable levels
- [ ] Response times within normal range
- [ ] Resource utilization normalized
- [ ] All health checks passing

## Post-Rollback Actions

### Immediate (0-15 minutes)

- [ ] Confirm all services healthy
- [ ] Verify user functionality restored
- [ ] Monitor for any residual issues
- [ ] Update incident status
- [ ] Notify stakeholders of rollback completion

### Short-term (15 minutes - 2 hours)

- [ ] Collect logs and metrics from failed release
- [ ] Document root cause analysis
- [ ] Update monitoring alerts if needed
- [ ] Prepare incident report
- [ ] Schedule post-mortem meeting

### Long-term (2+ hours)

- [ ] Complete incident post-mortem
- [ ] Implement preventive measures
- [ ] Update deployment procedures
- [ ] Enhance monitoring and alerting
- [ ] Update rollback procedures if needed

## Rollback Communication

### Internal Communication

```markdown
**Subject: [CRITICAL] Application Rollback Initiated**

**Time:** [Timestamp]
**Issue:** [Brief description]
**Action:** Rolling back to v1.x.x
**Expected Duration:** 10-15 minutes
**Status:** In Progress

**Updates will be provided every 5 minutes.**
```

### Customer Communication

```markdown
**Service Status Update**

We are experiencing issues with our service and have initiated a rollback to restore functionality. We expect service to be restored within 15 minutes.

We apologize for the inconvenience and appreciate your patience.
```

## Rollback Team Roles

### Incident Commander

- Overall responsibility for rollback execution
- Coordinates team activities
- Makes final rollback decisions
- Communicates with stakeholders

### Technical Lead

- Executes technical rollback procedures
- Verifies rollback success
- Troubleshoots rollback issues
- Validates system health

### Database Administrator

- Manages database rollback procedures
- Verifies data integrity
- Monitors database performance
- Coordinates backup/restore operations

### DevOps Engineer

- Manages deployment rollback
- Monitors infrastructure health
- Updates monitoring and alerting
- Coordinates with cloud provider if needed

### Communications Lead

- Manages internal and external communication
- Updates status pages
- Coordinates with customer support
- Documents incident timeline

## Rollback Prevention

### Pre-Deployment

- [ ] Comprehensive testing in staging
- [ ] Database migration testing
- [ ] Performance testing completed
- [ ] Rollback procedures tested
- [ ] Monitoring and alerting configured

### Deployment Strategy

- [ ] Blue-green deployment preferred
- [ ] Canary releases for major changes
- [ ] Feature flags for risky changes
- [ ] Automated rollback triggers
- [ ] Health check validation

### Monitoring

- [ ] Real-time deployment monitoring
- [ ] Automated alerting for critical metrics
- [ ] Dashboard for deployment status
- [ ] Log aggregation and analysis
- [ ] Performance baseline tracking

## Rollback Testing

### Regular Testing Schedule

- [ ] Monthly rollback procedure testing
- [ ] Quarterly disaster recovery testing
- [ ] Bi-annual full system rollback testing
- [ ] Post-incident procedure review

### Test Scenarios

- [ ] Application rollback only
- [ ] Database rollback only
- [ ] Full system rollback
- [ ] Partial rollback scenarios
- [ ] Rollback failure scenarios

## Troubleshooting Common Issues

### Rollback Fails to Complete

**Symptoms:** Rollback process hangs or fails
**Causes:** Database locks, resource constraints, network issues
**Solutions:**

1. Check system resources
2. Verify database connectivity
3. Kill stuck processes if needed
4. Manual intervention may be required

### Data Inconsistency After Rollback

**Symptoms:** Data corruption or missing data
**Causes:** Incomplete database rollback, concurrent writes
**Solutions:**

1. Restore from backup
2. Run data validation scripts
3. Manual data reconciliation if needed
4. Investigate root cause

### Application Won't Start After Rollback

**Symptoms:** Application fails to start or crashes
**Causes:** Missing dependencies, configuration issues, environment problems
**Solutions:**

1. Check application logs
2. Verify environment variables
3. Reinstall dependencies
4. Check file permissions

## Escalation Procedures

### Level 1: Team Lead

- Initial rollback execution
- Basic troubleshooting
- Status updates

### Level 2: Senior Engineer

- Complex issue resolution
- Database rollback issues
- Infrastructure problems

### Level 3: CTO/Technical Director

- Critical system failures
- Extended downtime
- Customer impact assessment

### Level 4: Executive Team

- Major business impact
- Customer communication
- External vendor coordination

## Rollback Documentation Template

```markdown
## Incident Report: [Date/Time]

### Issue Description

[Brief description of the issue]

### Rollback Details

- **Rollback Time:** [Start time - End time]
- **Target Version:** [Version rolled back to]
- **Rollback Type:** [Full/Partial/Application/Database]
- **Team Members:** [List of team members involved]

### Root Cause

[Detailed analysis of what caused the need for rollback]

### Resolution Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Impact Assessment

- **Downtime:** [Duration]
- **Affected Users:** [Number/percentage]
- **Data Loss:** [If any]
- **Business Impact:** [Description]

### Preventive Measures

[Actions to prevent similar issues]
```

## Emergency Contacts

### On-Call Schedule

- **Primary:** [Name, Phone, Email]
- **Secondary:** [Name, Phone, Email]
- **Escalation:** [Name, Phone, Email]

### Vendor Contacts

- **Cloud Provider:** [Contact information]
- **Database Provider:** [Contact information]
- **Monitoring Provider:** [Contact information]

### External Support

- **Security Team:** [Contact information]
- **Legal Team:** [Contact information]
- **PR/Communications:** [Contact information]
