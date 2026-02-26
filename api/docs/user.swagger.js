/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management endpoints
 */

/**
 * @swagger
 * /users/test:
 *   get:
 *     tags: [Users]
 *     summary: Test protected user endpoint
 *     description: Basic authenticated check for user module wiring.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User route is reachable
 *       401:
 *         description: Unauthorized
 */

// ================================================================================================
// router.get("/", verifyToken, verifySuperAdmin, getAllUsers);
// 🔹 1️⃣ GET /api/users – Get all users
// ================================================================================================

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users - 1
 *     description: SuperAdmin can view all users with pagination and search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by username, email, or role
 *     responses:
 *       200:
 *         description: Users fetched successfully
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
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔹 2️⃣ PATCH /api/users/:id – Update user
// router.patch("/:id", verifyToken, updateUser);
// ================================================================================================

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile - 2
 *     description: User can update their own profile. SuperAdmin can update any user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *         description: Not authorized
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔹 3️⃣ DELETE /api/users/:id – Delete user
// ================================================================================================

// (hard delete – superAdmin or self)
// router.delete("/:id", verifyToken, deleteUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user - 3
 *     description: User can delete self. SuperAdmin can delete any user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *         description: Not authorized
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔹 4️⃣ PATCH /api/users/:id/deactivate
// router.patch("/:id/deactivate", verifyToken, deactivateUser);
// ================================================================================================

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     tags: [Users]
 *     summary: Deactivate user account - 4
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
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
 *         description: Not authorized
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔹 5️⃣ PATCH /api/users/:id/restore (SuperAdmin)
//router.patch("/:id/restore", verifyToken, verifySuperAdmin, restoreUser);
// ================================================================================================

/**
 * @swagger
 * /users/{id}/restore:
 *   patch:
 *     tags: [Users]
 *     summary: Restore deactivated user - using superAdmin - 5
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User restored
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
 *         description: SuperAdmin only
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================================================
// 🔹 6️⃣ POST /api/users – Create storeManager
// router.patch( "/:id/owner", verifyToken, verifySuperAdmin, changeStoreManagerOwner,);
// ===============================================================================================================

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create store manager    - 6
 *     description:  Admin or SuperAdmin can create a storeManager.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userName, email, password]
 *             properties:
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: StoreManager created
 *       409:
 *         description: User already exists
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===========================================================================================================
// 🔹 7️⃣ PATCH /api/users/:id/restaurant – Assign storeManager
// route: router.patch( "/:id/restaurant", verifyToken, verifyAdminOrSuperAdmin, assignStoreManagerToRestaurant,);
// ===========================================================================================================

/**
 * @swagger
 * /users/{id}/restaurant:
 *   patch:
 *     tags: [Users]
 *     summary: Assign store manager to restaurant - 7
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurantId]
 *             properties:
 *               restaurantId:
 *                 type: string
 *     responses:
 *       200:
 *         description: StoreManager assigned
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
 *         description: Not authorized
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/{id}/restaurant:
 *   delete:
 *     tags: [Users]
 *     summary: Unassign store manager from restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: StoreManager unassigned
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/{id}/owner:
 *   patch:
 *     tags: [Users]
 *     summary: Change store manager owner (superAdmin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newAdminId]
 *             properties:
 *               newAdminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ownership transferred
 *       400:
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: SuperAdmin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/admins:
 *   get:
 *     tags: [Users]
 *     summary: Get available admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available admins listed
 *       403:
 *         description: SuperAdmin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/store-managers:
 *   get:
 *     tags: [Users]
 *     summary: Get store managers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: StoreManagers listed
 *       403:
 *         description: Admin/SuperAdmin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
