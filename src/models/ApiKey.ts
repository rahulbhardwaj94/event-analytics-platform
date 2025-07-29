import mongoose, { Schema, Document, Model } from 'mongoose';
import { IApiKey } from '../types';
import crypto from 'crypto';

export interface IApiKeyDocument extends Omit<IApiKey, 'id'>, Document {
  generateKey(): string;
  validateKey(key: string): boolean;
  updateLastUsed(): Promise<IApiKeyDocument>;
  hasPermission(permission: string): boolean;
}

export interface IApiKeyModel extends Model<IApiKeyDocument> {
  findByKey(key: string): Promise<IApiKeyDocument | null>;
  findByOrgAndProject(orgId: string, projectId?: string): Promise<IApiKeyDocument[]>;
  createApiKey(data: {
    name: string;
    orgId: string;
    projectId?: string;
    permissions?: string[];
  }): Promise<IApiKeyDocument>;
}

const ApiKeySchema = new Schema<IApiKeyDocument>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  orgId: {
    type: String,
    required: true,
    index: true,
  },
  projectId: {
    type: String,
    index: true,
  },
  permissions: {
    type: [String],
    default: ['read', 'write'],
    enum: ['read', 'write', 'admin', 'analytics'],
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastUsed: {
    type: Date,
  },
}, {
  timestamps: true,
  collection: 'api_keys',
});

// Indexes
ApiKeySchema.index({ orgId: 1, projectId: 1 });
ApiKeySchema.index({ key: 1, isActive: 1 });

// Pre-save middleware
ApiKeySchema.pre('save', function(next) {
  // Generate key if not provided
  if (!this.key) {
    this.key = this.generateKey();
  }
  
  next();
});

// Static methods
ApiKeySchema.statics.findByKey = function(key: string) {
  return this.findOne({ key, isActive: true });
};

ApiKeySchema.statics.findByOrgAndProject = function(orgId: string, projectId?: string) {
  const query: any = { orgId, isActive: true };
  if (projectId) {
    query.projectId = projectId;
  }
  return this.find(query);
};

ApiKeySchema.statics.createApiKey = function(data: {
  name: string;
  orgId: string;
  projectId?: string;
  permissions?: string[];
}) {
  return this.create({
    ...data,
    key: crypto.randomBytes(32).toString('hex'),
  });
};

// Instance methods
ApiKeySchema.methods.generateKey = function(): string {
  return crypto.randomBytes(32).toString('hex');
};

ApiKeySchema.methods.validateKey = function(key: string): boolean {
  return this.key === key && this.isActive;
};

ApiKeySchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

ApiKeySchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission) || this.permissions.includes('admin');
};

export const ApiKey = mongoose.model<IApiKeyDocument, IApiKeyModel>('ApiKey', ApiKeySchema); 