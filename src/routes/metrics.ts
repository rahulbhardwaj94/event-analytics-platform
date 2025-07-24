import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { calculateMetrics } from '../services/analyticsService';
import { authenticateApiKey, requireOrgAccess, requireProjectAccess } from '../middleware/auth';
import { analyticsQueryLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { IAuthRequest, IMetricsQuery } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Calculate event metrics
 *     description: Get time-bucketed event counts and unique users
 *     tags: [Metrics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: event
 *         required: true
 *         schema:
 *           type: string
 *         description: Event name to analyze
 *       - in: query
 *         name: interval
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *         description: Time interval for aggregation
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
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string of additional filters
 *     responses:
 *       200:
 *         description: Metrics calculated successfully
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
 *                     event:
 *                       type: string
 *                     interval:
 *                       type: string
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           count:
 *                             type: number
 *                           uniqueUsers:
 *                             type: number
 *                     totalCount:
 *                       type: number
 *                     totalUniqueUsers:
 *                       type: number
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  analyticsQueryLimiter,
  [
    query('event').isString().trim().isLength({ min: 1, max: 255 }),
    query('interval').isIn(['hourly', 'daily', 'weekly', 'monthly']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('filters').optional().isJSON(),
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
    const { event, interval, startDate, endDate, filters } = req.query;

    try {
      let parsedFilters = {};
      if (filters) {
        try {
          parsedFilters = JSON.parse(filters as string);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid filters JSON format',
          });
        }
      }

      const query: IMetricsQuery = {
        event: event as string,
        interval: interval as 'hourly' | 'daily' | 'weekly' | 'monthly',
        orgId,
        projectId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        filters: parsedFilters,
      };

      const metrics = await calculateMetrics(query);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error calculating metrics:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to calculate metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /metrics/events:
 *   get:
 *     summary: Get available events
 *     description: Get list of available event types for metrics analysis
 *     tags: [Metrics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Available events retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/events',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;

    try {
      const { Event } = await import('../models/Event');
      
      // Get unique event names
      const events = await Event.aggregate([
        {
          $match: {
            orgId,
            projectId,
          },
        },
        {
          $group: {
            _id: '$eventName',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            lastOccurrence: { $max: '$timestamp' },
          },
        },
        {
          $project: {
            eventName: '$_id',
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            lastOccurrence: 1,
          },
        },
        { $sort: { count: -1 } },
      ]);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      logger.error('Error getting events:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /metrics/summary:
 *   get:
 *     summary: Get metrics summary
 *     description: Get summary metrics for all events
 *     tags: [Metrics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
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
 *         description: Metrics summary retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/summary',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;
    const { startDate, endDate } = req.query;

    try {
      const { getEventSummary } = await import('../services/analyticsService');
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate as string) : new Date();

      const summary = await getEventSummary(orgId, projectId, start, end);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error getting metrics summary:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router; 