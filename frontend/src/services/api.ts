import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
const API_KEY = process.env.REACT_APP_API_KEY || 'sample-api-key-789';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface Event {
  userId: string;
  eventName: string;
  timestamp: string;
  properties: Record<string, any>;
}

export interface FunnelStep {
  eventName: string;
  filters?: Record<string, any>;
  timeWindow?: number;
}

export interface Funnel {
  _id?: string;
  id?: string;
  name: string;
  steps: FunnelStep[];
  orgId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelResult {
  funnelId: string;
  name: string;
  steps: Array<{
    eventName: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  totalConversion: number;
  totalDropOff: number;
}

export interface RetentionResult {
  cohort: string;
  cohortSize: number;
  retentionData: Array<{
    day: number;
    retainedUsers: number;
    retentionRate: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MetricsResult {
  event: string;
  interval: string;
  data: Array<{
    timestamp: string;
    count: number;
    uniqueUsers: number;
  }>;
  totalCount: number;
  totalUniqueUsers: number;
}

export interface UserJourney {
  userId: string;
  events: Array<{
    eventName: string;
    timestamp: string;
    properties: Record<string, any>;
  }>;
  totalEvents: number;
  firstEvent: string;
  lastEvent: string;
}

// API functions
export const apiService = {
  // Health check
  health: () => api.get('/health'),

  // Events
  getEventsSummary: (startDate?: string, endDate?: string) =>
    api.get('/events/summary', { params: { startDate, endDate } }),

  sendEvent: (event: Omit<Event, 'timestamp'>) =>
    api.post('/events', { ...event, timestamp: new Date().toISOString() }),

  sendBatchEvents: (events: Omit<Event, 'timestamp'>[]) =>
    api.post('/events', events.map(event => ({ ...event, timestamp: new Date().toISOString() }))),

  // Funnels
  getFunnels: () => api.get('/funnels'),
  
  createFunnel: (funnel: { name: string; steps: FunnelStep[] }) =>
    api.post('/funnels', funnel),

  getFunnelAnalytics: (funnelId: string, startDate?: string, endDate?: string) =>
    api.get(`/funnels/${funnelId}/analytics`, { params: { startDate, endDate } }),

  // Retention
  getRetention: (cohort: string, days: number, startDate?: string, endDate?: string) =>
    api.get('/retention', { params: { cohort, days, startDate, endDate } }),

  // Metrics
  getMetrics: (event: string, interval: string, startDate?: string, endDate?: string) =>
    api.get('/metrics', { params: { event, interval, startDate, endDate } }),

  getMetricsSummary: (startDate?: string, endDate?: string) =>
    api.get('/metrics/summary', { params: { startDate, endDate } }),

  // Users
  getUserJourney: (userId: string, startDate?: string, endDate?: string) =>
    api.get(`/users/${userId}/journey`, { params: { startDate, endDate } }),

  getUserSummary: (userId: string, startDate?: string, endDate?: string) =>
    api.get(`/users/${userId}/summary`, { params: { startDate, endDate } }),
};

export default api; 