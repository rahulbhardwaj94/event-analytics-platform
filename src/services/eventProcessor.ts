import { Event, IEventDocument } from '../models/Event';
import { IEvent, IEventBatch } from '../types';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redis';
import { addEventBatchToQueue } from '../config/queue';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// In-memory buffer for events
const eventBuffer = new Map<string, IEvent[]>();
const bufferTimeout = parseInt(process.env.EVENT_BUFFER_TIMEOUT_MS || '5000');
const maxBatchSize = parseInt(process.env.EVENT_BATCH_SIZE || '1000');

// Generate event ID for deduplication
const generateEventId = (event: IEvent): string => {
  const data = `${event.userId}-${event.eventName}-${event.timestamp.getTime()}-${event.orgId}-${event.projectId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Check for duplicate events
const isDuplicate = async (eventId: string, orgId: string, projectId: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const key = `event:${orgId}:${projectId}:${eventId}`;
    
    // Check if event exists in Redis cache
    const exists = await redis.exists(key);
    if (exists) {
      return true;
    }
    
    // Set cache with TTL (24 hours)
    await redis.setEx(key, 86400, '1');
    return false;
  } catch (error) {
    logger.error('Error checking duplicate event:', error);
    return false; // Allow event if Redis check fails
  }
};

// Validate event schema
const validateEvent = (event: any): IEvent => {
  const requiredFields = ['userId', 'eventName', 'orgId', 'projectId'];
  
  for (const field of requiredFields) {
    if (!event[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Ensure timestamp is a Date object
  if (event.timestamp && !(event.timestamp instanceof Date)) {
    event.timestamp = new Date(event.timestamp);
  }

  // Set default timestamp if not provided
  if (!event.timestamp) {
    event.timestamp = new Date();
  }

  return event as IEvent;
};

// Process a single event
export const processEvent = async (event: any, orgId: string, projectId: string): Promise<void> => {
  try {
    // Validate event
    const validatedEvent = validateEvent(event);
    
    // Generate event ID for deduplication
    const eventId = generateEventId(validatedEvent);
    
    // Check for duplicates
    if (await isDuplicate(eventId, orgId, projectId)) {
      logger.debug('Duplicate event detected, skipping:', { eventId, eventName: validatedEvent.eventName });
      return;
    }

    // Add to buffer
    const bufferKey = `${orgId}:${projectId}`;
    if (!eventBuffer.has(bufferKey)) {
      eventBuffer.set(bufferKey, []);
    }
    
    const buffer = eventBuffer.get(bufferKey)!;
    buffer.push(validatedEvent);

    // Process buffer if it's full
    if (buffer.length >= maxBatchSize) {
      await processBuffer(bufferKey);
    }

    // Emit real-time update via WebSocket
    emitRealtimeUpdate(validatedEvent);

  } catch (error) {
    logger.error('Error processing event:', error);
    throw error;
  }
};

// Process event batch
export const processEventBatch = async (events: IEvent[], orgId: string, projectId: string): Promise<void> => {
  try {
    logger.info(`Processing batch of ${events.length} events for org ${orgId}, project ${projectId}`);

    const validEvents: IEvent[] = [];
    const duplicates: string[] = [];

    // Validate and deduplicate events
    for (const event of events) {
      try {
        const validatedEvent = validateEvent(event);
        const eventId = generateEventId(validatedEvent);
        
        if (await isDuplicate(eventId, orgId, projectId)) {
          duplicates.push(eventId);
          continue;
        }
        
        validEvents.push(validatedEvent);
      } catch (error) {
        logger.warn('Invalid event in batch, skipping:', error);
      }
    }

    if (validEvents.length === 0) {
      logger.info('No valid events in batch');
      return;
    }

    // Save events to database
    const savedEvents = await Event.insertMany(validEvents, { ordered: false });
    
    logger.info(`Successfully saved ${savedEvents.length} events, skipped ${duplicates.length} duplicates`);

    // Update cache with saved events
    await updateEventCache(savedEvents, orgId, projectId);

    // Emit real-time updates
    for (const event of savedEvents) {
      emitRealtimeUpdate(event);
    }

  } catch (error) {
    logger.error('Error processing event batch:', error);
    throw error;
  }
};

// Process buffer for a specific org/project
const processBuffer = async (bufferKey: string): Promise<void> => {
  const buffer = eventBuffer.get(bufferKey);
  if (!buffer || buffer.length === 0) {
    return;
  }

  const [orgId, projectId] = bufferKey.split(':');
  const events = [...buffer];
  
  // Clear buffer
  eventBuffer.set(bufferKey, []);

  // Add to queue for async processing
  await addEventBatchToQueue(events, orgId, projectId);
  
  logger.info(`Added ${events.length} events to processing queue for ${bufferKey}`);
};

// Update event cache
const updateEventCache = async (events: IEventDocument[], orgId: string, projectId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    const cacheKey = `events:${orgId}:${projectId}:count`;
    
    // Update event count in cache
    await redis.incrBy(cacheKey, events.length);
    
    // Update event type counts
    for (const event of events) {
      const eventTypeKey = `events:${orgId}:${projectId}:${event.eventName}:count`;
      await redis.incr(eventTypeKey);
    }
    
  } catch (error) {
    logger.error('Error updating event cache:', error);
  }
};

// Emit real-time update via WebSocket
const emitRealtimeUpdate = (event: IEvent): void => {
  try {
    const io = (global as any).io;
    if (io) {
      const room = `${event.orgId}:${event.projectId}`;
      io.to(room).emit('event', {
        type: 'new_event',
        data: {
          eventName: event.eventName,
          userId: event.userId,
          timestamp: event.timestamp,
          properties: event.properties,
        },
        timestamp: new Date(),
      });
    }
  } catch (error) {
    logger.error('Error emitting real-time update:', error);
  }
};

// Flush all buffers (called on shutdown)
export const flushBuffers = async (): Promise<void> => {
  logger.info('Flushing event buffers...');
  
  for (const [bufferKey, events] of eventBuffer.entries()) {
    if (events.length > 0) {
      const [orgId, projectId] = bufferKey.split(':');
      await addEventBatchToQueue(events, orgId, projectId);
      logger.info(`Flushed ${events.length} events for ${bufferKey}`);
    }
  }
  
  eventBuffer.clear();
};

// Start buffer flush timer
setInterval(() => {
  for (const [bufferKey] of eventBuffer.entries()) {
    processBuffer(bufferKey).catch(error => {
      logger.error('Error processing buffer:', error);
    });
  }
}, bufferTimeout);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await flushBuffers();
});

process.on('SIGINT', async () => {
  await flushBuffers();
}); 