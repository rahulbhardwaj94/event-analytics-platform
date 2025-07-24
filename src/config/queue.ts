import Queue from 'bull';
import { logger } from '../utils/logger';
import { processEventBatch } from '../services/eventProcessor';

let eventQueue: Queue.Queue | null = null;

export const setupBullQueue = async (): Promise<void> => {
  try {
    const redisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
    const prefix = process.env.BULL_PREFIX || 'event_analytics';

    // Event processing queue
    eventQueue = new Queue('event-processing', redisUrl, {
      prefix,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Process events
    eventQueue.process('process-batch', async (job) => {
      const { events, orgId, projectId } = job.data;
      logger.info(`Processing batch of ${events.length} events for org ${orgId}, project ${projectId}`);
      
      try {
        await processEventBatch(events, orgId, projectId);
        logger.info(`Successfully processed batch of ${events.length} events`);
      } catch (error) {
        logger.error('Error processing event batch:', error);
        throw error;
      }
    });

    // Queue event handlers
    eventQueue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    eventQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
    });

    eventQueue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    logger.info('Bull queue setup successfully');
    
  } catch (error) {
    logger.error('Failed to setup Bull queue:', error);
    throw error;
  }
};

export const getEventQueue = (): Queue.Queue => {
  if (!eventQueue) {
    throw new Error('Event queue not initialized');
  }
  return eventQueue;
};

export const addEventBatchToQueue = async (
  events: any[],
  orgId: string,
  projectId: string
): Promise<void> => {
  if (!eventQueue) {
    throw new Error('Event queue not initialized');
  }

  await eventQueue.add('process-batch', {
    events,
    orgId,
    projectId,
  }, {
    priority: 1,
  });
};

export const closeQueue = async (): Promise<void> => {
  if (eventQueue) {
    await eventQueue.close();
    logger.info('Event queue closed');
  }
}; 