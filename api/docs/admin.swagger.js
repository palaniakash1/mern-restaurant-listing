/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: SuperAdmin administrative user-management operations
 */

// =================================================================================================================
// 2️⃣ POST /api/admin/users
// route: router.post("/users", verifyToken, verifySuperAdmin, createUserBySuperAdmin);
// =================================================================================================================

/**
 * @swagger
 * /admin/users:
 *   post:
 *     tags: [Admin]
 *     summary: Create admin or storeManager
 *     description: only-SuperAdmin creates an admin or storeManager account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userName, email, password, role]
 *             properties:
 *               userName:
 *                 type: string
 *                 example: admin_john
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: Password1
 *               role:
 *                 type: string
 *                 enum: [admin, storeManager]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (not SuperAdmin)
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

