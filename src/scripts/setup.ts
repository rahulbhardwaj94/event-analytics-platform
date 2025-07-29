import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { ApiKey } from '../models/ApiKey';

async function setupDatabase() {
  try {
    logger.info('Setting up database...');
    
    // Connect to database
    await connectDatabase();
    
    // Check if default API key exists
    const existingKey = await ApiKey.findByKey('sample-api-key-789');
    
    if (!existingKey) {
      logger.info('Creating default API key...');
      
      // Create default API key
      const defaultApiKey = new ApiKey({
        key: 'sample-api-key-789',
        orgId: 'sample-org-123',
        projectId: 'sample-project-456',
        name: 'Default API Key',
        permissions: ['read', 'write'],
        rateLimit: {
          windowMs: 900000, // 15 minutes
          maxRequests: 1000
        },
        isActive: true
      });
      
      await defaultApiKey.save();
      logger.info('Default API key created successfully');
    } else {
      logger.info('Default API key already exists');
    }
    
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      logger.info('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Setup failed:', error);
      process.exit(1);
    });
}

export { setupDatabase }; 