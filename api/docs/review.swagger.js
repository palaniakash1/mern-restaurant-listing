/**
 * @swagger
 * tags:
 *   - name: Reviews
 *     description: Restaurant review and moderation endpoints
 */

/**
 * @swagger
 * /reviews/restaurant/{restaurantId}:
 *   get:
 *     tags: [Reviews]
 *     summary: List active reviews for a restaurant
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *   post:
 *     tags: [Reviews]
 *     summary: Create review for restaurant (public user only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created
 *       403:
 *         description: Only users can create reviews
 */

/**
 * @swagger
 * /reviews/restaurant/{restaurantId}/summary:
 *   get:
 *     tags: [Reviews]
 *     summary: Get rating summary for a restaurant
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Summary returned
 */

/**
 * @swagger
 * /reviews/my:
 *   get:
 *     tags: [Reviews]
 *     summary: Get current user's active reviews
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviews listed
 *       403:
 *         description: Only users can access this endpoint
 */

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get a single active review by ID
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
 *         description: Review returned
 *       403:
 *         description: Not authorized to view this review
 *   patch:
 *     tags: [Reviews]
 *     summary: Update review (owner or superAdmin)
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
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated
 *   delete:
 *     tags: [Reviews]
 *     summary: Soft delete review (owner or superAdmin)
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
 *         description: Review deleted
 */

/**
 * @swagger
 * /reviews/{id}/moderate:
 *   patch:
 *     tags: [Reviews]
 *     summary: Moderate review status (admin for own restaurant or superAdmin)
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
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review moderation applied
 *       403:
 *         description: Not authorized
 */
