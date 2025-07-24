import { Event } from '../models/Event';
import { Funnel } from '../models/Funnel';
import { 
  IFunnelResult, 
  IRetentionQuery, 
  IRetentionResult, 
  IMetricsQuery, 
  IMetricsResult,
  IUserJourney 
} from '../types';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redis';
import moment from 'moment';

// Cache TTL constants
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600');
const QUERY_CACHE_TTL = parseInt(process.env.QUERY_CACHE_TTL || '1800');

// Generate cache key
const generateCacheKey = (prefix: string, params: any): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
};

// Get cached result
const getCachedResult = async (key: string): Promise<any> => {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error('Error getting cached result:', error);
    return null;
  }
};

// Set cached result
const setCachedResult = async (key: string, data: any, ttl: number = CACHE_TTL): Promise<void> => {
  try {
    const redis = getRedisClient();
    await redis.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    logger.error('Error setting cached result:', error);
  }
};

// Calculate funnel analytics
export const calculateFunnel = async (
  funnelId: string,
  orgId: string,
  projectId: string,
  startDate: Date,
  endDate: Date,
  filters: any = {}
): Promise<IFunnelResult> => {
  const cacheKey = generateCacheKey('funnel', {
    funnelId,
    orgId,
    projectId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    filters: JSON.stringify(filters),
  });

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get funnel definition
    const funnel = await Funnel.findById(funnelId);
    if (!funnel || funnel.orgId !== orgId || funnel.projectId !== projectId) {
      throw new Error('Funnel not found or access denied');
    }

    const steps = funnel.steps.map(step => step.eventName);
    const stepResults: Array<{
      eventName: string;
      count: number;
      conversionRate: number;
      dropOffRate: number;
    }> = [];

    // Get funnel data
    const funnelData = await Event.getFunnelData(orgId, projectId, steps, startDate, endDate, filters);
    
    // Calculate step metrics
    let previousCount = 0;
    for (let i = 0; i < steps.length; i++) {
      const stepName = steps[i];
      const stepUsers = funnelData.filter((user: any) => 
        user.eventNames.includes(stepName)
      ).length;

      const conversionRate = previousCount > 0 ? (stepUsers / previousCount) * 100 : 100;
      const dropOffRate = previousCount > 0 ? ((previousCount - stepUsers) / previousCount) * 100 : 0;

      stepResults.push({
        eventName: stepName,
        count: stepUsers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
      });

      previousCount = stepUsers;
    }

    const result: IFunnelResult = {
      funnelId,
      funnelName: funnel.name,
      steps: stepResults,
      totalUsers: stepResults[0]?.count || 0,
      dateRange: { start: startDate, end: endDate },
    };

    // Cache result
    await setCachedResult(cacheKey, result, QUERY_CACHE_TTL);

    return result;
  } catch (error) {
    logger.error('Error calculating funnel:', error);
    throw error;
  }
};

// Calculate retention analytics
export const calculateRetention = async (
  query: IRetentionQuery
): Promise<IRetentionResult> => {
  const cacheKey = generateCacheKey('retention', {
    ...query,
    startDate: query.startDate?.toISOString(),
    endDate: query.endDate?.toISOString(),
  });

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { cohort, days, orgId, projectId, startDate, endDate } = query;
    
    // Determine date range
    const end = endDate || new Date();
    const start = startDate || moment(end).subtract(days * 2, 'days').toDate();

    // Get cohort users (users who performed the cohort event)
    const cohortUsers = await Event.aggregate([
      {
        $match: {
          orgId,
          projectId,
          eventName: cohort,
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$userId',
          firstEvent: { $min: '$timestamp' },
        },
      },
      {
        $project: {
          userId: '$_id',
          cohortDate: { $dateToString: { format: '%Y-%m-%d', date: '$firstEvent' } },
        },
      },
    ]);

    const cohortSize = cohortUsers.length;
    const retentionData: Array<{
      day: number;
      retainedUsers: number;
      retentionRate: number;
    }> = [];

    // Calculate retention for each day
    for (let day = 1; day <= days; day++) {
      const retainedUsers = await Event.aggregate([
        {
          $match: {
            orgId,
            projectId,
            userId: { $in: cohortUsers.map(u => u.userId) },
            timestamp: {
              $gte: moment(start).add(day, 'days').startOf('day').toDate(),
              $lte: moment(start).add(day, 'days').endOf('day').toDate(),
            },
          },
        },
        {
          $group: {
            _id: '$userId',
          },
        },
      ]);

      const retainedCount = retainedUsers.length;
      const retentionRate = cohortSize > 0 ? (retainedCount / cohortSize) * 100 : 0;

      retentionData.push({
        day,
        retainedUsers: retainedCount,
        retentionRate: Math.round(retentionRate * 100) / 100,
      });
    }

    const result: IRetentionResult = {
      cohort,
      cohortSize,
      retentionData,
      dateRange: { start, end },
    };

    // Cache result
    await setCachedResult(cacheKey, result, QUERY_CACHE_TTL);

    return result;
  } catch (error) {
    logger.error('Error calculating retention:', error);
    throw error;
  }
};

// Calculate event metrics
export const calculateMetrics = async (
  query: IMetricsQuery
): Promise<IMetricsResult> => {
  const cacheKey = generateCacheKey('metrics', {
    ...query,
    startDate: query.startDate?.toISOString(),
    endDate: query.endDate?.toISOString(),
    filters: JSON.stringify(query.filters),
  });

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { event, interval, orgId, projectId, startDate, endDate, filters } = query;
    
    const start = startDate || moment().subtract(30, 'days').toDate();
    const end = endDate || new Date();

    // Build match stage
    const matchStage: any = {
      orgId,
      projectId,
      eventName: event,
      timestamp: { $gte: start, $lte: end },
    };

    if (filters) {
      Object.assign(matchStage, filters);
    }

    // Build group stage based on interval
    let groupStage: any;
    switch (interval) {
      case 'hourly':
        groupStage = {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' },
          },
        };
        break;
      case 'daily':
        groupStage = {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
          },
        };
        break;
      case 'weekly':
        groupStage = {
          _id: {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' },
          },
        };
        break;
      case 'monthly':
        groupStage = {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
          },
        };
        break;
      default:
        throw new Error('Invalid interval');
    }

    const aggregation = await Event.aggregate([
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          timestamp: {
            $dateFromParts: groupStage._id,
          },
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { timestamp: 1 } },
    ]);

    // Calculate totals
    const totalCount = aggregation.reduce((sum, item) => sum + item.count, 0);
    const totalUniqueUsers = await Event.aggregate([
      { $match: matchStage },
      { $group: { _id: '$userId' } },
      { $count: 'total' },
    ]).then(result => result[0]?.total || 0);

    const result: IMetricsResult = {
      event,
      interval,
      data: aggregation.map(item => ({
        timestamp: item.timestamp,
        count: item.count,
        uniqueUsers: item.uniqueUsers,
      })),
      totalCount,
      totalUniqueUsers,
    };

    // Cache result
    await setCachedResult(cacheKey, result, QUERY_CACHE_TTL);

    return result;
  } catch (error) {
    logger.error('Error calculating metrics:', error);
    throw error;
  }
};

// Get user journey
export const getUserJourney = async (
  userId: string,
  orgId: string,
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<IUserJourney> => {
  const cacheKey = generateCacheKey('user_journey', {
    userId,
    orgId,
    projectId,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const events = await Event.getUserJourney(userId, orgId, projectId, startDate, endDate);
    
    if (events.length === 0) {
      throw new Error('No events found for user');
    }

    const result: IUserJourney = {
      userId,
      events: events.map(event => ({
        eventName: event.eventName,
        timestamp: event.timestamp,
        properties: event.properties,
      })),
      totalEvents: events.length,
      firstEvent: events[0].timestamp,
      lastEvent: events[events.length - 1].timestamp,
    };

    // Cache result (shorter TTL for user-specific data)
    await setCachedResult(cacheKey, result, 300); // 5 minutes

    return result;
  } catch (error) {
    logger.error('Error getting user journey:', error);
    throw error;
  }
};

// Get event summary
export const getEventSummary = async (
  orgId: string,
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<any> => {
  const cacheKey = generateCacheKey('event_summary', {
    orgId,
    projectId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const summary = await Event.aggregate([
      {
        $match: {
          orgId,
          projectId,
          timestamp: { $gte: startDate, $lte: endDate },
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
    ]);

    const result = {
      totalEvents: summary.reduce((sum, item) => sum + item.count, 0),
      totalUniqueUsers: await Event.aggregate([
        {
          $match: {
            orgId,
            projectId,
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: '$userId' } },
        { $count: 'total' },
      ]).then(result => result[0]?.total || 0),
      events: summary,
    };

    // Cache result
    await setCachedResult(cacheKey, result, QUERY_CACHE_TTL);

    return result;
  } catch (error) {
    logger.error('Error getting event summary:', error);
    throw error;
  }
}; 