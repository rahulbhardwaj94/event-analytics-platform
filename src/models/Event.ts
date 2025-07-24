import mongoose, { Schema, Document } from 'mongoose';
import { IEvent } from '../types';

export interface IEventDocument extends IEvent, Document {}

const EventSchema = new Schema<IEventDocument>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  eventName: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now,
  },
  orgId: {
    type: String,
    required: true,
    index: true,
  },
  projectId: {
    type: String,
    required: true,
    index: true,
  },
  properties: {
    type: Schema.Types.Mixed,
    default: {},
  },
  sessionId: {
    type: String,
    index: true,
  },
  pageUrl: {
    type: String,
    index: true,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
}, {
  timestamps: true,
  collection: 'events',
});

// Compound indexes for efficient querying
EventSchema.index({ orgId: 1, projectId: 1, timestamp: -1 });
EventSchema.index({ orgId: 1, projectId: 1, eventName: 1, timestamp: -1 });
EventSchema.index({ orgId: 1, projectId: 1, userId: 1, timestamp: -1 });
EventSchema.index({ orgId: 1, projectId: 1, sessionId: 1, timestamp: -1 });

// Time-series optimization indexes
EventSchema.index({ timestamp: -1, orgId: 1, projectId: 1 });
EventSchema.index({ eventName: 1, timestamp: -1, orgId: 1, projectId: 1 });

// Text index for properties search (optional)
EventSchema.index({ 
  "properties.$**": "text" 
}, { 
  sparse: true,
  background: true 
});

// TTL index for data retention (optional - uncomment if needed)
// EventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Pre-save middleware for data validation
EventSchema.pre('save', function(next) {
  // Ensure timestamp is set
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  
  // Validate required fields
  if (!this.userId || !this.eventName || !this.orgId || !this.projectId) {
    return next(new Error('Missing required fields: userId, eventName, orgId, projectId'));
  }
  
  next();
});

// Static methods for analytics queries
EventSchema.statics.findByDateRange = function(
  orgId: string,
  projectId: string,
  startDate: Date,
  endDate: Date,
  filters: any = {}
) {
  const query: any = {
    orgId,
    projectId,
    timestamp: { $gte: startDate, $lte: endDate },
    ...filters,
  };
  
  return this.find(query).sort({ timestamp: -1 });
};

EventSchema.statics.getEventCounts = function(
  orgId: string,
  projectId: string,
  startDate: Date,
  endDate: Date,
  eventNames?: string[]
) {
  const matchStage: any = {
    orgId,
    projectId,
    timestamp: { $gte: startDate, $lte: endDate },
  };
  
  if (eventNames && eventNames.length > 0) {
    matchStage.eventName = { $in: eventNames };
  }
  
  return this.aggregate([
    { $match: matchStage },
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
};

EventSchema.statics.getUserJourney = function(
  userId: string,
  orgId: string,
  projectId: string,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {
    userId,
    orgId,
    projectId,
  };
  
  if (startDate && endDate) {
    matchStage.timestamp = { $gte: startDate, $lte: endDate };
  }
  
  return this.find(matchStage)
    .sort({ timestamp: 1 })
    .select('eventName timestamp properties');
};

EventSchema.statics.getFunnelData = function(
  orgId: string,
  projectId: string,
  steps: string[],
  startDate: Date,
  endDate: Date,
  filters: any = {}
) {
  const matchStage: any = {
    orgId,
    projectId,
    eventName: { $in: steps },
    timestamp: { $gte: startDate, $lte: endDate },
    ...filters,
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          userId: '$userId',
          eventName: '$eventName',
        },
        firstOccurrence: { $min: '$timestamp' },
      },
    },
    {
      $group: {
        _id: '$_id.userId',
        events: {
          $push: {
            eventName: '$_id.eventName',
            timestamp: '$firstOccurrence',
          },
        },
      },
    },
    {
      $project: {
        userId: '$_id',
        events: 1,
        eventNames: '$events.eventName',
      },
    },
  ]);
};

// Instance methods
EventSchema.methods.toAnalyticsFormat = function() {
  return {
    id: this._id,
    userId: this.userId,
    eventName: this.eventName,
    timestamp: this.timestamp,
    properties: this.properties,
    sessionId: this.sessionId,
    pageUrl: this.pageUrl,
  };
};

export const Event = mongoose.model<IEventDocument>('Event', EventSchema); 