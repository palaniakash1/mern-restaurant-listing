import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { can } from '../utils/policy.js';
import jwtRotationService from '../services/jwtRotation.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/jwt/keys:
 *   get:
 *     summary: Get JWT key metadata
 *     description: Retrieve information about all JWT keys for monitoring and debugging
 *     tags: [Admin - JWT Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: JWT key metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentKeyId:
 *                       type: string
 *                       description: The currently active key ID
 *                     totalKeys:
 *                       type: integer
 *                       description: Total number of keys
 *                     activeKeys:
 *                       type: integer
 *                       description: Number of active keys
 *                     keys:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           kid:
 *                             type: string
 *                             description: Key ID
 *                           active:
 *                             type: boolean
 *                             description: Whether the key is active
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             description: Key creation timestamp
 *                           expires_at:
 *                             type: string
 *                             format: date-time
 *                             description: Key expiration timestamp
 *                           algorithm:
 *                             type: string
 *                             description: JWT algorithm used
 *       403:
 *         description: Forbidden - User does not have admin privileges
 */
router.get(
  '/keys',
  verifyToken,
  can('manageJwtKeys', 'admin'),
  async (req, res, next) => {
    try {
      const metadata = jwtRotationService.getKeyMetadata();

      res.status(200).json({
        success: true,
        data: metadata
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/jwt/rotate:
 *   post:
 *     summary: Manually rotate JWT keys
 *     description: Force immediate rotation of JWT keys (emergency key rotation)
 *     tags: [Admin - JWT Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: JWT key rotated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   properties:
 *                     newKeyId:
 *                       type: string
 *                       description: The new active key ID
 *       403:
 *         description: Forbidden - User does not have admin privileges
 */
router.post(
  '/rotate',
  verifyToken,
  can('manageJwtKeys', 'admin'),
  async (req, res, next) => {
    try {
      const result = await jwtRotationService.rotateKeyManually();

      res.status(200).json({
        success: true,
        message: 'JWT key rotated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/jwt/revoke/{kid}:
 *   post:
 *     summary: Revoke a specific JWT key
 *     description: Revoke a specific JWT key by its ID (emergency key revocation)
 *     tags: [Admin - JWT Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kid
 *         required: true
 *         schema:
 *           type: string
 *         description: The key ID to revoke
 *     responses:
 *       200:
 *         description: JWT key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   properties:
 *                     revokedKeyId:
 *                       type: string
 *                       description: The revoked key ID
 *       400:
 *         description: Bad Request - Invalid key ID
 *       403:
 *         description: Forbidden - User does not have admin privileges
 */
router.post(
  '/revoke/:kid',
  verifyToken,
  can('manageJwtKeys', 'admin'),
  async (req, res, next) => {
    try {
      const { kid } = req.params;

      if (!kid || typeof kid !== 'string') {
        return next({ status: 400, message: 'Invalid key ID' });
      }

      const result = await jwtRotationService.revokeKey(kid);

      res.status(200).json({
        success: true,
        message: 'JWT key revoked successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/jwt/cleanup:
 *   post:
 *     summary: Clean up expired JWT keys
 *     description: Manually trigger cleanup of expired JWT keys
 *     tags: [Admin - JWT Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired keys cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Success message
 *       403:
 *         description: Forbidden - User does not have admin privileges
 */
router.post(
  '/cleanup',
  verifyToken,
  can('manageJwtKeys', 'admin'),
  async (req, res, next) => {
    try {
      await jwtRotationService.cleanupExpiredKeys();

      res.status(200).json({
        success: true,
        message: 'Expired JWT keys cleaned up successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
