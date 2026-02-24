/**
 * @swagger
 * tags:
 *   - name: Menus
 *     description: Menu and menu-item management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MenuItem:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         description: { type: string }
 *         image: { type: string }
 *         price: { type: number }
 *         order: { type: integer }
 *         isAvailable: { type: boolean }
 *         isActive: { type: boolean }
 *
 *     Menu:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         restaurantId: { type: string }
 *         categoryId: { type: string }
 *         status:
 *           type: string
 *           enum: [draft, published, blocked]
 *         isActive: { type: boolean }
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/MenuItem"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     MenuResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string }
 *         data:
 *           $ref: "#/components/schemas/Menu"
 *
 *     MenuListResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string }
 *         page: { type: integer }
 *         limit: { type: integer }
 *         total: { type: integer }
 *         totalPages: { type: integer }
 *         hasPrev: { type: boolean }
 *         hasNext: { type: boolean }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Menu"
 *
 *     CreateMenuRequest:
 *       type: object
 *       required: [restaurantId, categoryId]
 *       properties:
 *         restaurantId: { type: string }
 *         categoryId: { type: string }
 *
 *     AddMenuItemRequest:
 *       type: object
 *       required: [name, price]
 *       properties:
 *         name: { type: string }
 *         description: { type: string }
 *         image: { type: string }
 *         price: { type: number, minimum: 0 }
 *
 *     UpdateMenuItemRequest:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         description: { type: string }
 *         image: { type: string }
 *         price: { type: number, minimum: 0 }
 *
 *     ReorderMenuItemsRequest:
 *       type: object
 *       required: [order]
 *       properties:
 *         order:
 *           type: array
 *           items:
 *             type: object
 *             required: [itemId, order]
 *             properties:
 *               itemId: { type: string }
 *               order: { type: integer, minimum: 1 }
 *
 *     MenuStatusRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [draft, published, blocked]
 */

/**
 * @swagger
 * /menus:
 *   post:
 *     tags: [Menus]
 *     operationId: createMenu
 *     summary: Create menu
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateMenuRequest"
 *     responses:
 *       201:
 *         description: Menu created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MenuResponse"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       409: { $ref: "#/components/responses/Conflict" }
 *
 * /menus/restaurant/{restaurantId}:
 *   get:
 *     tags: [Menus]
 *     operationId: getMenuByRestaurant
 *     summary: Get public restaurant menus
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Menus fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MenuListResponse"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *
 * /menus/deleted:
 *   get:
 *     tags: [Menus]
 *     operationId: getDeletedMenus
 *     summary: Get deleted menus
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: restaurantId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted menus fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MenuListResponse"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *
 * /menus/{menuId}:
 *   get:
 *     tags: [Menus]
 *     operationId: getMenuById
 *     summary: Get menu by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: "#/components/schemas/Menu"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *   delete:
 *     tags: [Menus]
 *     operationId: deleteMenu
 *     summary: Soft delete menu
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu soft deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/hard:
 *   delete:
 *     tags: [Menus]
 *     operationId: hardDeleteMenu
 *     summary: Permanently delete menu
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MenuResponse"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/restore:
 *   patch:
 *     tags: [Menus]
 *     operationId: restoreMenu
 *     summary: Restore soft-deleted menu
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/audit:
 *   get:
 *     tags: [Menus]
 *     operationId: getMenuAuditLogs
 *     summary: Get menu audit logs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: actorId
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Menu audit logs fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 totalPages: { type: integer }
 *                 hasPrev: { type: boolean }
 *                 hasNext: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/items:
 *   post:
 *     tags: [Menus]
 *     operationId: addMenuItems
 *     summary: Add item to menu
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AddMenuItemRequest"
 *     responses:
 *       201:
 *         description: Item created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/MenuItem"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *       409: { $ref: "#/components/responses/Conflict" }
 *
 * /menus/{menuId}/items/{itemId}:
 *   put:
 *     tags: [Menus]
 *     operationId: updateMenuItem
 *     summary: Update menu item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateMenuItemRequest"
 *     responses:
 *       200:
 *         description: Item updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/MenuItem"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *   delete:
 *     tags: [Menus]
 *     operationId: deleteMenuItem
 *     summary: Soft delete menu item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/items/{itemId}/availability:
 *   patch:
 *     tags: [Menus]
 *     operationId: toggleItemAvailability
 *     summary: Toggle item availability
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item availability toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 isAvailable: { type: boolean }
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/reorder:
 *   put:
 *     tags: [Menus]
 *     operationId: reorderMenuItems
 *     summary: Reorder menu items
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ReorderMenuItemsRequest"
 *     responses:
 *       200:
 *         description: Reorder completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *
 * /menus/{menuId}/status:
 *   patch:
 *     tags: [Menus]
 *     operationId: updateMenuStatus
 *     summary: Update menu status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/MenuStatusRequest"
 *     responses:
 *       200:
 *         description: Menu status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MenuResponse"
 *       400: { $ref: "#/components/responses/BadRequest" }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 */
