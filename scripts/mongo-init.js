// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts

print('Starting MongoDB initialization...');

// Switch to the event_analytics database
db = db.getSiblingDB('event_analytics');

// Create collections with proper indexes
print('Creating collections and indexes...');

// Events collection
db.createCollection('events');
db.events.createIndex({ "orgId": 1, "projectId": 1, "timestamp": -1 });
db.events.createIndex({ "orgId": 1, "projectId": 1, "eventType": 1, "timestamp": -1 });
db.events.createIndex({ "orgId": 1, "projectId": 1, "userId": 1, "timestamp": -1 });
db.events.createIndex({ "orgId": 1, "projectId": 1, "sessionId": 1, "timestamp": -1 });
db.events.createIndex({ "orgId": 1, "projectId": 1, "properties.source": 1, "timestamp": -1 });
db.events.createIndex({ "orgId": 1, "projectId": 1, "properties.page": 1, "timestamp": -1 });
db.events.createIndex({ "orgId": 1, "projectId": 1, "properties.action": 1, "timestamp": -1 });

// Funnels collection
db.createCollection('funnels');
db.funnels.createIndex({ "orgId": 1, "projectId": 1 });
db.funnels.createIndex({ "orgId": 1, "projectId": 1, "name": 1 });

// API Keys collection
db.createCollection('api_keys');
db.api_keys.createIndex({ "key": 1 }, { unique: true });
db.api_keys.createIndex({ "orgId": 1, "projectId": 1 });

// Create a default API key for testing
print('Creating default API key...');
db.api_keys.insertOne({
  key: "sample-api-key-789",
  orgId: "sample-org-123",
  projectId: "sample-project-456",
  name: "Default API Key",
  permissions: ["read", "write"],
  rateLimit: {
    windowMs: 900000, // 15 minutes
    maxRequests: 1000
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create a sample organization
print('Creating sample organization...');
db.createCollection('organizations');
db.organizations.insertOne({
  _id: "sample-org-123",
  name: "Sample Organization",
  slug: "sample-org",
  settings: {
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD"
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create a sample project
print('Creating sample project...');
db.createCollection('projects');
db.projects.insertOne({
  _id: "sample-project-456",
  orgId: "sample-org-123",
  name: "Sample Project",
  slug: "sample-project",
  settings: {
    trackingEnabled: true,
    sessionTimeout: 1800000 // 30 minutes
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create indexes for organizations and projects
db.organizations.createIndex({ "slug": 1 }, { unique: true });
db.projects.createIndex({ "orgId": 1, "slug": 1 }, { unique: true });

print('MongoDB initialization completed successfully!');
print('Default API Key: sample-api-key-789');
print('Sample Organization ID: sample-org-123');
print('Sample Project ID: sample-project-456'); 