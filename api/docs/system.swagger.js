/**
 * @swagger
 * tags:
 *   - name: System
 *     description: Service health and operational endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Readiness health check
 *     responses:
 *       200:
 *         description: Service is healthy
 */

/**
 * @swagger
 * /live:
 *   get:
 *     tags: [System]
 *     summary: Liveness health check
 *     responses:
 *       200:
 *         description: Service is alive
 */

/**
 * @swagger
 * /docs:
 *   get:
 *     tags: [System]
 *     summary: Open Swagger UI
 *     responses:
 *       200:
 *         description: Swagger UI served
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [System]
 *     summary: Operational metrics and security telemetry
 *     description: Requires `x-metrics-token` or superAdmin auth depending on deployment configuration.
 *     responses:
 *       200:
 *         description: Metrics payload served
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
