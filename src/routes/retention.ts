import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { calculateRetention } from '../services/analyticsService';
import { authenticateApiKey, requireOrgAccess, requireProjectAccess } from '../middleware/auth';
import { analyticsQueryLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { IAuthRequest, IRetentionQuery } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /retention:
 *   get:
 *     summary: Calculate retention analytics
 *     description: Calculate cohort retention rates for specified event and time period
 *     tags: [Retention]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: cohort
 *         required: true
 *         schema:
 *           type: string
 *         description: Event name to use as cohort definition
 *       - in: query
 *         name: days
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days to calculate retention for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for cohort analysis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for cohort analysis
 *     responses:
 *       200:
 *         description: Retention analytics calculated successfully
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
 *                     cohort:
 *                       type: string
 *                     cohortSize:
 *                       type: number
 *                     retentionData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: number
 *                           retainedUsers:
 *                             type: number
 *                           retentionRate:
 *                             type: number
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
    query('cohort').isString().trim().isLength({ min: 1, max: 255 }),
    query('days').isInt({ min: 1, max: 365 }),
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
    const { cohort, days, startDate, endDate } = req.query;

    try {
      const query: IRetentionQuery = {
        cohort: cohort as string,
        days: parseInt(days as string),
        orgId,
        projectId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const retention = await calculateRetention(query);

      res.status(200).json({
        success: true,
        data: retention,
      });
    } catch (error) {
      logger.error('Error calculating retention:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to calculate retention',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /retention/cohorts:
 *   get:
 *     summary: Get available cohorts
 *     description: Get list of available event types that can be used as cohorts
 *     tags: [Retention]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Available cohorts retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/cohorts',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res) => {
    const { orgId, projectId } = req.user!;

    try {
      const { Event } = await import('../models/Event');
      
      // Get unique event names that can be used as cohorts
      const cohorts = await Event.aggregate([
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
          },
        },
        {
          $project: {
            eventName: '$_id',
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 50 }, // Limit to top 50 events
      ]);

      res.status(200).json({
        success: true,
        data: cohorts,
      });
    } catch (error) {
      logger.error('Error getting cohorts:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get cohorts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router; 