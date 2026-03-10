import { getRedisClient } from './redisCache.js';

const telemetryMemoryStore = new Map();
const TELEMETRY_PREFIX = 'security:telemetry:';
const KNOWN_EVENTS = [
  'login_failed',
  'login_lockout_started',
  'login_lockout_blocked',
  'refresh_invalid',
  'refresh_expired',
  'refresh_replay_detected',
  'refresh_revoked',
  'sessions_revoked_all',
  'sessions_revoked_single'
];

const toSafeInt = (value) => {
  const parsed = Number.parseInt(String(value || '0'), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const incrementSecurityEvent = async (eventName, count = 1) => {
  const event = String(eventName || '').trim();
  if (!event) {
    return;
  }

  const delta = Math.max(1, toSafeInt(count));
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.incrby(`${TELEMETRY_PREFIX}${event}`, delta);
      return;
    } catch {
      // Fall back to memory counter.
    }
  }

  telemetryMemoryStore.set(event, (telemetryMemoryStore.get(event) || 0) + delta);
};

export const getSecurityTelemetry = async () => {
  const redis = getRedisClient();
  const result = {};

  for (const event of KNOWN_EVENTS) {
    result[event] = 0;
  }

  if (redis) {
    try {
      const values = await redis.mget(KNOWN_EVENTS.map((event) => `${TELEMETRY_PREFIX}${event}`));
      KNOWN_EVENTS.forEach((event, index) => {
        result[event] = toSafeInt(values?.[index]);
      });
      return result;
    } catch {
      // Fall back to memory telemetry.
    }
  }

  for (const event of KNOWN_EVENTS) {
    result[event] = telemetryMemoryStore.get(event) || 0;
  }
  return result;
};

export const resetSecurityTelemetry = () => {
  telemetryMemoryStore.clear();
};

export default {
  incrementSecurityEvent,
  getSecurityTelemetry,
  resetSecurityTelemetry
};
