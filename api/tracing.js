/* eslint-disable no-console */
import { randomUUID } from 'node:crypto';

import { context, propagation, trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';

import config from './config.js';

const tracingConfig = config.tracing;
const sdkState = {
  sdk: null,
  startPromise: null,
  started: false
};

const INVALID_TRACE_ID = '00000000000000000000000000000000';

const createNoopMeter = () => ({
  createHistogram: () => ({
    record: () => {}
  }),
  createCounter: () => ({
    add: () => {}
  }),
  createUpDownCounter: () => ({
    add: () => {}
  })
});

const buildNodeSdk = () =>
  new NodeSDK({
    serviceName: tracingConfig.serviceName,
    autoDetectResources: true
  });

export const initTracing = async () => {
  if (!tracingConfig.enabled || config.env === 'test') {
    return false;
  }

  if (sdkState.started) {
    return true;
  }

  if (!sdkState.startPromise) {
    sdkState.sdk = buildNodeSdk();
    sdkState.startPromise = Promise.resolve(sdkState.sdk.start())
      .then(() => {
        sdkState.started = true;
        console.log(`Tracing enabled for service: ${tracingConfig.serviceName}`);
        return true;
      })
      .catch((error) => {
        console.error('Failed to initialize tracing:', error);
        sdkState.sdk = null;
        sdkState.startPromise = null;
        return false;
      });
  }

  return sdkState.startPromise;
};

export const shutdownTracing = async () => {
  if (!sdkState.sdk) {
    return;
  }

  try {
    await sdkState.sdk.shutdown();
  } catch (error) {
    console.error('Failed to shutdown tracing:', error);
  } finally {
    sdkState.sdk = null;
    sdkState.startPromise = null;
    sdkState.started = false;
  }
};

export const tracer = trace.getTracer(
  tracingConfig.serviceName,
  tracingConfig.serviceVersion
);

export const meter = createNoopMeter();

export const httpRequestDuration = {
  record: () => {}
};

export const httpRequestTotal = {
  add: () => {}
};

export const databaseOperationDuration = {
  record: () => {}
};

export const authOperationTotal = {
  add: () => {}
};

export const refreshTokensActive = {
  add: () => {}
};

const getActiveTraceId = () => trace.getActiveSpan()?.spanContext().traceId || null;

export const tracingMiddleware = (req, res, next) => {
  if (!tracingConfig.enabled || config.env === 'test') {
    req.traceId = req.requestId || randomUUID();
    res.setHeader('X-Trace-Id', req.traceId);
    return next();
  }

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key] = value;
    }
  }

  const parentContext = propagation.extract(context.active(), headers);
  const startTime = Date.now();

  tracer.startActiveSpan(
    `${req.method} ${req.path}`,
    {
      kind: 1,
      attributes: {
        'http.method': req.method,
        'http.route': req.path,
        'http.target': req.originalUrl,
        'http.user_agent': req.headers['user-agent'] || 'unknown'
      }
    },
    parentContext,
    (span) => {
      req.traceId = span.spanContext().traceId;
      if (!req.traceId || req.traceId === INVALID_TRACE_ID) {
        req.traceId = req.requestId || randomUUID();
      }
      res.setHeader('X-Trace-Id', req.traceId);

      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response_content_length': Number(
            res.getHeader('content-length') || 0
          )
        });
        httpRequestDuration.record(Date.now() - startTime, {
          method: req.method,
          route: req.path,
          status: String(res.statusCode)
        });
        httpRequestTotal.add(1, {
          method: req.method,
          route: req.path,
          status: String(res.statusCode)
        });
        if (res.statusCode >= 500) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`
          });
        }
        span.end();
      });

      next();
    }
  );
};

export const traceDatabaseOperation = async (
  operationName,
  operation,
  attributes = {}
) =>
  tracer.startActiveSpan(`db.${operationName}`, async (span) => {
    const startedAt = Date.now();
    try {
      span.setAttributes(attributes);
      const result = await operation();
      databaseOperationDuration.record(Date.now() - startedAt, {
        operation: operationName
      });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  });

export const traceAuthOperation = async (
  operationName,
  userId = null,
  metadata = {},
  operation = null
) =>
  tracer.startActiveSpan(`auth.${operationName}`, async (span) => {
    if (userId) {
      span.setAttribute('auth.user_id', String(userId));
    }
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null && typeof value !== 'object') {
        span.setAttribute(`auth.${key}`, String(value));
      }
    }

    try {
      authOperationTotal.add(1, { operation: operationName });
      if (typeof operation === 'function') {
        return await operation();
      }
      return {
        traceId: getActiveTraceId(),
        operation: operationName,
        userId
      };
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  });

export const updateRefreshTokenMetrics = (activeCount) => {
  refreshTokensActive.add(activeCount);
};

export default {
  tracer,
  meter,
  initTracing,
  shutdownTracing,
  tracingMiddleware,
  traceDatabaseOperation,
  traceAuthOperation,
  updateRefreshTokenMetrics,
  config: tracingConfig
};
