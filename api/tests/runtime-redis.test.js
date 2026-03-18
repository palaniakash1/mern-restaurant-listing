import test from 'node:test';
import assert from 'node:assert/strict';

import {
  atomicRateLimitIncrement,
  clear,
  closeRedis,
  del,
  deleteKey,
  get,
  getCacheStats,
  getJson,
  getOrFetch,
  getRedisClient,
  initRedis,
  invalidatePattern,
  isRedisConnected,
  set,
  setJson,
  setJsonIfAbsent,
  __setRedisTestState
} from '../utils/redisCache.js';

test.beforeEach(async () => {
  await clear();
});

test('redis helpers expose a safe disconnected fallback state', async () => {
  const wasConnected = isRedisConnected();
  __setRedisTestState({ client: null, available: false });

  assert.equal(isRedisConnected(), false);
  assert.equal(getRedisClient(), null);
  assert.equal(await initRedis(), false);

  await assert.doesNotReject(async () => {
    await closeRedis();
  });

  assert.equal(isRedisConnected(), false);
  assert.equal(getRedisClient(), null);

  if (wasConnected) {
    const Redis = await import('ioredis');
    const redis = new Redis.default(
      'redis://default:CGUmcOCrxysmkY3or4YCKnIPc1zOfUY4@redis-17809.c98.us-east-1-4.ec2.cloud.redislabs.com:17809'
    );
    __setRedisTestState({ client: redis, available: true });
  }
});

test('redis fallback aliases support basic string cache operations', async () => {
  await set('runtime:string', 'value', 30);
  assert.equal(await get('runtime:string'), 'value');

  await del('runtime:string');
  assert.equal(await get('runtime:string'), null);

  await set('runtime:delete', 'value', 30);
  await assert.doesNotReject(async () => {
    await deleteKey('runtime:delete');
  });
});

test('redis fallback json helpers cache and gate writes as expected', async () => {
  const payload = { attempts: 1, source: 'unit-test' };

  await setJson('runtime:json', payload, 30);
  assert.deepEqual(await getJson('runtime:json'), payload);

  assert.equal(
    await setJsonIfAbsent('runtime:json:once', { first: true }, 30),
    true
  );
  assert.equal(
    await setJsonIfAbsent('runtime:json:once', { first: false }, 30),
    false
  );
  assert.deepEqual(await getJson('runtime:json:once'), { first: true });
});

test('redis fallback getOrFetch and pattern invalidation behave consistently', async () => {
  let fetchCalls = 0;

  const fetcher = async () => {
    fetchCalls += 1;
    return { tokenFamily: 'family-1' };
  };

  const first = await getOrFetch('runtime:fetch', fetcher, 30);
  const second = await getOrFetch('runtime:fetch', fetcher, 30);

  assert.deepEqual(first, { tokenFamily: 'family-1' });
  assert.deepEqual(second, { tokenFamily: 'family-1' });
  assert.equal(fetchCalls, 1);

  await set('runtime:pattern:1', 'a', 30);
  await set('runtime:pattern:2', 'b', 30);
  await set('runtime:other', 'c', 30);

  const removed = await invalidatePattern('runtime:pattern:*');

  assert.equal(removed, undefined);
  assert.equal(await get('runtime:other'), 'c');
});

test('redis fallback rate-limit increment and cache stats return structured data', async () => {
  const wasConnected = isRedisConnected();
  if (wasConnected) {
    __setRedisTestState({ client: null, available: false });
  }

  const first = await atomicRateLimitIncrement('runtime:limit', 60);
  const second = await atomicRateLimitIncrement('runtime:limit', 60);
  const stats = getCacheStats();

  assert.equal(typeof first, 'object');
  assert.equal(typeof second, 'object');
  assert.equal(typeof stats, 'object');
  assert.equal(isRedisConnected(), false);

  if (wasConnected) {
    const Redis = await import('ioredis');
    const redis = new Redis.default(
      'redis://default:CGUmcOCrxysmkY3or4YCKnIPc1zOfUY4@redis-17809.c98.us-east-1-4.ec2.cloud.redislabs.com:17809'
    );
    __setRedisTestState({ client: redis, available: true });
  }
});
