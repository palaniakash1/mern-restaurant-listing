/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & authorization
 */

// =========================================================================
// 1️⃣ POST /api/auth/signup
// route : router.post("/signup", signup);
// =========================================================================

/**
 * @swagger
 * /api/auth/signup:
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
 *       400:
 *         description: Validation error
 */

// ===========================================================================================
// 2️⃣ POST /api/auth/signin
// route: router.post("/signin", signin);
// ===========================================================================================

/**
 * @swagger
 * /api/auth/signin:
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
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */

// ==============================================================================================
// 3️⃣ POST /api/auth/google
// route: router.post("/google", google);
// ==============================================================================================

/**
 * @swagger
 * /api/auth/google:
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
 */

// ==================================================================================================
// 4️⃣ POST /api/auth/signout
// route: router.post("/signout", verifyToken, signout);
// ==================================================================================================

/**
 * @swagger
 * /api/auth/signout:
 *   post:
 *     tags: [Auth]
 *     summary: User logout
 *     description: Clear authentication cookie and log audit
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signed out successfully
 */
