/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: |
 *       Category management APIs.
 *
 *       Handles creation, updates, ordering, lifecycle management,
 *       and retrieval of both platform-wide (generic) and restaurant-specific categories.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     ErrorResponse:
 *       type: object
 *       required: [success, statusCode, message]
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         statusCode:
 *           type: integer
 *           example: 400
 *         message:
 *           type: string
 *           example: Validation error
 *
 *     Category:
 *       type: object
 *       description: Category entity representation
 *       properties:
 *         _id:
 *           type: string
 *           example: 65bc1f2e9c1234567890abcd
 *         name:
 *           type: string
 *           example: Starters
 *         slug:
 *           type: string
 *           example: starters
 *         isGeneric:
 *           type: boolean
 *           example: false
 *         restaurantId:
 *           type: string
 *           nullable: true
 *           example: 65aa1f2e9c1234567890bbbb
 *         order:
 *           type: number
 *           example: 1
 *         isActive:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           enum: [draft, published, blocked]
 *           example: published
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CategoryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: "#/components/schemas/Category"
 *
 *     CategoryListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Categories fetched successfully
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 25
 *         totalPages:
 *           type: integer
 *           example: 3
 *         hasNext:
 *           type: boolean
 *         hasPrev:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Category"
 *
 *     CreateCategoryRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:
 *           type: string
 *           example: Desserts
 *         isGeneric:
 *           type: boolean
 *         restaurantId:
 *           type: string
 *         order:
 *           type: number
 *
 *     UpdateCategoryRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         order:
 *           type: number
 *         isActive:
 *           type: boolean
 *
 *     CategoryStatusRequest:
 *       type: object
 *       required: [isActive]
 *       properties:
 *         isActive:
 *           type: boolean
 *
 *     BulkCategoryStatusRequest:
 *       type: object
 *       required: [ids, status]
 *       properties:
 *         ids:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [draft, published, blocked]
 *
 *     BulkResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         matched:
 *           type: integer
 *         modified:
 *           type: integer
 */

// ======================================================================
// 🔷 1️⃣ CREATE CATEGORY
// ======================================================================

/**
 * @swagger
 * /categories:
 *   post:
 *     tags: [Categories]
 *     operationId: createCategory
 *     summary: Create category
 *     description: |
 *       Access:
 *       - SuperAdmin → create generic categories
 *       - Admin → create categories for own restaurant
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateCategoryRequest"
 *
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
// 🔷 2️⃣ Update Category
// ======================================================================

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     operationId: updateCategory
 *     summary: Update category
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
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateCategoryRequest"
 *
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
// 🔷 3️⃣ Soft Delete Category
// ======================================================================

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Soft delete category - 3
 *     description: >
 *       Deactivates category (isActive → false).
 *
 *       - Cannot delete if linked to active menu
 *       - Generic → SuperAdmin only
 *       - Restaurant → Admin owner only
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
 *
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       403:
 *         description: Forbidden – role restriction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ======================================================================
//🔷 4️⃣ Reorder Categories
// ======================================================================

/**
 * @swagger
 * /categories/reorder:
 *   patch:
 *     tags: [Categories]
 *     operationId: reorderCategories
 *     summary: Reorder categories
 *     description: |
 *       Updates the display order of multiple categories in a single atomic operation.
 *
 *       Behaviour:
 *       - Applies bulk updates inside a transaction
 *       - Either all updates succeed or none are applied
 *       - Ensures ordering consistency
 *
 *       Access control:
 *       - Admin → can reorder categories belonging to their restaurant
 *       - SuperAdmin → can reorder any categories
 *
 *       Payload rules:
 *       - Must be a non-empty array
 *       - Each item must include `id` and numeric `order`
 *       - Duplicate IDs are not allowed
 *
 *       Operational notes:
 *       - Changes are audit logged
 *       - Used by drag-and-drop UI ordering
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             minItems: 1
 *             items:
 *               type: object
 *               required:
 *                 - id
 *                 - order
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Category ID
 *                   example: 65bc1f2e9c1234567890abcd
 *                 order:
 *                   type: integer
 *                   description: Display position
 *                   example: 1
 *
 *     responses:
 *       200:
 *         description: Categories reordered successfully
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
 *                   example: Categories reordered successfully
 *
 *       400:
 *         description: Invalid payload or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Permission denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       404:
 *         description: One or more categories not found or unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 5️⃣ Public Categories
// ======================================================================
/**
 * @swagger
 * /categories:
 *   get:
 *     tags: [Categories]
 *     operationId: listPublicCategories
 *     summary: List public categories
 *     description: |
 *       Retrieves active categories visible to the public.
 *
 *       Behaviour:
 *       - Returns only active categories
 *       - If `restaurantId` is provided → returns:
 *           • Generic categories
 *           • Categories belonging to that restaurant
 *       - If `restaurantId` is omitted → returns generic categories only
 *
 *       Search:
 *       - Performs case-insensitive search on name and slug
 *
 *       Pagination:
 *       - Uses standard pagination with page and limit
 *
 *       Sorting:
 *       - Sorted by updatedAt by default
 *
 *       Use cases:
 *       - Public menu browsing
 *       - Category selector UI
 *
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         description: Restaurant ID to include restaurant-specific categories
 *         schema:
 *           type: string
 *           example: 65aa1f2e9c1234567890bbbb
 *
 *       - in: query
 *         name: search
 *         description: Search categories by name or slug
 *         schema:
 *           type: string
 *           example: desserts
 *
 *       - in: query
 *         name: page
 *         description: Page number (default 1)
 *         schema:
 *           type: integer
 *           example: 1
 *
 *       - in: query
 *         name: limit
 *         description: Number of records per page (default 10)
 *         schema:
 *           type: integer
 *           example: 10
 *
 *       - in: query
 *         name: sort
 *         description: Sort order by updatedAt
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryListResponse"
 *
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 6️⃣ Get My Categories
// ======================================================================

/**
 * @swagger
 * /categories/my:
 *   get:
 *     tags: [Categories]
 *     operationId: listMyCategories
 *     summary: List categories for the authenticated admin
 *     description: |
 *       Retrieves active categories belonging to the authenticated admin's restaurant.
 *
 *       Access rules:
 *       - Admin only
 *       - Categories are scoped strictly to the admin’s assigned restaurant
 *
 *       Behaviour:
 *       - Returns only active categories
 *       - Results are paginated
 *       - Sorted by updatedAt
 *
 *       Use cases:
 *       - Admin dashboard
 *       - Category management panel
 *       - Internal configuration tools
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page number (default 1)
 *         schema:
 *           type: integer
 *           example: 1
 *
 *       - in: query
 *         name: limit
 *         description: Number of records per page (default 10)
 *         schema:
 *           type: integer
 *           example: 10
 *
 *       - in: query
 *         name: order
 *         description: Sort order by updatedAt
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryListResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — only admins can access this resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 7️⃣ Get Category By ID
// ======================================================================

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     operationId: getCategoryById
 *     summary: Retrieve a category by ID
 *     description: |
 *       Fetches a single category by its unique identifier.
 *
 *       Access rules:
 *       - Admin → can access only categories belonging to their restaurant
 *       - SuperAdmin → can access all categories including generic
 *
 *       Behaviour:
 *       - Returns category details if found
 *       - Ownership validation enforced for restaurant categories
 *
 *       Use cases:
 *       - Edit category screen
 *       - Admin dashboard inspection
 *       - Internal tools
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique category identifier
 *         schema:
 *           type: string
 *           example: 65bc1f2e9c1234567890abcd
 *
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — not allowed to access this category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 8️⃣ Update Category Status
// ======================================================================

/**
 * @swagger
 * /categories/{id}/status:
 *   patch:
 *     tags: [Categories]
 *     operationId: updateCategoryStatus
 *     summary: Update category activation status
 *     description: |
 *       Toggles the activation state of a category.
 *
 *       Access rules:
 *       - SuperAdmin → can modify any category
 *       - Admin → can modify only categories belonging to their restaurant
 *       - Generic categories → SuperAdmin only
 *
 *       Behaviour:
 *       - Sets `isActive` to true or false
 *       - Change is recorded in audit logs
 *       - Ownership validation enforced
 *
 *       Use cases:
 *       - Temporarily hide category
 *       - Restore visibility without full restore flow
 *       - Moderation actions
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique category identifier
 *         schema:
 *           type: string
 *           example: 65bc1f2e9c1234567890abcd
 *
 *     requestBody:
 *       required: true
 *       description: Activation state payload
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CategoryStatusRequest"
 *
 *     responses:
 *       200:
 *         description: Category status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *
 *       400:
 *         description: Invalid request or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 9️⃣ Restore Category
// ======================================================================

/**
 * @swagger
 * /categories/{id}/restore:
 *   patch:
 *     tags: [Categories]
 *     operationId: restoreCategory
 *     summary: Restore a soft-deleted category
 *     description: |
 *       Reactivates a previously soft-deleted category.
 *
 *       Preconditions:
 *       - Category must exist
 *       - Category must currently be inactive
 *
 *       Access rules:
 *       - SuperAdmin → can restore any category
 *
 *       Behaviour:
 *       - Sets `isActive` to true
 *       - Restores category visibility
 *       - Records restore event in audit logs
 *
 *       Use cases:
 *       - Undo accidental deletion
 *       - Moderation reversal
 *       - Operational recovery
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique category identifier
 *         schema:
 *           type: string
 *           example: 65bc1f2e9c1234567890abcd
 *
 *     responses:
 *       200:
 *         description: Category restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *
 *       400:
 *         description: Invalid request or category already active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 🔟 Get All Categories (SuperAdmin)
// ======================================================================

/**
 * @swagger
 * /categories/all:
 *   get:
 *     tags: [Categories]
 *     operationId: listAllCategoriesAdmin
 *     summary: List all categories (including inactive)
 *     description: |
 *       Returns a full dataset of categories across the platform.
 *
 *       This endpoint is intended for administrative and compliance workflows.
 *
 *       Access rules:
 *       - SuperAdmin only
 *
 *       Behaviour:
 *       - Includes active and inactive categories
 *       - Supports search filtering
 *       - Paginated for large datasets
 *       - Sorted by creation date (newest first)
 *
 *       Use cases:
 *       - Platform moderation dashboards
 *       - Compliance audits
 *       - Operational investigations
 *       - Data export pipelines
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page number
 *         schema:
 *           type: integer
 *           example: 1
 *
 *       - in: query
 *         name: limit
 *         description: Number of records per page
 *         schema:
 *           type: integer
 *           example: 20
 *
 *       - in: query
 *         name: search
 *         description: Search by category name or slug
 *         schema:
 *           type: string
 *           example: starters
 *
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryListResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — SuperAdmin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 1️⃣1️⃣ Bulk Update Category Status
// ======================================================================

/**
 * @swagger
 * /categories/bulk-status:
 *   patch:
 *     tags: [Categories]
 *     operationId: bulkUpdateCategoryStatus
 *     summary: Bulk update category lifecycle status
 *     description: |
 *       Updates the lifecycle status for multiple categories in a single operation.
 *
 *       Access rules:
 *       - SuperAdmin only
 *
 *       Behaviour:
 *       - Applies the provided status to all specified category IDs
 *       - Operation executes within a transaction
 *       - Audit log is recorded for compliance tracking
 *
 *       Status meanings:
 *       - draft → Not visible publicly
 *       - published → Available for use
 *       - blocked → Restricted from use
 *
 *       Safety notes:
 *       - Intended for moderation workflows and administrative tools
 *       - Ensure IDs are correct before executing bulk changes
 *
 *       Use cases:
 *       - Mass publishing categories
 *       - Moderation actions
 *       - Platform lifecycle management
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       description: List of category IDs and target lifecycle status
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BulkCategoryStatusRequest"
 *
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BulkResult"
 *
 *       400:
 *         description: Validation error — invalid IDs or status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — SuperAdmin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

// ======================================================================
//🔷 1️⃣2️⃣ Hard Delete Category
// ======================================================================

/**
 * @swagger
 * /categories/{id}/hard:
 *   delete:
 *     tags: [Categories]
 *     operationId: hardDeleteCategory
 *     summary: Permanently delete category (irreversible)
 *     description: |
 *       Permanently removes a category from the system.
 *
 *       ⚠️ WARNING — This action is irreversible.
 *
 *       Once deleted:
 *       - The category cannot be restored
 *       - Historical references may remain in audit logs
 *       - Associated relationships must be clean before deletion
 *
 *       Access rules:
 *       - SuperAdmin only
 *
 *       Integrity checks:
 *       - Category must not be linked to active menus
 *       - System validates referential integrity before deletion
 *
 *       Behaviour:
 *       - Executes within a transaction
 *       - Performs final integrity validation
 *       - Removes document permanently from database
 *
 *       Audit:
 *       - Operation may be recorded for compliance tracking
 *
 *       Use cases:
 *       - GDPR deletion requests
 *       - Permanent data cleanup
 *       - Removing invalid or test data
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Category ID to permanently delete
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Category permanently deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *
 *       400:
 *         description: Validation error — invalid ID or integrity violation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       403:
 *         description: Forbidden — SuperAdmin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLogItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         actorId:
 *           type: string
 *           nullable: true
 *         actorRole:
 *           type: string
 *           enum: [anonymous, user, storeManager, admin, superAdmin]
 *         entityType:
 *           type: string
 *           example: category
 *         entityId:
 *           type: string
 *         action:
 *           type: string
 *           example: UPDATE
 *         before:
 *           type: object
 *           nullable: true
 *         after:
 *           type: object
 *           nullable: true
 *         ipAddress:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CategoryAuditListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         hasPrev:
 *           type: boolean
 *         hasNext:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/AuditLogItem"
 *
 *     CategorySlugCheckRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Category name used to generate slug if `slug` is omitted
 *           example: Main Course
 *         slug:
 *           type: string
 *           description: Optional explicit slug candidate
 *           example: main-course
 *         isGeneric:
 *           type: boolean
 *           default: false
 *         restaurantId:
 *           type: string
 *           description: Required when `isGeneric` is false
 *         categoryId:
 *           type: string
 *           description: Optional existing category ID for update checks (self-exclusion)
 *
 *     CategorySlugCheckResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             slug:
 *               type: string
 *               example: main-course
 *             available:
 *               type: boolean
 *               example: true
 *             conflictId:
 *               type: string
 *               nullable: true
 *
 *     BulkReorderCategoriesRequest:
 *       type: object
 *       required: [items]
 *       properties:
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [id, order]
 *             properties:
 *               id:
 *                 type: string
 *                 example: 65bc1f2e9c1234567890abcd
 *               order:
 *                 type: integer
 *                 minimum: 0
 *                 example: 2
 *
 *     BulkReorderCategoriesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Categories bulk reordered successfully
 *         idempotentReplay:
 *           type: boolean
 *           description: True when response is served from idempotency cache
 *         data:
 *           type: object
 *           properties:
 *             matched:
 *               type: integer
 *               example: 2
 *             modified:
 *               type: integer
 *               example: 2
 */

/**
 * @swagger
 * /categories/{id}/audit:
 *   get:
 *     tags: [Categories]
 *     operationId: getCategoryAuditLogs
 *     summary: Get audit trail for a category
 *     description: |
 *       Returns category-specific audit logs for compliance and incident review.
 *       Access:
 *       - SuperAdmin can access all category logs
 *       - Admin can access logs only for own restaurant categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: UPDATE
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryAuditListResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *
 * /categories/check-slug:
 *   post:
 *     tags: [Categories]
 *     operationId: checkCategorySlug
 *     summary: Check category slug availability
 *     description: |
 *       Pre-flight endpoint for admin UI to validate slug uniqueness before create/update.
 *       Access:
 *       - Admin or SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CategorySlugCheckRequest"
 *     responses:
 *       200:
 *         description: Slug validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategorySlugCheckResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *
 * /categories/export:
 *   get:
 *     tags: [Categories]
 *     operationId: exportCategories
 *     summary: Export categories in JSON or CSV
 *     description: |
 *       Exports category records for operations, compliance, and reporting workflows.
 *       Access:
 *       - SuperAdmin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, blocked]
 *       - in: query
 *         name: isGeneric
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *           maximum: 1000
 *     responses:
 *       200:
 *         description: Export generated successfully (JSON response or CSV download)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                 format:
 *                   type: string
 *                   example: json
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Category"
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "_id,name,slug,isGeneric,restaurantId,status,isActive,order,createdAt,updatedAt"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *
 * /categories/bulk-reorder:
 *   patch:
 *     tags: [Categories]
 *     operationId: bulkReorderCategories
 *     summary: Bulk reorder categories with idempotency
 *     description: |
 *       Reorders categories atomically and safely supports retries using idempotency key.
 *       Access:
 *       - Admin or SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-idempotency-key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique key for safe retries with same payload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BulkReorderCategoriesRequest"
 *     responses:
 *       200:
 *         description: Categories reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BulkReorderCategoriesResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 *
 * /categories/deleted:
 *   get:
 *     tags: [Categories]
 *     operationId: getDeletedCategories
 *     summary: List soft-deleted categories
 *     description: |
 *       Returns deleted categories for dedicated restore workflows.
 *       Access:
 *       - SuperAdmin only
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
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryListResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */

