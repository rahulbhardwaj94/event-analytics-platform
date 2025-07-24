import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiKey } from '../models/ApiKey';
import { authenticateApiKey, requirePermission } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { IAuthRequest } from '../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

/**
 * @swagger
 * /auth/keys:
 *   post:
 *     summary: Create API key
 *     description: Create a new API key for the organization/project
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the API key
 *               projectId:
 *                 type: string
 *                 description: Project ID (optional, defaults to org-level key)
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, admin, analytics]
 *                 description: Permissions for the API key
 *     responses:
 *       201:
 *         description: API key created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/keys',
  authenticateApiKey,
  requirePermission('admin'),
  adminLimiter,
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 }),
    body('projectId').optional().isString().trim(),
    body('permissions').optional().isArray(),
    body('permissions.*').optional().isIn(['read', 'write', 'admin', 'analytics']),
  ],
  asyncHandler(async (req: IAuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { orgId } = req.user!;
    const { name, projectId, permissions = ['read', 'write'] } = req.body;

    try {
      // Check if API key with same name already exists
      const existingKey = await ApiKey.findOne({
        name,
        orgId,
        projectId: projectId || null,
      });

      if (existingKey) {
        return res.status(409).json({
          success: false,
          error: 'API key with this name already exists',
        });
      }

      // Create new API key
      const apiKey = await ApiKey.createApiKey({
        name,
        orgId,
        projectId,
        permissions,
      });

      logger.info('API key created successfully', {
        keyId: apiKey._id,
        name,
        orgId,
        projectId,
        permissions,
      });

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: {
          id: apiKey._id,
          name: apiKey.name,
          key: apiKey.key, // Only show key on creation
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          createdAt: apiKey.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error creating API key:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to create API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /auth/keys:
 *   get:
 *     summary: Get API keys
 *     description: Get all API keys for the organization
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/keys',
  authenticateApiKey,
  requirePermission('admin'),
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId } = req.user!;

    try {
      const apiKeys = await ApiKey.findByOrgAndProject(orgId);
      
      res.status(200).json({
        success: true,
        data: apiKeys.map(key => ({
          id: key._id,
          name: key.name,
          projectId: key.projectId,
          permissions: key.permissions,
          isActive: key.isActive,
          lastUsed: key.lastUsed,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
        })),
      });
    } catch (error) {
      logger.error('Error getting API keys:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get API keys',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /auth/keys/{keyId}:
 *   get:
 *     summary: Get API key by ID
 *     description: Get details of a specific API key
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 *       404:
 *         description: API key not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/keys/:keyId',
  authenticateApiKey,
  requirePermission('admin'),
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId } = req.user!;
    const { keyId } = req.params;

    try {
      const apiKey = await ApiKey.findById(keyId);
      
      if (!apiKey || apiKey.orgId !== orgId) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: apiKey._id,
          name: apiKey.name,
          projectId: apiKey.projectId,
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          lastUsed: apiKey.lastUsed,
          createdAt: apiKey.createdAt,
          updatedAt: apiKey.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error getting API key:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /auth/keys/{keyId}:
 *   put:
 *     summary: Update API key
 *     description: Update an existing API key
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: API key updated successfully
 *       404:
 *         description: API key not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  '/keys/:keyId',
  authenticateApiKey,
  requirePermission('admin'),
  adminLimiter,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('permissions').optional().isArray(),
    body('permissions.*').optional().isIn(['read', 'write', 'admin', 'analytics']),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req: IAuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { orgId } = req.user!;
    const { keyId } = req.params;
    const updates = req.body;

    try {
      const apiKey = await ApiKey.findById(keyId);
      
      if (!apiKey || apiKey.orgId !== orgId) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      // Update API key
      Object.assign(apiKey, updates);
      await apiKey.save();

      logger.info('API key updated successfully', {
        keyId,
        orgId,
        updates,
      });

      res.status(200).json({
        success: true,
        message: 'API key updated successfully',
        data: {
          id: apiKey._id,
          name: apiKey.name,
          projectId: apiKey.projectId,
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          lastUsed: apiKey.lastUsed,
          createdAt: apiKey.createdAt,
          updatedAt: apiKey.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating API key:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /auth/keys/{keyId}:
 *   delete:
 *     summary: Delete API key
 *     description: Delete an API key
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *       404:
 *         description: API key not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  '/keys/:keyId',
  authenticateApiKey,
  requirePermission('admin'),
  adminLimiter,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId } = req.user!;
    const { keyId } = req.params;

    try {
      const apiKey = await ApiKey.findById(keyId);
      
      if (!apiKey || apiKey.orgId !== orgId) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      await ApiKey.findByIdAndDelete(keyId);

      logger.info('API key deleted successfully', {
        keyId,
        orgId,
      });

      res.status(200).json({
        success: true,
        message: 'API key deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting API key:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /auth/validate:
 *   post:
 *     summary: Validate API key
 *     description: Validate an API key and return its details
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: API key validated successfully
 *       401:
 *         description: Invalid API key
 */
router.post(
  '/validate',
  authenticateApiKey,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId, apiKey } = req.user!;

    try {
      const keyDoc = await ApiKey.findByKey(apiKey);
      
      if (!keyDoc) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          orgId: keyDoc.orgId,
          projectId: keyDoc.projectId,
          name: keyDoc.name,
          permissions: keyDoc.permissions,
          isActive: keyDoc.isActive,
          lastUsed: keyDoc.lastUsed,
        },
      });
    } catch (error) {
      logger.error('Error validating API key:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to validate API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router; 