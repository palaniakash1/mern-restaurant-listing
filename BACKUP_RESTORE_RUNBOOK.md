# Backup and Restore Runbook

This runbook provides comprehensive procedures for backing up and restoring the MERN Restaurant API system.

## Backup Strategy Overview

### Backup Types

- **Full Database Backup**: Complete MongoDB database backup
- **Incremental Backup**: Changes since last full backup
- **Configuration Backup**: Application and system configurations
- **Code Backup**: Application code and dependencies
- **Log Backup**: Application and system logs

### Backup Schedule

- **Daily**: Full database backup at 2:00 AM
- **Hourly**: Incremental backups during business hours (9 AM - 6 PM)
- **Weekly**: Configuration and code backup on Sundays at 3:00 AM
- **Monthly**: Complete system backup and validation

### Retention Policy

- **Daily backups**: 30 days
- **Weekly backups**: 12 weeks
- **Monthly backups**: 12 months
- **Critical backups**: Indefinite (marked manually)

## Backup Procedures

### 1. Database Backup

#### MongoDB Full Backup

```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="/backups/mongodb/$(date +%Y-%m-%d)"
DATE_STAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="restaurant_db"
BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$DATE_STAMP.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
mongodump --host localhost --db $DB_NAME --gzip --archive=$BACKUP_FILE

# Verify backup
if [ $? -eq 0 ]; then
    echo "MongoDB backup successful: $BACKUP_FILE"
    # Calculate checksum
    md5sum $BACKUP_FILE > $BACKUP_FILE.md5
else
    echo "MongoDB backup failed"
    exit 1
fi

# Cleanup old backups (keep 30 days)
find /backups/mongodb -type d -mtime +30 -exec rm -rf {} \;
```

#### MongoDB Incremental Backup

```bash
#!/bin/bash
# backup-mongodb-incremental.sh

BACKUP_DIR="/backups/mongodb/incremental"
DATE_STAMP=$(date +%Y%m%d_%H%M%S)
OPLOG_FILE="$BACKUP_DIR/oplog_$DATE_STAMP.bson"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup oplog for incremental recovery
mongodump --host localhost --db local --collection oplog.rs --out $BACKUP_DIR

# Compress and verify
gzip $OPLOG_FILE
if [ $? -eq 0 ]; then
    echo "Incremental backup successful"
else
    echo "Incremental backup failed"
    exit 1
fi
```

### 2. Configuration Backup

#### Application Configuration

```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/backups/config/$(date +%Y-%m-%d)"
DATE_STAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup environment files
cp .env* $BACKUP_DIR/ 2>/dev/null || true
cp docker-compose*.yml $BACKUP_DIR/ 2>/dev/null || true
cp nginx.conf $BACKUP_DIR/ 2>/dev/null || true

# Backup application configuration
cp -r api/config $BACKUP_DIR/ 2>/dev/null || true

# Create archive
tar -czf $BACKUP_DIR/config_backup_$DATE_STAMP.tar.gz -C $BACKUP_DIR .

# Verify archive
if [ $? -eq 0 ]; then
    echo "Configuration backup successful"
else
    echo "Configuration backup failed"
    exit 1
fi
```

### 3. Code Backup

#### Application Code

```bash
#!/bin/bash
# backup-code.sh

BACKUP_DIR="/backups/code/$(date +%Y-%m-%d)"
DATE_STAMP=$(date +%Y%m%d_%H%M%S)
REPO_DIR="/path/to/mern-restaurant"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create git bundle (includes all history)
cd $REPO_DIR
git bundle create $BACKUP_DIR/code_backup_$DATE_STAMP.bundle --all

# Also create compressed archive
tar -czf $BACKUP_DIR/code_archive_$DATE_STAMP.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=*.log \
    .

# Verify backups
if [ $? -eq 0 ]; then
    echo "Code backup successful"
else
    echo "Code backup failed"
    exit 1
fi
```

### 4. Automated Backup Script

#### Main Backup Orchestrator

```bash
#!/bin/bash
# run-backup.sh

LOG_FILE="/var/log/backup.log"
DATE_STAMP=$(date +%Y-%m-%d_%H:%M:%S)

echo "[$DATE_STAMP] Starting backup process" >> $LOG_FILE

# Source backup scripts
source /scripts/backup-mongodb.sh
source /scripts/backup-config.sh
source /scripts/backup-code.sh

# Run backups based on schedule
case $(date +%u) in
    7) # Sunday - Full backup day
        echo "[$DATE_STAMP] Running full backup" >> $LOG_FILE
        backup-mongodb.sh
        backup-config.sh
        backup-code.sh
        ;;
    *) # Weekday - Database backup only
        echo "[$DATE_STAMP] Running database backup" >> $LOG_FILE
        backup-mongodb.sh
        ;;
esac

# Incremental backup during business hours
if [[ $(date +%u) -ge 1 && $(date +%u) -le 5 ]] && \
   [[ $(date +%H) -ge 9 && $(date +%H) -le 18 ]]; then
    echo "[$DATE_STAMP] Running incremental backup" >> $LOG_FILE
    backup-mongodb-incremental.sh
fi

# Verify backup integrity
echo "[$DATE_STAMP] Verifying backup integrity" >> $LOG_FILE
/scripts/verify-backups.sh

# Send notification
/scripts/notify-backup-complete.sh

echo "[$DATE_STAMP] Backup process completed" >> $LOG_FILE
```

## Restore Procedures

### 1. Database Restore

#### Full Database Restore

```bash
#!/bin/bash
# restore-mongodb.sh

BACKUP_FILE="$1"  # Path to backup file
DB_NAME="restaurant_db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: restore-mongodb.sh <backup_file>"
    exit 1
fi

# Stop application to prevent data corruption
pm2 stop restaurant-api

# Drop existing database (if needed)
echo "Dropping existing database..."
mongo $DB_NAME --eval "db.dropDatabase()"

# Restore from backup
echo "Restoring database from $BACKUP_FILE..."
mongorestore --host localhost --db $DB_NAME --gzip --archive=$BACKUP_FILE

# Verify restore
if [ $? -eq 0 ]; then
    echo "Database restore successful"

    # Verify data integrity
    mongo $DB_NAME --eval "db.users.count()" | tail -1

    # Restart application
    pm2 start restaurant-api
else
    echo "Database restore failed"
    exit 1
fi
```

#### Point-in-Time Recovery

```bash
#!/bin/bash
# restore-pitr.sh

TARGET_TIME="$1"  # Target recovery time in ISO format
BACKUP_DATE="$2"  # Date of full backup

if [ -z "$TARGET_TIME" ] || [ -z "$BACKUP_DATE" ]; then
    echo "Usage: restore-pitr.sh <target_time> <backup_date>"
    echo "Example: restore-pitr.sh '2023-12-01T14:30:00Z' '2023-12-01'"
    exit 1
fi

# Restore from full backup
BACKUP_FILE="/backups/mongodb/$BACKUP_DATE/mongodb_backup_*.gz"
mongorestore --host localhost --db restaurant_db --gzip --archive=$BACKUP_FILE

# Apply oplog entries up to target time
mongorestore --host localhost --db local --collection oplog.rs \
    --query '{ts: {\$lte: {\$timestamp: {t: '$(date -d "$TARGET_TIME" +%s), i: 1}}}}' \
    /backups/mongodb/incremental/oplog_*.bson

echo "Point-in-time recovery completed to $TARGET_TIME"
```

### 2. Configuration Restore

#### Application Configuration Restore

```bash
#!/bin/bash
# restore-config.sh

BACKUP_DATE="$1"  # Date of backup to restore
BACKUP_DIR="/backups/config/$BACKUP_DATE"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: restore-config.sh <backup_date>"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Backup current configuration
CURRENT_BACKUP="/tmp/current_config_$(date +%Y%m%d_%H%M%S)"
mkdir -p $CURRENT_BACKUP
cp .env* $CURRENT_BACKUP/ 2>/dev/null || true
cp docker-compose*.yml $CURRENT_BACKUP/ 2>/dev/null || true
cp nginx.conf $CURRENT_BACKUP/ 2>/dev/null || true

# Restore configuration
cp $BACKUP_DIR/.env* . 2>/dev/null || true
cp $BACKUP_DIR/docker-compose*.yml . 2>/dev/null || true
cp $BACKUP_DIR/nginx.conf . 2>/dev/null || true

# Restart services to apply configuration
pm2 restart restaurant-api
nginx -s reload

echo "Configuration restore completed from $BACKUP_DATE"
echo "Current configuration backed up to: $CURRENT_BACKUP"
```

### 3. Code Restore

#### Application Code Restore

```bash
#!/bin/bash
# restore-code.sh

BACKUP_DATE="$1"  # Date of backup to restore
RESTORE_TYPE="$2" # bundle or archive
REPO_DIR="/path/to/mern-restaurant"

if [ -z "$BACKUP_DATE" ] || [ -z "$RESTORE_TYPE" ]; then
    echo "Usage: restore-code.sh <backup_date> <restore_type>"
    echo "Restore types: bundle, archive"
    exit 1
fi

BACKUP_DIR="/backups/code/$BACKUP_DATE"

# Stop application
pm2 stop restaurant-api

case $RESTORE_TYPE in
    "bundle")
        # Restore from git bundle
        BUNDLE_FILE="$BACKUP_DIR/code_backup_*.bundle"
        if [ -f "$BUNDLE_FILE" ]; then
            cd $REPO_DIR
            git fetch $BUNDLE_FILE
            git reset --hard FETCH_HEAD
            npm install
            echo "Code restored from bundle"
        else
            echo "Bundle file not found"
            exit 1
        fi
        ;;
    "archive")
        # Restore from compressed archive
        ARCHIVE_FILE="$BACKUP_DIR/code_archive_*.tar.gz"
        if [ -f "$ARCHIVE_FILE" ]; then
            cd $REPO_DIR
            tar -xzf $ARCHIVE_FILE
            npm install
            echo "Code restored from archive"
        else
            echo "Archive file not found"
            exit 1
        fi
        ;;
    *)
        echo "Invalid restore type. Use 'bundle' or 'archive'"
        exit 1
        ;;
esac

# Restart application
pm2 start restaurant-api
pm2 logs restaurant-api --lines 50

echo "Code restore completed from $BACKUP_DATE"
```

### 4. Complete System Restore

#### Full System Recovery

```bash
#!/bin/bash
# restore-complete.sh

BACKUP_DATE="$1"  # Date of backup to restore
RECOVERY_TYPE="$2" # full or pitr (point-in-time)

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: restore-complete.sh <backup_date> [recovery_type]"
    echo "Recovery types: full, pitr"
    exit 1
fi

echo "Starting complete system restore from $BACKUP_DATE"

# 1. Restore database
echo "Step 1: Restoring database..."
if [ "$RECOVERY_TYPE" = "pitr" ]; then
    read -p "Enter target recovery time (YYYY-MM-DDTHH:MM:SSZ): " TARGET_TIME
    /scripts/restore-pitr.sh "$TARGET_TIME" "$BACKUP_DATE"
else
    BACKUP_FILE="/backups/mongodb/$BACKUP_DATE/mongodb_backup_*.gz"
    /scripts/restore-mongodb.sh "$BACKUP_FILE"
fi

# 2. Restore configuration
echo "Step 2: Restoring configuration..."
/scripts/restore-config.sh "$BACKUP_DATE"

# 3. Restore code
echo "Step 3: Restoring application code..."
/scripts/restore-code.sh "$BACKUP_DATE" "bundle"

# 4. Verify system health
echo "Step 4: Verifying system health..."
/scripts/health-check.sh

echo "Complete system restore finished"
echo "Please perform manual verification of:"
echo "- Application functionality"
echo "- User authentication"
echo "- Database connectivity"
echo "- API endpoints"
```

## Backup Verification

### Automated Verification Script

```bash
#!/bin/bash
# verify-backups.sh

BACKUP_DATE="$1"
VERIFICATION_LOG="/var/log/backup-verification.log"

echo "[$(date)] Starting backup verification for $BACKUP_DATE" >> $VERIFICATION_LOG

# Verify database backup
echo "Verifying database backup..." >> $VERIFICATION_LOG
BACKUP_FILE="/backups/mongodb/$BACKUP_DATE/mongodb_backup_*.gz"
if [ -f "$BACKUP_FILE" ]; then
    # Test restore to temporary database
    TEMP_DB="test_restore_$(date +%s)"
    mongorestore --host localhost --db $TEMP_DB --gzip --archive=$BACKUP_FILE
    if [ $? -eq 0 ]; then
        echo "Database backup verification: PASS" >> $VERIFICATION_LOG
        # Clean up test database
        mongo --eval "db.getSiblingDB('$TEMP_DB').dropDatabase()"
    else
        echo "Database backup verification: FAIL" >> $VERIFICATION_LOG
    fi
else
    echo "Database backup file not found" >> $VERIFICATION_LOG
fi

# Verify configuration backup
echo "Verifying configuration backup..." >> $VERIFICATION_LOG
CONFIG_DIR="/backups/config/$BACKUP_DATE"
if [ -d "$CONFIG_DIR" ] && [ "$(ls -A $CONFIG_DIR)" ]; then
    echo "Configuration backup verification: PASS" >> $VERIFICATION_LOG
else
    echo "Configuration backup verification: FAIL" >> $VERIFICATION_LOG
fi

# Verify code backup
echo "Verifying code backup..." >> $VERIFICATION_LOG
CODE_DIR="/backups/code/$BACKUP_DATE"
if [ -d "$CODE_DIR" ] && [ "$(ls -A $CODE_DIR)" ]; then
    echo "Code backup verification: PASS" >> $VERIFICATION_LOG
else
    echo "Code backup verification: FAIL" >> $VERIFICATION_LOG
fi

echo "[$(date)] Backup verification completed" >> $VERIFICATION_LOG
```

## Monitoring and Alerting

### Backup Monitoring Script

```bash
#!/bin/bash
# monitor-backups.sh

BACKUP_AGE_THRESHOLD=1  # Days
BACKUP_SIZE_THRESHOLD=100  # MB
ALERT_EMAIL="admin@restaurant.com"

# Check if latest backup exists
LATEST_BACKUP=$(find /backups/mongodb -name "mongodb_backup_*.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
    echo "CRITICAL: No database backup found" | mail -s "Backup Alert" $ALERT_EMAIL
    exit 1
fi

# Check backup age
BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))
if [ $BACKUP_AGE -gt $((BACKUP_AGE_THRESHOLD * 24 * 3600)) ]; then
    echo "WARNING: Latest backup is older than $BACKUP_AGE_THRESHOLD days" | mail -s "Backup Age Alert" $ALERT_EMAIL
fi

# Check backup size
BACKUP_SIZE=$(du -m "$LATEST_BACKUP" | cut -f1)
if [ $BACKUP_SIZE -lt $BACKUP_SIZE_THRESHOLD ]; then
    echo "WARNING: Backup size is smaller than expected ($BACKUP_SIZE MB)" | mail -s "Backup Size Alert" $ALERT_EMAIL
fi

echo "Backup monitoring completed successfully"
```

## Disaster Recovery Procedures

### Site Failure Recovery

```bash
#!/bin/bash
# disaster-recovery.sh

REMOTE_BACKUP_SERVER="$1"
RECOVERY_LOCATION="$2"

if [ -z "$REMOTE_BACKUP_SERVER" ] || [ -z "$RECOVERY_LOCATION" ]; then
    echo "Usage: disaster-recovery.sh <remote_server> <recovery_location>"
    exit 1
fi

echo "Starting disaster recovery from $REMOTE_BACKUP_SERVER"

# 1. Restore from remote backup
echo "Step 1: Downloading backups from remote server..."
scp -r $REMOTE_BACKUP_SERVER:/backups/* $RECOVERY_LOCATION/

# 2. Restore database
echo "Step 2: Restoring database..."
/scripts/restore-mongodb.sh "$RECOVERY_LOCATION/mongodb/latest/mongodb_backup_*.gz"

# 3. Restore configuration
echo "Step 3: Restoring configuration..."
/scripts/restore-config.sh "$(date +%Y-%m-%d)"

# 4. Restore application
echo "Step 4: Restoring application..."
/scripts/restore-code.sh "$(date +%Y-%m-%d)" "bundle"

# 5. Update configuration for new environment
echo "Step 5: Updating configuration for new environment..."
/scripts/update-environment-config.sh $RECOVERY_LOCATION

# 6. Start services
echo "Step 6: Starting services..."
pm2 start ecosystem.config.js
nginx -s reload

echo "Disaster recovery completed"
echo "Manual verification required for:"
echo "- Database connectivity"
echo "- Application functionality"
echo "- External service integrations"
```

## Backup Security

### Encryption Script

```bash
#!/bin/bash
# encrypt-backup.sh

BACKUP_FILE="$1"
ENCRYPTION_KEY="/path/to/encryption.key"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: encrypt-backup.sh <backup_file>"
    exit 1
fi

# Encrypt backup file
openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "$BACKUP_FILE.enc" -pass file:$ENCRYPTION_KEY

# Verify encryption
if [ $? -eq 0 ]; then
    # Remove original file
    rm "$BACKUP_FILE"
    echo "Backup encrypted successfully: $BACKUP_FILE.enc"
else
    echo "Backup encryption failed"
    exit 1
fi
```

### Decryption Script

```bash
#!/bin/bash
# decrypt-backup.sh

ENCRYPTED_FILE="$1"
ENCRYPTION_KEY="/path/to/encryption.key"

if [ -z "$ENCRYPTED_FILE" ]; then
    echo "Usage: decrypt-backup.sh <encrypted_file>"
    exit 1
fi

# Decrypt backup file
DECRYPTED_FILE="${ENCRYPTED_FILE%.enc}"
openssl enc -aes-256-cbc -d -in "$ENCRYPTED_FILE" -out "$DECRYPTED_FILE" -pass file:$ENCRYPTION_KEY

# Verify decryption
if [ $? -eq 0 ]; then
    echo "Backup decrypted successfully: $DECRYPTED_FILE"
else
    echo "Backup decryption failed"
    exit 1
fi
```

## Testing and Validation

### Backup Restoration Test

```bash
#!/bin/bash
# test-backup-restore.sh

TEST_DB="test_restore_$(date +%s)"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: test-backup-restore.sh <backup_file>"
    exit 1
fi

echo "Testing backup restoration..."

# 1. Restore to test database
mongorestore --host localhost --db $TEST_DB --gzip --archive=$BACKUP_FILE

# 2. Verify data integrity
USER_COUNT=$(mongo $TEST_DB --eval "db.users.count()" | tail -1)
RESTAURANT_COUNT=$(mongo $TEST_DB --eval "db.restaurants.count()" | tail -1)

echo "Test database created: $TEST_DB"
echo "Users count: $USER_COUNT"
echo "Restaurants count: $RESTAURANT_COUNT"

# 3. Run data validation queries
echo "Running validation queries..."
mongo $TEST_DB <<EOF
db.users.find().forEach(function(user) {
    if (!user.email || !user.userName) {
        print("Invalid user data found");
    }
});
db.restaurants.find().forEach(function(restaurant) {
    if (!restaurant.name || !restaurant.location) {
        print("Invalid restaurant data found");
    }
});
EOF

# 4. Clean up test database
mongo --eval "db.getSiblingDB('$TEST_DB').dropDatabase()"

echo "Backup restoration test completed successfully"
```

## Emergency Contacts

### Backup Team

- **Backup Administrator:** [Name, Phone, Email]
- **Database Administrator:** [Name, Phone, Email]
- **DevOps Engineer:** [Name, Phone, Email]
- **Security Officer:** [Name, Phone, Email]

### External Vendors

- **Cloud Storage Provider:** [Contact information]
- **Backup Software Vendor:** [Contact information]
- **Data Recovery Services:** [Contact information]

## Documentation and Logs

### Backup Log Format

```bash
# /var/log/backup.log format
[2023-12-01 02:00:00] Starting daily backup
[2023-12-01 02:00:05] MongoDB backup started
[2023-12-01 02:05:15] MongoDB backup completed (size: 2.3GB)
[2023-12-01 02:05:20] Configuration backup started
[2023-12-01 02:05:25] Configuration backup completed
[2023-12-01 02:05:30] Backup verification started
[2023-12-01 02:06:15] Backup verification completed (PASS)
[2023-12-01 02:06:20] Daily backup completed successfully
```

### Incident Report Template

```markdown
## Backup/Restore Incident Report

**Date:** [Date]
**Incident Time:** [Start time - End time]
**Type:** [Backup failure/Restore failure/Data corruption]
**Severity:** [Critical/High/Medium/Low]

### Incident Description

[Brief description of the incident]

### Impact Assessment

- **Data Affected:** [What data was affected]
- **Services Affected:** [Which services were impacted]
- **Users Affected:** [Number and type of affected users]
- **Downtime:** [Duration of service interruption]

### Root Cause Analysis

[Detailed analysis of the root cause]

### Resolution Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Preventive Measures

[Actions to prevent similar incidents]

### Lessons Learned

[Key takeaways from the incident]
```
