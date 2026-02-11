/**
 * @swagger

* tags:
 *   name: AuditLogs
 *   description: System audit logs (admin & superAdmin)
*/

/**
 * @swagger
 * /auditlogs:
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
 *         content:
 *               application/json:
 *                 schema:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Access denied
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Error'
 *
 */
