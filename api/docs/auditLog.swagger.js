/**
 * @swagger
 * tags:
 *   - name: AuditLogs
 *     description: System audit log retrieval endpoints
 */

/**
 * @swagger
 * /auditlogs:
 *   get:
 *     tags: [AuditLogs]
 *     operationId: getAuditLogs
 *     summary: Get audit logs
 *     description: |
 *       Returns audit logs with filters and pagination.
 *       Access:
 *       - Admin
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [auth, restaurant, menu, category, user]
 *         description: Filter by audited entity type
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: UPDATE
 *         description: Filter by action type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
