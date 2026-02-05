/**
 * @swagger

* tags:
 *   name: AuditLogs
 *   description: System audit logs (admin & superAdmin)
*/

/**
 * @swagger
 * /api/auditlogs:
 *   get:
 *     tags: [AuditLogs]
 *     summary: Get audit logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Audit logs fetched
 *       403:
 *         description: Access denied
 *
 */
