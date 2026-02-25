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

