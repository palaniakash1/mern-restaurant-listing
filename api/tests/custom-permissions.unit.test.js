import assert from 'node:assert/strict';
import test from 'node:test';

import { can, canAny } from '../utils/policy.js';

const runGuard = (guard, req = {}) => {
  let nextError = null;
  guard(req, {}, (error) => {
    nextError = error || null;
  });
  return nextError;
};

test('policy middleware honors custom permission overrides', () => {
  const deniedByOverride = runGuard(can('moderate', 'review'), {
    user: {
      role: 'admin',
      customPermissions: {
        menu: ['readById']
      }
    }
  });
  assert.equal(deniedByOverride?.statusCode, 403);

  const allowedByOverride = runGuard(can('readById', 'menu'), {
    user: {
      role: 'storeManager',
      customPermissions: {
        menu: ['readById']
      }
    }
  });
  assert.equal(allowedByOverride, null);

  const allowedByCanAny = runGuard(
    canAny(['assignStoreManager', 'changeStoreManagerOwner'], 'user'),
    {
      user: {
        role: 'admin',
        customPermissions: {
          user: ['assignStoreManager']
        }
      }
    }
  );
  assert.equal(allowedByCanAny, null);
});
