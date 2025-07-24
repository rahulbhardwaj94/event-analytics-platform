import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Funnel } from '../models/Funnel';
import { calculateFunnel } from '../services/analyticsService';
import { authenticateApiKey, requireOrgAccess, requireProjectAccess } from '../middleware/auth';
import { analyticsQueryLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { IAuthRequest, IFunnel } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /funnels:
 *   post:
 *     summary: Create a new funnel
 *     description: Create a funnel definition for tracking user conversion paths
 *     tags: [Funnels]
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
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the funnel
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     eventName:
 *                       type: string
 *                     filters:
 *                       type: object
 *                     timeWindow:
 *                       type: number
 *     responses:
 *       201:
 *         description: Funnel created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 */
router.post(
  '/',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 }),
    body('steps').isArray({ min: 2, max: 10 }),
    body('steps.*.eventName').isString().trim().isLength({ min: 1, max: 255 }),
    body('steps.*.filters').optional().isObject(),
    body('steps.*.timeWindow').optional().isInt({ min: 0 }),
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

    const { orgId, projectId } = req.user!;
    const { name, steps } = req.body;

    try {
      // Check if funnel with same name already exists
      const existingFunnel = await Funnel.findByName(name, orgId, projectId);
      if (existingFunnel) {
        return res.status(409).json({
          success: false,
          error: 'Funnel with this name already exists',
        });
      }

      // Create new funnel
      const funnel = new Funnel({
        name,
        steps,
        orgId,
        projectId,
      });

      await funnel.save();

      logger.info('Funnel created successfully', {
        funnelId: funnel._id,
        name,
        orgId,
        projectId,
        stepsCount: steps.length,
      });

      res.status(201).json({
        success: true,
        message: 'Funnel created successfully',
        data: funnel.toAnalyticsFormat(),
      });
    } catch (error) {
      logger.error('Error creating funnel:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to create funnel',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /funnels:
 *   get:
 *     summary: Get all funnels
 *     description: Retrieve all funnels for the current organization and project
 *     tags: [Funnels]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Funnels retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;

    try {
      const funnels = await Funnel.findByOrgAndProject(orgId, projectId);
      
      res.status(200).json({
        success: true,
        data: funnels.map(funnel => funnel.toAnalyticsFormat()),
      });
    } catch (error) {
      logger.error('Error getting funnels:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get funnels',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /funnels/{funnelId}:
 *   get:
 *     summary: Get funnel by ID
 *     description: Retrieve a specific funnel by its ID
 *     tags: [Funnels]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: funnelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Funnel ID
 *     responses:
 *       200:
 *         description: Funnel retrieved successfully
 *       404:
 *         description: Funnel not found
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:funnelId',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;
    const { funnelId } = req.params;

    try {
      const funnel = await Funnel.findById(funnelId);
      
      if (!funnel || funnel.orgId !== orgId || funnel.projectId !== projectId) {
        return res.status(404).json({
          success: false,
          error: 'Funnel not found',
        });
      }

      res.status(200).json({
        success: true,
        data: funnel.toAnalyticsFormat(),
      });
    } catch (error) {
      logger.error('Error getting funnel:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get funnel',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /funnels/{funnelId}/analytics:
 *   get:
 *     summary: Calculate funnel analytics
 *     description: Calculate conversion rates and drop-offs for a funnel
 *     tags: [Funnels]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: funnelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Funnel ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analysis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analysis
 *     responses:
 *       200:
 *         description: Funnel analytics calculated successfully
 *       404:
 *         description: Funnel not found
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/:funnelId/analytics',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  analyticsQueryLimiter,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;
    const { funnelId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      // Validate funnel exists and user has access
      const funnel = await Funnel.findById(funnelId);
      if (!funnel || funnel.orgId !== orgId || funnel.projectId !== projectId) {
        return res.status(404).json({
          success: false,
          error: 'Funnel not found',
        });
      }

      // Parse date range
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate as string) : new Date();

      // Calculate funnel analytics
      const analytics = await calculateFunnel(funnelId, orgId, projectId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error calculating funnel analytics:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to calculate funnel analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /funnels/{funnelId}:
 *   put:
 *     summary: Update funnel
 *     description: Update an existing funnel definition
 *     tags: [Funnels]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: funnelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Funnel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Funnel updated successfully
 *       404:
 *         description: Funnel not found
 *       401:
 *         description: Authentication required
 */
router.put(
  '/:funnelId',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('steps').optional().isArray({ min: 2, max: 10 }),
    body('steps.*.eventName').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('steps.*.filters').optional().isObject(),
    body('steps.*.timeWindow').optional().isInt({ min: 0 }),
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

    const { orgId, projectId } = req.user!;
    const { funnelId } = req.params;
    const updates = req.body;

    try {
      const funnel = await Funnel.findById(funnelId);
      
      if (!funnel || funnel.orgId !== orgId || funnel.projectId !== projectId) {
        return res.status(404).json({
          success: false,
          error: 'Funnel not found',
        });
      }

      // Update funnel
      Object.assign(funnel, updates);
      await funnel.save();

      logger.info('Funnel updated successfully', {
        funnelId,
        orgId,
        projectId,
      });

      res.status(200).json({
        success: true,
        message: 'Funnel updated successfully',
        data: funnel.toAnalyticsFormat(),
      });
    } catch (error) {
      logger.error('Error updating funnel:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update funnel',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /funnels/{funnelId}:
 *   delete:
 *     summary: Delete funnel
 *     description: Delete a funnel definition
 *     tags: [Funnels]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: funnelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Funnel ID
 *     responses:
 *       200:
 *         description: Funnel deleted successfully
 *       404:
 *         description: Funnel not found
 *       401:
 *         description: Authentication required
 */
router.delete(
  '/:funnelId',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;
    const { funnelId } = req.params;

    try {
      const funnel = await Funnel.findById(funnelId);
      
      if (!funnel || funnel.orgId !== orgId || funnel.projectId !== projectId) {
        return res.status(404).json({
          success: false,
          error: 'Funnel not found',
        });
      }

      await Funnel.findByIdAndDelete(funnelId);

      logger.info('Funnel deleted successfully', {
        funnelId,
        orgId,
        projectId,
      });

      res.status(200).json({
        success: true,
        message: 'Funnel deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting funnel:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete funnel',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router; 