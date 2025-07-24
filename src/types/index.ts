import { Request } from 'express';

// Base event interface
export interface IEvent {
  id?: string;
  userId: string;
  eventName: string;
  timestamp: Date;
  orgId: string;
  projectId: string;
  properties?: Record<string, any>;
  sessionId?: string;
  pageUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Event batch interface
export interface IEventBatch {
  events: IEvent[];
  orgId: string;
  projectId: string;
}

// Funnel step interface
export interface IFunnelStep {
  eventName: string;
  filters?: Record<string, any>;
  timeWindow?: number; // in seconds
}

// Funnel interface
export interface IFunnel {
  id?: string;
  name: string;
  steps: IFunnelStep[];
  orgId: string;
  projectId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Funnel result interface
export interface IFunnelResult {
  funnelId: string;
  funnelName: string;
  steps: Array<{
    eventName: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  totalUsers: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Retention interface
export interface IRetentionQuery {
  cohort: string;
  days: number;
  orgId: string;
  projectId: string;
  startDate?: Date;
  endDate?: Date;
}

// Retention result interface
export interface IRetentionResult {
  cohort: string;
  cohortSize: number;
  retentionData: Array<{
    day: number;
    retainedUsers: number;
    retentionRate: number;
  }>;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Metrics query interface
export interface IMetricsQuery {
  event: string;
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  orgId: string;
  projectId: string;
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, any>;
}

// Metrics result interface
export interface IMetricsResult {
  event: string;
  interval: string;
  data: Array<{
    timestamp: Date;
    count: number;
    uniqueUsers: number;
  }>;
  totalCount: number;
  totalUniqueUsers: number;
}

// User journey interface
export interface IUserJourney {
  userId: string;
  events: Array<{
    eventName: string;
    timestamp: Date;
    properties?: Record<string, any>;
  }>;
  totalEvents: number;
  firstEvent: Date;
  lastEvent: Date;
}

// Organization interface
export interface IOrganization {
  id?: string;
  name: string;
  apiKey: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Project interface
export interface IProject {
  id?: string;
  name: string;
  orgId: string;
  apiKey: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Key interface
export interface IApiKey {
  id?: string;
  key: string;
  name: string;
  orgId: string;
  projectId?: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Authentication interfaces
export interface IAuthRequest extends Request {
  user?: {
    orgId: string;
    projectId?: string;
    apiKey: string;
  };
}

// Cache interfaces
export interface ICacheOptions {
  ttl?: number;
  key?: string;
}

// Query filters interface
export interface IQueryFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  eventTypes?: string[];
  userIds?: string[];
  properties?: Record<string, any>;
  sessionIds?: string[];
}

// Pagination interface
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Response interfaces
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: IPagination;
}

// WebSocket event interfaces
export interface IWebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

// Rate limiting interface
export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

// Validation error interface
export interface IValidationError {
  field: string;
  message: string;
  value?: any;
}

// Database indexes interface
export interface IDatabaseIndex {
  fields: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
  };
} 