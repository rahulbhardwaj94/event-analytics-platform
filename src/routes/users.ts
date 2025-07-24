import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { getUserJourney } from '../services/analyticsService';
import { authenticateApiKey, requireOrgAccess, requireProjectAccess } from '../middleware/auth';
import { analyticsQueryLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { IAuthRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /users/{userId}/journey:
 *   get:
 *     summary: Get user journey
 *     description: Get complete event timeline for a specific user
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get journey for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for journey
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for journey
 *     responses:
 *       200:
 *         description: User journey retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           eventName:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           properties:
 *                             type: object
 *                     totalEvents:
 *                       type: number
 *                     firstEvent:
 *                       type: string
 *                       format: date-time
 *                     lastEvent:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/:userId/journey',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  analyticsQueryLimiter,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
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
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      const journey = await getUserJourney(
        userId,
        orgId,
        projectId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: journey,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'No events found for user') {
        return res.status(404).json({
          success: false,
          error: 'User not found or no events available',
        });
      }

      logger.error('Error getting user journey:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user journey',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /users/{userId}/events:
 *   get:
 *     summary: Get user events
 *     description: Get all events for a specific user with pagination
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get events for
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of events per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: eventName
 *         schema:
 *           type: string
 *         description: Filter by specific event name
 *     responses:
 *       200:
 *         description: User events retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/:userId/events',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  analyticsQueryLimiter,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('eventName').optional().isString(),
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
    const { userId } = req.params;
    const { page = 1, limit = 50, startDate, endDate, eventName } = req.query;

    try {
      const { Event } = await import('../models/Event');
      
      // Build query
      const query: any = {
        userId,
        orgId,
        projectId,
      };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      if (eventName) {
        query.eventName = eventName;
      }

      // Get total count
      const total = await Event.countDocuments(query);
      
      // Get events with pagination
      const events = await Event.find(query)
        .sort({ timestamp: -1 })
        .skip((parseInt(page as string) - 1) * parseInt(limit as string))
        .limit(parseInt(limit as string))
        .select('-__v');

      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: events.map(event => event.toAnalyticsFormat()),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
        },
      });
    } catch (error) {
      logger.error('Error getting user events:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /users/{userId}/summary:
 *   get:
 *     summary: Get user summary
 *     description: Get summary statistics for a specific user
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get summary for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for summary
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for summary
 *     responses:
 *       200:
 *         description: User summary retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/:userId/summary',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  analyticsQueryLimiter,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
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
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      const { Event } = await import('../models/Event');
      
      // Build query
      const query: any = {
        userId,
        orgId,
        projectId,
      };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      // Get user summary
      const summary = await Event.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$eventName',
            count: { $sum: 1 },
            firstOccurrence: { $min: '$timestamp' },
            lastOccurrence: { $max: '$timestamp' },
          },
        },
        {
          $project: {
            eventName: '$_id',
            count: 1,
            firstOccurrence: 1,
            lastOccurrence: 1,
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get overall stats
      const overallStats = await Event.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            uniqueEventTypes: { $addToSet: '$eventName' },
            firstEvent: { $min: '$timestamp' },
            lastEvent: { $max: '$timestamp' },
          },
        },
        {
          $project: {
            _id: 0,
            totalEvents: 1,
            uniqueEventTypes: { $size: '$uniqueEventTypes' },
            firstEvent: 1,
            lastEvent: 1,
          },
        },
      ]);

      const result = {
        userId,
        summary: summary,
        overall: overallStats[0] || {
          totalEvents: 0,
          uniqueEventTypes: 0,
          firstEvent: null,
          lastEvent: null,
        },
      };

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting user summary:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router; 