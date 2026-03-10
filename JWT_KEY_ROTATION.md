# JWT Key Rotation

This document describes the JWT key rotation implementation for the MERN Restaurant API.

## Overview

The JWT key rotation system provides automatic rotation of JWT signing keys to enhance security and reduce the impact of potential key compromise.

## Features

### Automatic Key Rotation

- Keys are automatically rotated every 24 hours by default
- Each key has a 7-day lifetime
- Multiple keys can be active simultaneously for seamless rotation
- Old keys remain valid until expiration to handle in-flight tokens

### Manual Key Management

- Emergency key rotation via admin API
- Individual key revocation
- Manual cleanup of expired keys
- Key metadata retrieval for monitoring

### Security Features

- Keys are stored encrypted on disk
- Key IDs (kid) are included in JWT headers for rotation support
- Automatic cleanup of expired keys
- Graceful handling of key rotation during high traffic

## Configuration

### Environment Variables

```bash
# Key rotation interval (default: 24 hours)
JWT_KEY_ROTATION_INTERVAL=86400000

# Key lifetime (default: 7 days)
JWT_KEY_LIFETIME=604800000

# Directory to store keys (default: ./keys)
JWT_KEYS_DIR=/path/to/keys

# JWT issuer (default: mern-restaurant-api)
JWT_ISSUER=your-app-name

# JWT audience (default: mern-restaurant-client)
JWT_AUDIENCE=your-client-name
```

### Key Storage

Keys are stored as JSON files in the specified directory:

```keys/
├── key1.json
├── key2.json
└── key3.json
```

Each key file contains:

```json
{
  "kid": "uuid-v4",
  "secret": "64-byte-hex-string",
  "created_at": "2023-12-01T10:00:00.000Z",
  "expires_at": "2023-12-08T10:00:00.000Z",
  "active": true,
  "algorithm": "HS256",
  "revoked_at": null
}
```

## API Endpoints

### GET /api/admin/jwt/keys

Retrieve JWT key metadata for monitoring and debugging.

**Response:**

```json
{
  "success": true,
  "data": {
    "currentKeyId": "key-uuid",
    "totalKeys": 3,
    "activeKeys": 2,
    "keys": [
      {
        "kid": "key-uuid-1",
        "active": true,
        "created_at": "2023-12-01T10:00:00.000Z",
        "expires_at": "2023-12-08T10:00:00.000Z",
        "algorithm": "HS256"
      }
    ]
  }
}
```

### POST /api/admin/jwt/rotate

Force immediate key rotation (emergency rotation).

**Response:**

```json
{
  "success": true,
  "message": "JWT key rotated successfully",
  "data": {
    "newKeyId": "new-key-uuid"
  }
}
```

### POST /api/admin/jwt/revoke/{kid}

Revoke a specific key by its ID.

**Response:**

```json
{
  "success": true,
  "message": "JWT key revoked successfully",
  "data": {
    "revokedKeyId": "key-uuid"
  }
}
```

### POST /api/admin/jwt/cleanup

Manually trigger cleanup of expired keys.

**Response:**

```json
{
  "success": true,
  "message": "Expired JWT keys cleaned up successfully"
}
```

## Usage Examples

### Emergency Key Rotation

```bash
# Force key rotation
curl -X POST https://api.example.com/api/admin/jwt/rotate \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json"
```

### Revoke Compromised Key

```bash
# Revoke a specific key
curl -X POST https://api.example.com/api/admin/jwt/revoke/key-uuid-123 \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json"
```

### Monitor Key Status

```bash
# Get key metadata
curl -X GET https://api.example.com/api/admin/jwt/keys \
  -H "Authorization: Bearer your-admin-token"
```

## Integration with Existing Code

### Authentication Service

The JWT rotation service integrates seamlessly with the existing authentication system:

```javascript
import jwtRotationService from './services/jwtRotation.service.js';

// Signing tokens
const token = jwtRotationService.signToken(
  {
    id: user._id,
    role: user.role
  },
  {
    expiresIn: '1h'
  }
);

// Verifying tokens
try {
  const decoded = jwtRotationService.verifyToken(token);
  // Token is valid and verified with the correct key
} catch (error) {
  // Token is invalid or key not found
}
```

### Controller Integration

```javascript
import jwtRotationService from '../services/jwtRotation.service.js';

export const signin = async (req, res, next) => {
  try {
    // ... authentication logic ...

    const token = jwtRotationService.signToken({
      id: user._id,
      role: user.role
    });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};
```

## Monitoring and Alerting

### Key Metrics

The system tracks the following metrics:

- Number of active keys
- Key rotation frequency
- Key expiration status
- Token verification success rate

### Health Checks

Monitor these endpoints for key rotation health:

- `/api/admin/jwt/keys` - Key status
- `/api/health` - General health
- `/api/metrics` - Prometheus metrics

### Alerting

Set up alerts for:

- No active keys available
- Key rotation failures
- High token verification failure rate
- Expired keys not being cleaned up

## Security Considerations

### Key Storages

- Keys are stored as JSON files with random filenames
- Consider using encrypted storage for production
- Restrict file system permissions to application user only

### Key Rotation

- Always have at least one active key
- Allow sufficient overlap between key rotations
- Monitor for key rotation failures

### Token Lifespan

- Keep access tokens short-lived (1 hour recommended)
- Use refresh tokens for longer sessions
- Implement proper token revocation

## Troubleshooting

### Common Issues

**No active keys available:**

- Check key directory permissions
- Verify key files are not corrupted
- Check system time synchronization

**Token verification failures:**

- Verify key IDs match between signing and verification
- Check key expiration times
- Ensure all active keys are loaded

**Key rotation failures:**

- Check disk space for key storage
- Verify file system permissions
- Check system time synchronization

### Debug Commands

```bash
# Check key directory
ls -la keys/

# Check key file content
cat keys/key-uuid.json

# Test token signing and verification
node -e "
const jwtRotationService = require('./services/jwtRotation.service.js');
const token = jwtRotationService.signToken({test: true});
console.log('Token:', token);
console.log('Verified:', jwtRotationService.verifyToken(token));
"
```

## Backup and Recovery

### Key Backup

Backup the keys directory regularly:

```bash
# Create backup
tar -czf jwt-keys-backup-$(date +%Y%m%d).tar.gz keys/

# Restore backup
tar -xzf jwt-keys-backup-20231201.tar.gz
```

### Key Recovery

In case of key loss:

1. Generate new keys via admin API
2. Force rotation to activate new keys
3. Monitor for token verification issues
4. Consider extending token lifetimes temporarily

## Performance Impact

### Memory Usage

- Keys are loaded into memory at startup
- Minimal memory overhead (few KB per key)
- Automatic cleanup prevents memory leaks

### CPU Usage

- Key rotation is minimal CPU overhead
- Token signing/verification performance unchanged
- Background rotation has negligible impact

### Disk Usage

- Each key uses ~500 bytes of disk space
- Automatic cleanup prevents disk space issues
- Consider log rotation for key operation logs

## Future Enhancements

### Planned Features

- Support for asymmetric key algorithms (RS256)
- Integration with external key management systems
- Key rotation scheduling and notifications
- Automated key backup and recovery

### Integration Opportunities

- HashiCorp Vault integration
- AWS KMS integration
- Azure Key Vault integration
- Google Cloud KMS integration
