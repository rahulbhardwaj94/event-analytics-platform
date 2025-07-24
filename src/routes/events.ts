import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Joi from 'joi';
import { processEvent, processEventBatch } from '../services/eventProcessor';
import { authenticateApiKey, requireOrgAccess, requireProjectAccess } from '../middleware/auth';
import { eventIngestionLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { IAuthRequest, IEvent, IApiResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Event validation schema
const eventSchema = Joi.object({
  userId: Joi.string().required().min(1).max(255),
  eventName: Joi.string().required().min(1).max(255),
  timestamp: Joi.date().optional().default(() => new Date()),
  properties: Joi.object().optional().default({}),
  sessionId: Joi.string().optional().max(255),
  pageUrl: Joi.string().optional().uri().max(1000),
  userAgent: Joi.string().optional().max(500),
  ipAddress: Joi.string().optional().ip(),
  orgId: Joi.string().optional(),
  projectId: Joi.string().optional(),
});

const batchSchema = Joi.object({
  events: Joi.array().items(eventSchema).min(1).max(1000).required(),
});

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Ingest events (single or batch)
 *     description: Accepts single events or batches of up to 1,000 events
 *     tags: [Events]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Event'
 *               - $ref: '#/components/schemas/EventBatch'
 *     responses:
 *       200:
 *         description: Events processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 processed:
 *                   type: number
 *                 duplicates:
 *                   type: number
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  eventIngestionLimiter,
  [
    body().custom((value, { req }) => {
      // Check if it's a single event or batch
      if (Array.isArray(value)) {
        // Batch processing
        const { error } = batchSchema.validate({ events: value });
        if (error) {
          throw new Error(`Batch validation failed: ${error.details[0].message}`);
        }
        
        if (value.length > 1000) {
          throw new Error('Batch size cannot exceed 1,000 events');
        }
        
        req.body = { events: value };
      } else {
        // Single event
        const { error } = eventSchema.validate(value);
        if (error) {
          throw new Error(`Event validation failed: ${error.details[0].message}`);
        }
        
        req.body = value;
      }
      return true;
    }),
  ],
  asyncHandler(async (req: IAuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { orgId, projectId } = req.user!;
    let processed = 0;
    let duplicates = 0;

    try {
      if (Array.isArray(req.body.events)) {
        // Batch processing
        const events = req.body.events.map((event: any) => ({
          ...event,
          orgId,
          projectId,
        }));

        logger.info(`Processing batch of ${events.length} events`, {
          orgId,
          projectId,
          batchSize: events.length,
        });

        await processEventBatch(events, orgId, projectId);
        processed = events.length;
      } else {
        // Single event processing
        const event = {
          ...req.body,
          orgId,
          projectId,
        };

        logger.info('Processing single event', {
          orgId,
          projectId,
          eventName: event.eventName,
          userId: event.userId,
        });

        await processEvent(event, orgId, projectId);
        processed = 1;
      }

      const response: IApiResponse = {
        success: true,
        message: 'Events processed successfully',
        data: {
          processed,
          duplicates,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error processing events:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to process events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /events/summary:
 *   get:
 *     summary: Get event summary
 *     description: Get summary statistics for events
 *     tags: [Events]
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
 *         description: Event summary retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/summary',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { orgId, projectId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    try {
      const { getEventSummary } = await import('../services/analyticsService');
      const summary = await getEventSummary(orgId, projectId, start, end);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error getting event summary:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get event summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /events/realtime:
 *   get:
 *     summary: Get real-time event count
 *     description: Get current event count for real-time monitoring
 *     tags: [Events]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Real-time count retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/realtime',
  authenticateApiKey,
  requireOrgAccess,
  requireProjectAccess,
  asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { orgId, projectId } = req.user!;

    try {
      const { getRedisClient } = await import('../config/redis');
      const redis = getRedisClient();
      
      const totalCount = await redis.get(`events:${orgId}:${projectId}:count`) || '0';
      
      res.status(200).json({
        success: true,
        data: {
          totalEvents: parseInt(totalCount),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting real-time count:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time count',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router; 