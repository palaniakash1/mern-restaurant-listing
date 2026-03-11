import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import request from 'supertest';

import app from '../app.js';
import config from '../config.js';
import createRequestLogger from '../middlewares/requestLogger.js';
import logger from '../utils/logger.js';

const createMockRequestContext = ({
  headers = {},
  body,
  statusCode = 200,
  responseBody
} = {}) => {
  const req = {
    method: 'POST',
    url: '/api/runtime/log-test',
    ip: '127.0.0.1',
    headers,
    body
  };

  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.locals = responseBody ? { responseBody } : {};
  res._headers = {};
  res.setHeader = (name, value) => {
    res._headers[name] = value;
  };
  res.getHeader = (name) => res._headers[name];

  return { req, res };
};

test.beforeEach(() => {
  logger.clearRecentLogs();
});

test('request logger captures body and response payload when enabled', () => {
  const middleware = createRequestLogger({
    logBody: true,
    shouldLogResponse: true
  });
  const { req, res } = createMockRequestContext({
    headers: {
      'user-agent': 'integration-test-agent',
      'content-length': '123',
      'x-request-id': 'req-logger-1'
    },
    body: { token: 'top-secret', name: 'payload' },
    responseBody: { password: 'hide-me', ok: true }
  });

  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(req.requestId, 'req-logger-1');
  assert.equal(res.getHeader('X-Request-Id'), 'req-logger-1');

  res.statusCode = 201;
  res.setHeader('content-length', '456');
  res.emit('finish');

  const recentLogs = logger.getRecentLogs(2);
  assert.equal(recentLogs.length, 2);
  assert.equal(recentLogs[1].message, 'request.start');
  assert.equal(recentLogs[1].body.token, '[REDACTED]');
  assert.equal(recentLogs[0].message, 'request.finish');
  assert.equal(recentLogs[0].response.password, '[REDACTED]');
  assert.equal(recentLogs[0].response.ok, true);
});

test('request logger records error-level finish events for 5xx responses', () => {
  const middleware = createRequestLogger();
  const { req, res } = createMockRequestContext({
    headers: {
      'user-agent': 'integration-test-agent'
    },
    statusCode: 503
  });

  middleware(req, res, () => {});
  res.emit('finish');

  const [finishLog] = logger.getRecentLogs(1);
  assert.equal(finishLog.level, 'error');
  assert.equal(finishLog.message, 'request.finish');
  assert.equal(finishLog.statusCode, 503);
});

test('app handles OPTIONS and metrics token guard branches', async () => {
  const originalMetricsToken = config.metricsToken;

  try {
    const optionsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    assert.equal(optionsRes.status, 204);
    assert.equal(optionsRes.headers['access-control-allow-credentials'], 'true');
    assert.equal(
      optionsRes.headers['access-control-allow-methods'],
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );
    assert.equal(optionsRes.headers['x-content-type-options'], 'nosniff');

    config.metricsToken = 'metrics-secret';

    const missingMetricsTokenRes = await request(app).get('/api/metrics');
    assert.equal(missingMetricsTokenRes.status, 401);

    const validMetricsTokenRes = await request(app)
      .get('/api/metrics')
      .set('x-metrics-token', 'metrics-secret');
    assert.equal(validMetricsTokenRes.status, 200);
    assert.equal(typeof validMetricsTokenRes.body.requests.total, 'number');
    assert.equal(typeof validMetricsTokenRes.body.routes, 'object');
  } finally {
    config.metricsToken = originalMetricsToken;
  }
});
