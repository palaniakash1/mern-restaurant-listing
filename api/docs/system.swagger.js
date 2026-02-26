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
