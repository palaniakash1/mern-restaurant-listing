/**
 * @swagger
 * tags:
 *   - name: FSA Ratings
 *     description: Food Standards Agency (FSA) hygiene rating integration APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FSAAddress:
 *       type: object
 *       properties:
 *         line1:
 *           type: string
 *           example: 123 Oxford Street
 *         line2:
 *           type: string
 *           example: Central London
 *         line3:
 *           type: string
 *           example: London
 *         postcode:
 *           type: string
 *           example: W1D 3QW
 *
 *     FSAEstablishment:
 *       type: object
 *       properties:
 *         fhrsId:
 *           type: integer
 *           description: Food Hygiene Rating Scheme ID
 *           example: 123456
 *         name:
 *           type: string
 *           example: Pizza Express
 *         address:
 *           $ref: '#/components/schemas/FSAAddress'
 *         rating:
 *           type: string
 *           enum: ['0', '1', '2', '3', '4', '5', 'Exempt']
 *           description: Hygiene rating value
 *           example: '5'
 *         ratingDate:
 *           type: string
 *           format: date
 *           description: Date of last inspection
 *           example: '2024-01-15'
 *         hygieneScore:
 *           type: integer
 *           description: Hygiene score from inspection
 *           example: 5
 *         structuralScore:
 *           type: integer
 *           description: Structural score from inspection
 *           example: 5
 *         confidenceInManagementScore:
 *           type: integer
 *           description: Confidence in management score
 *           example: 5
 *
 *     FSARatingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/FSAEstablishment'
 *         badgeUrl:
 *           type: string
 *           description: URL to the FSA rating badge image
 *           example: 'https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-5.svg'
 *
 *     FSASearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         matched:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/FSAEstablishment'
 *         multipleOptions:
 *           type: array
 *           description: Alternative matches if multiple establishments have similar scores
 *           items:
 *             $ref: '#/components/schemas/FSAEstablishment'
 *         score:
 *           type: number
 *           description: Match confidence score (0-1)
 *           example: 0.92
 *         message:
 *           type: string
 *           description: Status message when no match found
 *
 *     FSARestaurantStatus:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         linked:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             fhrsId:
 *               type: integer
 *               nullable: true
 *               example: 123456
 *             rating:
 *               type: string
 *               nullable: true
 *               example: '5'
 *             badgeUrl:
 *               type: string
 *               nullable: true
 *             lastRefreshed:
 *               type: string
 *               format: date-time
 *               nullable: true
 *
 *     LinkFSARequest:
 *       type: object
 *       required:
 *         - fhrsId
 *       properties:
 *         fhrsId:
 *           type: integer
 *           minimum: 1
 *           description: FHRS ID to link
 *           example: 123456
 *
 *     AutoLinkResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         linked:
 *           type: boolean
 *           example: true
 *         matchScore:
 *           type: number
 *           description: Confidence score of the match
 *           example: 0.92
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/FSARestaurantStatus'
 *         multipleOptions:
 *           type: array
 *           description: Multiple matches found, user needs to select one
 *           items:
 *             $ref: '#/components/schemas/FSAEstablishment'
 */

// ================================================================================================
// 🔷 Endpoint 1: Search FSA Establishments (Public)
// router.get("/search", searchFSA);
// ================================================================================================
/**
 * @swagger
 * /fsa/search:
 *   get:
 *     tags: [FSA Ratings]
 *     summary: Search FSA establishments (Public)
 *     description: >
 *       Search for food establishments in the UK Food Hygiene Rating Scheme (FHRS).
 *
 *       **Key features:**
 *       - Public endpoint - no authentication required
 *       - Search by restaurant name (required, min 2 characters)
 *       - Optionally filter by UK postcode for more accurate matching
 *       - Returns best match with confidence score
 *       - Returns multiple options if similar matches found (confidence within 20% of best)
 *       - Results cached in Redis for performance
 *
 *       **Matching algorithm considers:**
 *       - Name similarity (normalized comparison)
 *       - Business type matching
 *       - Postcode proximity (if provided)
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         description: Restaurant/business name to search (minimum 2 characters)
 *         schema:
 *           type: string
 *           minLength: 2
 *         example: Pizza Express
 *
 *       - in: query
 *         name: postcode
 *         required: false
 *         description: UK postcode for more accurate matching
 *         schema:
 *           type: string
 *         example: W1D 3QW
 *
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FSASearchResponse'
 *             example:
 *               success: true
 *               data:
 *                 matched: true
 *                 result:
 *                   fhrsId: 123456
 *                   name: "Pizza Express"
 *                   address:
 *                     line1: "123 Oxford Street"
 *                     postcode: "W1D 3QW"
 *                   rating: "5"
 *                 multipleOptions: null
 *                 score: 0.92
 *
 *       400:
 *         description: Validation error - name too short or missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: '"name" must be at least 2 characters'
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 2: Get Rating by FHRSID (Public)
// router.get("/rating/:fhrsId", getRating);
// ================================================================================================
/**
 * @swagger
 * /fsa/rating/{fhrsId}:
 *   get:
 *     tags: [FSA Ratings]
 *     summary: Get FSA rating by FHRSID (Public)
 *     description: >
 *       Fetch hygiene rating details for a specific food establishment using its
 *       FHRS (Food Hygiene Rating Scheme) ID.
 *
 *       **Key features:**
 *       - Public endpoint - no authentication required
 *       - Results cached for 24 hours in Redis
 *       - Returns full establishment details including:
 *         - Rating value (0-5 or Exempt)
 *         - Rating date
 *         - Individual scores (Hygiene, Structural, Confidence in Management)
 *         - Pre-generated badge URL
 *       - Falls back to FSA API on cache miss
 *
 *       **Use cases:**
 *       - Display rating on public restaurant pages
 *       - Fetch latest rating data
 *     parameters:
 *       - in: path
 *         name: fhrsId
 *         required: true
 *         description: FHRS ID of the establishment (positive integer)
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 123456
 *
 *     responses:
 *       200:
 *         description: Rating found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FSARatingResponse'
 *             example:
 *               success: true
 *               data:
 *                 fhrsId: 123456
 *                 name: "Pizza Express"
 *                 rating: "5"
 *                 ratingDate: "2024-01-15"
 *                 hygieneScore: 5
 *               badgeUrl: "https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-5.svg"
 *
 *       400:
 *         description: Invalid FHRSID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: '"fhrsId" must be a positive integer'
 *
 *       404:
 *         description: Establishment not found in FSA database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Establishment not found"
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 3: Get Restaurant FSA Status (Protected)
// router.get("/restaurant/:restaurantId", verifyToken, getRestaurantRating);
// ================================================================================================
/**
 * @swagger
 * /fsa/restaurant/{restaurantId}:
 *   get:
 *     tags: [FSA Ratings]
 *     summary: Get restaurant's FSA rating status
 *     description: >
 *       Retrieve the current FSA rating link status for a restaurant.
 *
 *       **Authentication required:** Bearer token
 *
 *       **Returns:**
 *       - Whether the restaurant is linked to an FSA establishment
 *       - Current FHRSID (if linked)
 *       - Cached rating value
 *       - Badge URL for display
 *       - Last refresh timestamp
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         description: MongoDB ObjectId of the restaurant
 *         schema:
 *           type: string
 *         example: 65a1f9c8a9c123456789abcd
 *
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FSARestaurantStatus'
 *             example:
 *               success: true
 *               linked: true
 *               data:
 *                 fhrsId: 123456
 *                 rating: "5"
 *                 badgeUrl: "https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-5.svg"
 *                 lastRefreshed: "2024-01-20T10:30:00.000Z"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 4: Link Restaurant to FHRSID (Protected)
// router.post("/restaurant/:restaurantId/link", verifyToken, linkRestaurant);
// ================================================================================================
/**
 * @swagger
 * /fsa/restaurant/{restaurantId}/link:
 *   post:
 *     tags: [FSA Ratings]
 *     summary: Link restaurant to FSA rating
 *     description: >
 *       Manually link a restaurant to an FSA establishment by providing the FHRSID.
 *
 *       **Authentication required:** Bearer token
 *
 *       **What happens:**
 *       - Validates the FHRSID exists in FSA database
 *       - Fetches current rating data
 *       - Updates restaurant document with FHRSID and rating
 *       - Generates badge URL for display
 *       - Sets lastRefreshed timestamp
 *
 *       **Validation:**
 *       - FHRSID must be a positive integer
 *       - FHRSID must exist in FSA database
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         description: MongoDB ObjectId of the restaurant
 *         schema:
 *           type: string
 *         example: 65a1f9c8a9c123456789abcd
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkFSARequest'
 *           example:
 *             fhrsId: 123456
 *
 *     responses:
 *       200:
 *         description: Successfully linked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Restaurant linked to FSA rating successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FSARestaurantStatus'
 *
 *       400:
 *         description: Validation error - invalid FHRSID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: '"fhrsId" must be a positive integer'
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Restaurant or FSA establishment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 5: Auto-Link Restaurant (Protected)
// router.post("/restaurant/:restaurantId/auto-link", verifyToken, autoLinkRestaurant);
// ================================================================================================
/**
 * @swagger
 * /fsa/restaurant/{restaurantId}/auto-link:
 *   post:
 *     tags: [FSA Ratings]
 *     summary: Auto-match and link restaurant
 *     description: >
 *       Automatically search for the restaurant in FSA database using its name and
 *       postcode, then link if a confident match is found.
 *
 *       **Authentication required:** Bearer token
 *
 *       **What happens:**
 *       - Fetches restaurant data from database
 *       - Searches FSA API using restaurant name and postcode
 *       - Uses matching algorithm to find best match
 *       - If match score >= 0.4: Auto-links to best match
 *       - If match score < 0.4: Returns no match
 *       - If multiple matches with similar scores: Returns all options
 *
 *       **Match score thresholds:**
 *       - >= 0.8: High confidence, auto-link
 *       - 0.4-0.8: Medium confidence, auto-link
 *       - < 0.4: No match found
 *       - Within 20% of best: Multiple options returned
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         description: MongoDB ObjectId of the restaurant
 *         schema:
 *           type: string
 *         example: 65a1f9c8a9c123456789abcd
 *
 *     responses:
 *       200:
 *         description: Auto-link result (success or multiple options)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutoLinkResponse'
 *             examples:
 *               success:
 *                 summary: Match found and linked
 *                 value:
 *                   success: true
 *                   linked: true
 *                   matchScore: 0.92
 *                   data:
 *                     fhrsId: 123456
 *                     rating: "5"
 *               noMatch:
 *                 summary: No matching establishment found
 *                 value:
 *                   success: false
 *                   linked: false
 *                   message: "No matching FSA establishment found"
 *                   data: null
 *               multipleOptions:
 *                 summary: Multiple matches found
 *                 value:
 *                   success: false
 *                   linked: false
 *                   message: "Multiple potential matches found"
 *                   multipleOptions:
 *                     - fhrsId: 123456
 *                       name: "Similar Name Branch 1"
 *                     - fhrsId: 123457
 *                       name: "Similar Name Branch 2"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 6: Unlink Restaurant (Protected)
// router.delete("/restaurant/:restaurantId/link", verifyToken, unlinkRestaurant);
// ================================================================================================
/**
 * @swagger
 * /fsa/restaurant/{restaurantId}/link:
 *   delete:
 *     tags: [FSA Ratings]
 *     summary: Unlink restaurant from FSA rating
 *     description: >
 *       Remove the FSA rating link from a restaurant.
 *
 *       **Authentication required:** Bearer token
 *
 *       **What happens:**
 *       - Sets fhrsId to null
 *       - Clears fsaRating.value
 *       - Clears fsaRating.lastRefreshed
 *       - Clears fsaRating.isManuallyLinked flag
 *
 *       **Note:** This does NOT delete the restaurant, only removes the FSA link.
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         description: MongoDB ObjectId of the restaurant
 *         schema:
 *           type: string
 *         example: 65a1f9c8a9c123456789abcd
 *
 *     responses:
 *       200:
 *         description: Successfully unlinked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Restaurant unlinked from FSA rating successfully"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 7: Refresh Restaurant Rating (Protected)
// router.post("/restaurant/:restaurantId/refresh", verifyToken, refreshRestaurantRating);
// ================================================================================================
/**
 * @swagger
 * /fsa/restaurant/{restaurantId}/refresh:
 *   post:
 *     tags: [FSA Ratings]
 *     summary: Refresh restaurant FSA rating
 *     description: >
 *       Fetch the latest rating from FSA API and update the database.
 *
 *       **Authentication required:** Bearer token
 *
 *       **What happens:**
 *       - Validates restaurant has a linked FHRSID
 *       - Bypasses cache, fetches fresh data from FSA API
 *       - Updates fsaRating.value with latest rating
 *       - Updates fsaRating.lastRefreshed timestamp
 *       - Regenerates badgeUrl
 *
 *       **Use cases:**
 *       - Manual refresh before important dates
 *       - Verify rating hasn't changed
 *       - Update stale cached data
 *
 *       **Note:** This does NOT update cache for public GET endpoints.
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         description: MongoDB ObjectId of the restaurant
 *         schema:
 *           type: string
 *         example: 65a1f9c8a9c123456789abcd
 *
 *     responses:
 *       200:
 *         description: Rating refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Rating refreshed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FSARestaurantStatus'
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Restaurant not found or not linked to FSA
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
