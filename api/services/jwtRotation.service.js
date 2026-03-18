/* eslint-disable no-console */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { clearInterval, setInterval } from 'node:timers';
import config, { isTest } from '../config.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JWTKeyRotationService {
  constructor() {
    this.keysDir = config.jwtRotation.keysDir || path.join(__dirname, '../../keys');
    this.currentKeyId = null;
    this.keyRotationInterval = config.jwtRotation.rotationIntervalMs;
    this.keyLifetime = config.jwtRotation.keyLifetimeMs;
    this.keys = new Map();
    this.rotationTimer = null;
    this.initialized = false;
    this.ready = this.initialize().catch((error) => {
      console.error('Failed to initialize JWT key rotation:', error);
      return false;
    });
  }

  async initialize() {
    try {
      if (!config.jwtRotation.enabled || isTest) {
        return false;
      }
      await this.ensureKeysDirectory();
      await this.loadExistingKeys();
      await this.rotateKeysIfNeeded();
      this.startRotationTimer();
      this.initialized = true;
      return true;
    } catch (error) {
      throw error;
    }
  }

  async ensureKeysDirectory() {
    try {
      await fs.access(this.keysDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.keysDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  async loadExistingKeys() {
    try {
      const files = await fs.readdir(this.keysDir);
      const keyFiles = files.filter((file) => file.endsWith('.key'));

      for (const file of keyFiles) {
        const keyPath = path.join(this.keysDir, file);
        const keyData = await fs.readFile(keyPath, 'utf8');
        const keyInfo = JSON.parse(keyData);

        this.keys.set(keyInfo.kid, keyInfo);

        if (!this.currentKeyId && keyInfo.active) {
          this.currentKeyId = keyInfo.kid;
        }
      }

      if (!this.currentKeyId && keyFiles.length > 0) {
        // If no active key found, activate the most recent one
        const mostRecentKey = Array.from(this.keys.values()).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];
        if (mostRecentKey) {
          this.currentKeyId = mostRecentKey.kid;
          mostRecentKey.active = true;
          await this.saveKey(mostRecentKey);
        }
      }

      console.log(
        `Loaded ${this.keys.size} JWT keys, current key: ${this.currentKeyId}`
      );
    } catch (error) {
      console.error('Failed to load existing keys:', error);
      throw error;
    }
  }

  async rotateKeysIfNeeded() {
    const now = new Date();

    // Check if we need to rotate
    if (!this.currentKeyId) {
      await this.generateNewKey();
      return;
    }

    const currentKey = this.keys.get(this.currentKeyId);
    if (!currentKey) {
      await this.generateNewKey();
      return;
    }

    const keyAge = now - new Date(currentKey.created_at);

    // Rotate if key is older than rotation interval
    if (keyAge >= this.keyRotationInterval) {
      await this.generateNewKey();
    }
  }

  async generateNewKey() {
    const kid = crypto.randomUUID();
    const secret = crypto.randomBytes(64).toString('hex');
    const created_at = new Date().toISOString();
    const expires_at = new Date(Date.now() + this.keyLifetime).toISOString();

    const keyInfo = {
      kid,
      secret,
      created_at,
      expires_at,
      active: true,
      algorithm: 'HS256'
    };

    // Deactivate current key
    if (this.currentKeyId) {
      const currentKey = this.keys.get(this.currentKeyId);
      if (currentKey) {
        currentKey.active = false;
        await this.saveKey(currentKey);
      }
    }

    // Set new key as current
    this.currentKeyId = kid;
    this.keys.set(kid, keyInfo);

    await this.saveKey(keyInfo);

    console.log(`Generated new JWT key: ${kid}`);

    // Clean up expired keys
    await this.cleanupExpiredKeys();
  }

  async saveKey(keyInfo) {
    const keyPath = path.join(this.keysDir, `${keyInfo.kid}.key`);
    await fs.writeFile(keyPath, JSON.stringify(keyInfo, null, 2));
  }

  startRotationTimer() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateKeysIfNeeded();
        await this.cleanupExpiredKeys();
      } catch (error) {
        console.error('Error during key rotation:', error);
      }
    }, this.keyRotationInterval);

    console.log(
      `Key rotation timer started, interval: ${this.keyRotationInterval}ms`
    );
  }

  stopRotationTimer() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  getCurrentKey() {
    if (!this.currentKeyId) {
      throw new Error('No active JWT key available');
    }
    return this.keys.get(this.currentKeyId);
  }

  getKeyById(kid) {
    return this.keys.get(kid);
  }

  getAllActiveKeys() {
    return Array.from(this.keys.values()).filter((key) => key.active);
  }

  async cleanupExpiredKeys() {
    const now = new Date();
    const expiredKeys = [];

    for (const [kid, keyInfo] of this.keys) {
      if (new Date(keyInfo.expires_at) < now) {
        expiredKeys.push(kid);
      }
    }

    for (const kid of expiredKeys) {
      const keyPath = path.join(this.keysDir, `${kid}.key`);
      try {
        await fs.unlink(keyPath);
        this.keys.delete(kid);
        console.log(`Removed expired JWT key: ${kid}`);
      } catch (error) {
        console.error(`Failed to remove expired key ${kid}:`, error);
      }
    }
  }

  // Enhanced JWT signing with key rotation support
  signToken(payload, options = {}) {
    const {
      fallbackSecret = config.jwtSecret,
      expiresIn = '1h',
      ...restOptions
    } = options;

    if (!config.jwtRotation.enabled || !this.initialized || !this.currentKeyId) {
      return jwt.sign(payload, fallbackSecret, {
        expiresIn,
        ...restOptions
      });
    }

    const key = this.getCurrentKey();

    const signOptions = {
      algorithm: key.algorithm,
      expiresIn,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      keyid: key.kid,
      ...restOptions
    };

    return jwt.sign(payload, key.secret, signOptions);
  }

  // Enhanced JWT verification with key rotation support
  verifyToken(token, options = {}) {
    const { fallbackSecret = config.jwtSecret, ...verifyOptions } = options;

    // Try to decode without verification first to get the key ID
    let decoded = null;
    try {
      decoded = jwt.decode(token, { complete: true });
    } catch {
      throw new Error('Invalid token format');
    }

    if (
      config.jwtRotation.enabled &&
      this.initialized &&
      decoded?.header?.kid
    ) {
      const key = this.getKeyById(decoded.header.kid);
      if (key) {
        if (new Date() > new Date(key.expires_at)) {
          throw new Error('Key has expired');
        }

        return jwt.verify(token, key.secret, {
          algorithms: [key.algorithm],
          issuer: config.jwtIssuer,
          audience: config.jwtAudience,
          ...verifyOptions
        });
      }
    }

    return jwt.verify(token, fallbackSecret, verifyOptions);
  }

  // Get key metadata for debugging/monitoring
  getKeyMetadata() {
    return {
      currentKeyId: this.currentKeyId,
      totalKeys: this.keys.size,
      activeKeys: this.getAllActiveKeys().length,
      keys: Array.from(this.keys.values()).map((key) => ({
        kid: key.kid,
        active: key.active,
        created_at: key.created_at,
        expires_at: key.expires_at,
        algorithm: key.algorithm
      }))
    };
  }

  // Manual key rotation (for admin operations)
  async rotateKeyManually() {
    console.log('Manual key rotation requested');
    await this.generateNewKey();
    return {
      success: true,
      newKeyId: this.currentKeyId
    };
  }

  // Emergency key revocation
  async revokeKey(kid) {
    if (!this.keys.has(kid)) {
      throw new Error('Key not found');
    }

    const key = this.keys.get(kid);
    key.active = false;
    key.revoked_at = new Date().toISOString();

    await this.saveKey(key);

    // If current key was revoked, generate a new one
    if (this.currentKeyId === kid) {
      await this.generateNewKey();
    }

    console.log(`Key revoked: ${kid}`);
    return { success: true, revokedKeyId: kid };
  }
}

// Create singleton instance
const jwtRotationService = new JWTKeyRotationService();

// Graceful shutdown
process.on('SIGTERM', () => {
  jwtRotationService.stopRotationTimer();
});

process.on('SIGINT', () => {
  jwtRotationService.stopRotationTimer();
});

export default jwtRotationService;
