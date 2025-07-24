import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

// Redis store for rate limiting
const RedisStore = require('rate-limit-redis').default;

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'); // Increased for development

// Create Redis store
const createRedisStore = () => {
  try {
    const redisClient = getRedisClient();
    return new RedisStore({
      client: redisClient,
      prefix: 'rate_limit:',
    });
  } catch (error) {
    logger.warn('Redis not available, using memory store for rate limiting');
    return undefined;
  }
};

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    // Use API key if available, otherwise use IP
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      apiKey: req.headers['x-api-key'],
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
    });
  },
});

// Stricter rate limiter for event ingestion
export const eventIngestionLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'Event ingestion rate limit exceeded. Please reduce your request frequency.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new Error('API key required for event ingestion');
    }
    return `event_ingestion:${apiKey}`;
  },
  handler: (req, res) => {
    logger.warn('Event ingestion rate limit exceeded:', {
      apiKey: req.headers['x-api-key'],
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      success: false,
      error: 'Event ingestion rate limit exceeded. Please reduce your request frequency.',
    });
  },
});

// Analytics query rate limiter
export const analyticsQueryLimiter = rateLimit({
  windowMs: 300000, // 5 minutes
  max: 2000, // 2000 requests per 5 minutes (increased for development)
  message: {
    success: false,
    error: 'Analytics query rate limit exceeded. Please reduce your request frequency.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new Error('API key required for analytics queries');
    }
    return `analytics_query:${apiKey}`;
  },
  handler: (req, res) => {
    logger.warn('Analytics query rate limit exceeded:', {
      apiKey: req.headers['x-api-key'],
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      success: false,
      error: 'Analytics query rate limit exceeded. Please reduce your request frequency.',
    });
  },
});

// Admin rate limiter (more lenient)
export const adminLimiter = rateLimit({
  windowMs: 600000, // 10 minutes
  max: 200, // 200 requests per 10 minutes
  message: {
    success: false,
    error: 'Admin API rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new Error('API key required for admin operations');
    }
    return `admin:${apiKey}`;
  },
}); 