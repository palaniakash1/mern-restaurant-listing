/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and authorization endpoints
 */

// =========================================================================
// 1️⃣ POST /api/auth/signup
// route : router.post("/signup", signup);
// =========================================================================

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: User signup
 *     description: Register a new user account
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
 *                 example: john123
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                   type: string
 *                   format: password
 *                   writeOnly: true
 *                   example: "********"
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *       400:
 *         description: Validation error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===========================================================================================
// 2️⃣ POST /api/auth/signin
// route: router.post("/signin", signin);
// ===========================================================================================

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     tags: [Auth]
 *     summary: User login
 *     description: Authenticate user and set JWT cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password1
 *     responses:
 *       200:
 *         description: Login successful
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
 *       401:
 *         description: Invalid credentials
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

// ==============================================================================================
// 3️⃣ POST /api/auth/google
// route: router.post("/google", google);
// ==============================================================================================

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Google OAuth login
 *     description: Login or signup using Google account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, googlePhotoUrl]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               googlePhotoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
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
 */

// ==================================================================================================
// 4️⃣ POST /api/auth/signout
// route: router.post("/signout", verifyToken, signout);
// ==================================================================================================

/**
 * @swagger
 * /auth/signout:
 *   post:
 *     tags: [Auth]
 *     summary: User logout
 *     description: Clear authentication cookie and log audit
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signed out successfully
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
 */

/**
 * @swagger
 * /auth/session:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session resolved
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password for current authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Current password invalid or not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and issue a new access token
 *     description: Uses the refresh cookie and returns a fresh access session.
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 *       401:
 *         description: Invalid, expired, or replayed refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/signout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out from all other sessions
 *     description: Revokes all active refresh sessions except current one.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Other sessions revoked
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: List current user sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions list returned
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     tags: [Auth]
 *     summary: Revoke a specific current-user session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Refresh session document id
 *     responses:
 *       200:
 *         description: Session revoked
 *       404:
 *         description: Session not found
 */

/**
 * @swagger
 * /auth/admin/users/{userId}/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: SuperAdmin list sessions for a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user id
 *     responses:
 *       200:
 *         description: User sessions returned
 *       403:
 *         description: Permission denied
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/admin/users/{userId}/sessions/{sessionId}:
 *   delete:
 *     tags: [Auth]
 *     summary: SuperAdmin revoke one user session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User session revoked
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Session not found
 */

/**
 * @swagger
 * /auth/admin/users/{userId}/sessions/revoke-all:
 *   post:
 *     tags: [Auth]
 *     summary: SuperAdmin revoke all active sessions for a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All user sessions revoked
 *       403:
 *         description: Permission denied
 *       404:
 *         description: User not found
 */

