/**
 * @swagger
 * tags:
 *   - name: Restaurants
 *     description: Restaurant management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     RestaurantAddress:
 *       type: object
 *       required:
 *         - addressLine1
 *         - areaLocality
 *         - city
 *         - postcode
 *       properties:
 *         addressLine1:
 *           type: string
 *           example: 221B Baker Street
 *         addressLine2:
 *           type: string
 *           example: Near Central Park
 *         areaLocality:
 *           type: string
 *           example: Marylebone
 *         city:
 *           type: string
 *           example: London
 *         countyRegion:
 *           type: string
 *           example: Greater London
 *         postcode:
 *           type: string
 *           example: NW1 6XE
 *         country:
 *           type: string
 *           example: United Kingdom
 *
 *     OpeningHour:
 *       type: object
 *       properties:
 *         open:
 *           type: string
 *           example: "09:00"
 *         close:
 *           type: string
 *           example: "22:00"
 *         isClosed:
 *           type: boolean
 *           example: false
 *
 *     OpeningHours:
 *       type: object
 *       properties:
 *         monday:
 *           $ref: '#/components/schemas/OpeningHour'
 *         tuesday:
 *           $ref: '#/components/schemas/OpeningHour'
 *         wednesday:
 *           $ref: '#/components/schemas/OpeningHour'
 *         thursday:
 *           $ref: '#/components/schemas/OpeningHour'
 *         friday:
 *           $ref: '#/components/schemas/OpeningHour'
 *         saturday:
 *           $ref: '#/components/schemas/OpeningHour'
 *         sunday:
 *           $ref: '#/components/schemas/OpeningHour'
 *
 *     CreateRestaurantRequest:
 *       type: object
 *       required:
 *         - name
 *         - address
 *         - contactNumber
 *         - email
 *       properties:
 *         name:
 *           type: string
 *           example: Eat Wisely
 *         tagline:
 *           type: string
 *           example: Healthy food, happy life
 *         description:
 *           type: string
 *           example: A modern healthy restaurant
 *         address:
 *           $ref: '#/components/schemas/RestaurantAddress'
 *         location:
 *           type: object
 *           description: Optional lat/lng (skips geocoding)
 *           properties:
 *             lat:
 *               type: number
 *               example: 51.5237
 *             lng:
 *               type: number
 *               example: -0.1585
 *         openingHours:
 *           $ref: '#/components/schemas/OpeningHours'
 *         contactNumber:
 *           type: string
 *           example: "+44 7700 900123"
 *         email:
 *           type: string
 *           example: contact@eatwisely.com
 *         website:
 *           type: string
 *           example: https://eatwisely.com
 *         imageLogo:
 *           type: string
 *           example: https://cdn.example.com/logo.png
 *         gallery:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - https://cdn.example.com/1.jpg
 *             - https://cdn.example.com/2.jpg
 *         isFeatured:
 *           type: boolean
 *           description: SuperAdmin only
 *           example: true
 *         isTrending:
 *           type: boolean
 *           description: SuperAdmin only
 *           example: false
 *         adminId:
 *           type: string
 *           description: Assign restaurant to admin (SuperAdmin only)
 *           example: 65a1f9c8a9c123456789abcd
 */

// ================================================================================================
// 🔷 Endpoint 1: Create Restaurant
// router.post("/", verifyToken, verifyAdminOrSuperAdmin, create); // create new restaurant
// ================================================================================================
/**
 * @swagger
 * /restaurants:
 *   post:
 *     tags: [Restaurants]
 *     summary: Create a new restaurant - 1
 *     description: >
 *       Creates a restaurant.
 *
 *       - Admin can create only **one** restaurant
 *       - SuperAdmin can assign the restaurant to any admin
 *       - SuperAdmin can set `isFeatured` and `isTrending`
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateRestaurantRequest"
 *     responses:
 *       201:
 *         description: Restaurant created successfully
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
 *                   example: Restaurant created successfully
 *                 data:
 *                   type: object
 *                   description: Created restaurant details
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – role restrictions
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Restaurant already exists
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 2: List Restaurants (Public Search & Filters)
// router.get("/", listRestaurants);
// ================================================================================================

/**
 * @swagger
 * /restaurants:
 *   get:
 *     tags: [Restaurants]
 *     summary: List restaurants (public) - 2
 *     description: >
 *       Fetch restaurants with filters, search, sorting, and pagination.
 *
 *       - Only **published & active** restaurants are returned
 *       - Results include a computed `isOpenNow` flag
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         example: London
 *
 *       - in: query
 *         name: categories
 *         description: Comma-separated category IDs
 *         schema:
 *           type: string
 *         example: "65ab123,65ab456"
 *
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *         example: true
 *
 *       - in: query
 *         name: isTrending
 *         schema:
 *           type: boolean
 *         example: false
 *
 *       - in: query
 *         name: isOpenNow
 *         description: Filter restaurants that are currently open
 *         schema:
 *           type: boolean
 *         example: true
 *
 *       - in: query
 *         name: q
 *         description: Full-text search by name, tagline, or location
 *         schema:
 *           type: string
 *         example: pizza
 *
 *       - in: query
 *         name: sortBy
 *         description: Sort results by rating or name
 *         schema:
 *           type: string
 *           enum: [rating, name]
 *         example: rating
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *
 *     responses:
 *       200:
 *         description: Restaurants fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 hasNext:
 *                   type: boolean
 *                   example: true
 *                 hasPrev:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *
 *       400:
 *         description: Bad request
 *         content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 3: GET /api/restaurants/all — Get all restaurants (SuperAdmin only)
// router.get("/all", verifyToken, verifySuperAdmin, getAllRestaurants);
// ===============================================================================

/**
 * @swagger
 * /restaurants/all:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all restaurants (SuperAdmin only) - 3
 *     description: >
 *       Returns **all restaurants** in the system for administrative purposes.
 *
 *       **Key notes:**
 *       - SuperAdmin-only endpoint
 *       - Includes **all statuses** (draft, published, blocked)
 *       - Supports pagination and full-text search
 *       - Intended for dashboards, moderation, and audits
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: q
 *         description: Full-text search across restaurants
 *         schema:
 *           type: string
 *         example: pizza
 *
 *       - in: query
 *         name: order
 *         description: Sort order by creation date
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         example: 10
 *
 *     responses:
 *       200:
 *         description: Restaurants fetched successfully
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
 *                   example: showing all restaurants
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 hasNext:
 *                   type: boolean
 *                   example: true
 *                 hasPrev:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Restaurant document
 *
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – superAdmin only
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ================================================================================================
// 🔷 Endpoint 4: GET /api/restaurants/nearby
// router.get("/nearby", getNearByRestaurants);
// ================================================================================================
/**
 * @swagger
 * /restaurants/nearby:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get nearby restaurants - 4
 *     description: >
 *       Fetch nearby restaurants based on latitude and longitude.
 *
 *       - Only **published & active** restaurants are returned
 *       - Results are sorted by **distance (nearest first)**
 *       - Maximum of **20 restaurants**
 *       - Each restaurant includes a computed `isOpenNow` flag
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         description: Latitude of the user's location
 *         schema:
 *           type: number
 *           format: float
 *         example: 51.5136
 *
 *       - in: query
 *         name: lng
 *         required: true
 *         description: Longitude of the user's location
 *         schema:
 *           type: number
 *           format: float
 *         example: -0.1319
 *
 *       - in: query
 *         name: radius
 *         required: false
 *         description: Search radius in meters (default 5000)
 *         schema:
 *           type: integer
 *           default: 5000
 *         example: 3000
 *
 *     responses:
 *       200:
 *         description: Nearby restaurants fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 65bc1f2e9c1234567890abcd
 *                       name:
 *                         type: string
 *                         example: The Italian Corner
 *                       distance:
 *                         type: number
 *                         description: Distance in meters from the search point
 *                         example: 742.56
 *                       isOpenNow:
 *                         type: boolean
 *                         example: true
 *
 *       400:
 *         description: Latitude or longitude missing
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 5: GET /api/restaurants/id/{id} — Get restaurant by ID (SuperAdmin only)
// router.get("/:id", verifyToken, verifySuperAdmin, getRestaurantById);
// ===============================================================================

/**
 * @swagger
 * /restaurants/id/{id}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant by ID (SuperAdmin only) - 5
 *     description: >
 *       Retrieves a restaurant by its ID for administrative purposes.
 *
 *       **Key notes:**
 *       - SuperAdmin-only endpoint
 *       - Returns the complete restaurant document
 *       - Includes restaurants in any status (draft, published, blocked)
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant ID
 *         schema:
 *           type: string
 *         example: 65bc1f2e9c1234567890abcd
 *
 *     responses:
 *       200:
 *         description: Restaurant fetched successfully
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
 *                   example: "Showing your restaurant name: Pizza Palace"
 *                 data:
 *                   type: object
 *                   description: Restaurant document
 *
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – superAdmin only
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 6: GET /api/restaurants/slug/{slug} — Public restaurant by slug
// router.get("/slug/:slug", getRestaurantBySlug);
// ===============================================================================
/**
 * @swagger
 * /restaurants/slug/{slug}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant by slug (public) - 6
 *     description: >
 *       Fetch a single restaurant using its slug.
 *
 *       - Public endpoint
 *       - Only **published & active** restaurants are returned
 *       - Used for SEO-friendly restaurant pages
 *
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: eat-wisely
 *
 *     responses:
 *       200:
 *         description: Restaurant fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 7: GET /api/restaurants/{slug}/details — Public restaurant full details
// router.get("/:slug/details", getRestaurantDetails);
// ===============================================================================

/**
 * @swagger
 * /restaurants/slug/{slug}/details:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get full restaurant details (public) - 7
 *     description: >
 *       Returns complete restaurant page data.
 *
 *       Includes:
 *       - Restaurant information
 *       - Categories
 *       - Menu items
 *       - Computed `isOpenNow`
 *
 *       - Only **published & active** restaurants
 *
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: eat-wisely
 *
 *     responses:
 *       200:
 *         description: Restaurant details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 8: PATCH /api/restaurants/id/{id}/status
// router.patch("/:id/status",verifyToken,verifySuperAdmin,updateRestaurantStatus,);
// ===============================================================================

/**
 * @swagger
 * /restaurants/id/{id}/status:
 *   patch:
 *     tags: [Restaurants]
 *     summary: Update restaurant status - 8
 *     description: >
 *       SuperAdmin-only endpoint to change a restaurant's status.
 *
 *       - `published` → isActive = true
 *       - `draft` / `blocked` → isActive = false
 *
 *       Status is the **single source of truth** for activation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant ID
 *         schema:
 *           type: string
 *         example: 65bc1f2e9c1234567890abcd
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [published, draft, blocked]
 *                 example: published
 *
 *     responses:
 *       200:
 *         description: Restaurant status updated successfully
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
 *                   example: Restaurant status updated to 'published'
 *                 data:
 *                   type: object
 *                   description: Updated restaurant document
 *
 *       400:
 *         description: Invalid status or no-op update
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Only superAdmin can change restaurant status
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 9: PATCH /api/restaurants/id/{id} — Update restaurant
// router.patch("/:id",verifyToken,verifyAdminOrSuperAdmin,verifyRestaurantOwner,updateRestaurant,); // update restaurant by id - done
// ===============================================================================

/**
 * @swagger
 * /restaurants/id/{id}:
 *   patch:
 *     tags: [Restaurants]
 *     summary: Update restaurant details - 9
 *     description: >
 *       Update editable fields of a restaurant.
 *
 *       **Access rules:**
 *       - Admin → can update only their own restaurant
 *       - SuperAdmin → can update any restaurant
 *
 *       **Forbidden fields (will return 403):**
 *       - slug
 *       - status
 *       - isActive
 *       - isFeatured
 *       - isTrending
 *       - adminId
 *
 *       Address updates automatically recompute geo-location.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant ID
 *         schema:
 *           type: string
 *         example: 65bc1f2e9c1234567890abcd
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pizza Palace
 *               tagline:
 *                 type: string
 *                 example: Best slices in town
 *               description:
 *                 type: string
 *                 example: Authentic Italian pizzas with fresh ingredients
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["65aa1f2e9c1234567890bbbb"]
 *               address:
 *                 type: object
 *                 properties:
 *                   addressLine1:
 *                     type: string
 *                     example: 221B Baker Street
 *                   areaLocality:
 *                     type: string
 *                     example: Marylebone
 *                   city:
 *                     type: string
 *                     example: London
 *                   postcode:
 *                     type: string
 *                     example: NW1 6XE
 *                   country:
 *                     type: string
 *                     example: United Kingdom
 *               openingHours:
 *                 type: object
 *               contactNumber:
 *                 type: string
 *                 example: "+44 7700 900123"
 *               email:
 *                 type: string
 *                 example: contact@pizzapalace.com
 *               website:
 *                 type: string
 *                 example: https://pizzapalace.com
 *               imageLogo:
 *                 type: string
 *                 example: https://cdn.example.com/logo.png
 *               gallery:
 *                 type: array
 *                 items:
 *                   type: string
 *
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
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
 *                   example: Restaurant Updated Successfully
 *                 data:
 *                   type: object
 *                   description: Updated restaurant document
 *
 *       400:
 *         description: No valid fields provided or validation error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden field update or not restaurant owner
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 10: DELETE /api/restaurants/id/{id} — Delete restaurant
// router.delete("/:id", verifyToken, verifyAdminOrSuperAdmin, verifyRestaurantOwner, deleteRestaurant);
// ===============================================================================
/**
 * @swagger
 * /restaurants/id/{id}:
 *   delete:
 *     tags: [Restaurants]
 *     summary: Soft delete a restaurant - 10
 *     description: >
 *       Soft deletes a restaurant by marking it as **blocked** and **inactive**.
 *
 *       **What happens:**
 *       - Restaurant `status` is set to `blocked`
 *       - `isActive` is set to `false`
 *       - Admin ownership is detached
 *       - Menus and related data are preserved
 *       - Audit log entry is created
 *
 *       **Access rules:**
 *       - Admin → can delete **only their own restaurant**
 *       - SuperAdmin → can delete **any restaurant**
 *
 *       ⚠️ This is a **soft delete**. The restaurant can be restored later.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant ID to soft delete
 *         schema:
 *           type: string
 *         example: 65bc1f2e9c1234567890abcd
 *
 *     responses:
 *       200:
 *         description: Restaurant soft-deleted successfully
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
 *                   example: Restaurant deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurantId:
 *                       type: string
 *                       example: 65bc1f2e9c1234567890abcd
 *                     status:
 *                       type: string
 *                       example: blocked
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *
 *       400:
 *         description: Restaurant already deleted
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – not owner or insufficient role
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 11: PATCH /api/restaurants/id/{id}/restore — RESTORE ENDPOINT
// router.patch("/:id/restore", verifyToken, verifySuperAdmin, restoreRestaurant); // restore from soft delete
// ===============================================================================

/**
 * @swagger
 * /restaurants/id/{id}/restore:
 *   patch:
 *     tags: [Restaurants]
 *     summary: Restore a soft-deleted restaurant - 11
 *     description: >
 *       Restores a previously soft-deleted restaurant.
 *
 *       **What happens:**
 *       - Restaurant status changes from `blocked` → `draft`
 *       - `isActive` remains `false`
 *       - Explicit publishing is required to make the restaurant live
 *       - Audit log entry is created
 *
 *       **Access rules:**
 *       - SuperAdmin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant ID to restore
 *         schema:
 *           type: string
 *         example: 65bc1f2e9c1234567890abcd
 *
 *     responses:
 *       200:
 *         description: Restaurant restored successfully
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
 *                   example: Restaurant restored successfully
 *                 data:
 *                   type: object
 *                   description: Restored restaurant document
 *
 *       400:
 *         description: Only blocked restaurants can be restored
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – superAdmin only
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ======================================================================
// 🔷 Endpoint 12: GET /api/restaurants/featured — Featured restaurants (Public)
// router.get("/featured", getFeaturedRestaurants);
// ======================================================================

/**
 * @swagger
 * /restaurants/featured:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get featured restaurants - 12
 *     description: >
 *       Returns a list of **featured restaurants**.
 *
 *       - Public endpoint (no authentication required)
 *       - Only **published & active** restaurants are returned
 *       - Maximum of **10 restaurants**
 *       - Each restaurant includes `isOpenNow` flag
 *
 *     parameters:
 *             - in: query
 *               name: page
 *               schema:
 *                 type: integer
 *                 default: 1
 *             - in: query
 *               name: limit
 *               schema:
 *                 type: integer
 *                 default: 10
 *
 *     responses:
 *       200:
 *         description: Featured restaurants fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 4
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 hasNext:
 *                   type: boolean
 *                   example: false
 *                 hasPrev:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ======================================================================
// 🔷 Endpoint 13: GET /api/restaurants/trending — Trending restaurants (Public)
// ======================================================================

/**
 * @swagger
 * /restaurants/trending:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get trending restaurants - 13
 *     description: >
 *       Returns a list of **trending restaurants**.
 *
 *       - Public endpoint (no authentication required)
 *       - Only **published & active** restaurants are returned
 *       - Maximum of **10 restaurants**
 *       - Each restaurant includes `isOpenNow` flag
 *     parameters:
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *            default: 1
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *            default: 10
 *     responses:
 *       200:
 *         description: Trending restaurants fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 4
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 hasNext:
 *                   type: boolean
 *                   example: false
 *                 hasPrev:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 14: GET /api/restaurants/me — Get logged-in admin restaurant
// router.get("/me", verifyToken, verifyAdmin, getMyRestaurant);
// ===============================================================================

/**
 * @swagger
 * /restaurants/me:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get logged-in admin's restaurant - 14
 *     description: >
 *       Returns the restaurant assigned to the currently authenticated admin.
 *
 *       - Admin-only endpoint
 *       - Returns full restaurant document
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Restaurant fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Only admin can access this endpoint
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No restaurant assigned
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 16: GET /api/restaurants/me/summary — Admin restaurant summary
// router.get("/me/summary", verifyToken, verifyAdmin, getAdminRestaurantSummary);
// ===============================================================================

/**
 * @swagger
 * /restaurants/me/summary:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get admin restaurant summary - 15
 *     description: >
 *       Returns dashboard summary metrics for the logged-in admin.
 *
 *       Includes:
 *       - Active menu count
 *       - Active category count
 *       - Store manager count
 *
 *       - Admin-only endpoint
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     menuCount:
 *                       type: integer
 *                       example: 25
 *                     categoryCount:
 *                       type: integer
 *                       example: 6
 *                     storeManagerCount:
 *                       type: integer
 *                       example: 3
 *
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin only
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

// ===============================================================================
// 🔷 Endpoint 16: PATCH /api/restaurants/id/{id}/admin — Reassign restaurant ownership
// router.patch("/:id/admin", verifyToken, verifySuperAdmin, reassignRestaurantAdmin);
// ===============================================================================

/**
 * @swagger
 * /restaurants/id/{id}/admin:
 *   patch:
 *     tags: [Restaurants]
 *     summary: Reassign restaurant to another admin - 16
 *     description: >
 *       Transfers restaurant ownership to a different admin.
 *
 *       - SuperAdmin-only endpoint
 *       - Old admin is detached
 *       - New admin is assigned
 *       - Audit log entry is created
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 65bc1f2e9c1234567890abcd
 *
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
 *                 example: 65a1f9c8a9c123456789abcd
 *
 *     responses:
 *       200:
 *         description: Ownership reassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurantId:
 *                       type: string
 *                     oldAdminId:
 *                       type: string
 *                     newAdminId:
 *                       type: string
 *
 *       400:
 *         description: Invalid admin
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: SuperAdmin only
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/ErrorResponse'
 */

