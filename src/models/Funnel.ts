import mongoose, { Schema, Document, Model } from 'mongoose';
import { IFunnel } from '../types';

export interface IFunnelDocument extends Omit<IFunnel, 'id'>, Document {
  toAnalyticsFormat(): any;
}

export interface IFunnelModel extends Model<IFunnelDocument> {
  findByOrgAndProject(orgId: string, projectId: string): Promise<IFunnelDocument[]>;
  findByName(name: string, orgId: string, projectId: string): Promise<IFunnelDocument | null>;
}

const FunnelStepSchema = new Schema({
  eventName: {
    type: String,
    required: true,
  },
  filters: {
    type: Schema.Types.Mixed,
    default: {},
  },
  timeWindow: {
    type: Number,
    default: 0, // 0 means no time window restriction
  },
}, { _id: false });

const FunnelSchema = new Schema<IFunnelDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  steps: {
    type: [FunnelStepSchema],
    required: true,
    validate: {
      validator: function(steps: any[]) {
        return steps && steps.length >= 2;
      },
      message: 'Funnel must have at least 2 steps',
    },
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
}, {
  timestamps: true,
  collection: 'funnels',
});

// Indexes
FunnelSchema.index({ orgId: 1, projectId: 1 });
FunnelSchema.index({ orgId: 1, projectId: 1, name: 1 });

// Pre-save validation
FunnelSchema.pre('save', function(next) {
  // Validate that steps are unique
  const eventNames = this.steps.map(step => step.eventName);
  const uniqueEventNames = [...new Set(eventNames)];
  
  if (eventNames.length !== uniqueEventNames.length) {
    return next(new Error('Funnel steps must have unique event names'));
  }
  
  next();
});

// Static methods
FunnelSchema.statics.findByOrgAndProject = function(orgId: string, projectId: string) {
  return this.find({ orgId, projectId }).sort({ createdAt: -1 });
};

FunnelSchema.statics.findByName = function(name: string, orgId: string, projectId: string) {
  return this.findOne({ name, orgId, projectId });
};

// Instance methods
FunnelSchema.methods.toAnalyticsFormat = function() {
  return {
    id: this._id,
    name: this.name,
    steps: this.steps,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Funnel = mongoose.model<IFunnelDocument, IFunnelModel>('Funnel', FunnelSchema); 