import { connectDatabase, disconnectDatabase } from '../config/database';
import { setupRedis } from '../config/redis';
import { Event, Funnel, ApiKey } from '../models';
import { logger } from '../utils/logger';

async function setupDatabase() {
  try {
    logger.info('Setting up database...');
    
    // Connect to database
    await connectDatabase();
    
    // Create indexes for Event collection
    logger.info('Creating Event indexes...');
    await Event.createIndexes();
    
    // Create indexes for Funnel collection
    logger.info('Creating Funnel indexes...');
    await Funnel.createIndexes();
    
    // Create indexes for ApiKey collection
    logger.info('Creating ApiKey indexes...');
    await ApiKey.createIndexes();
    
    logger.info('Database setup completed successfully');
    
  } catch (error) {
    logger.error('Error setting up database:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

async function setupRedisConnection() {
  try {
    logger.info('Setting up Redis...');
    await setupRedis();
    logger.info('Redis setup completed successfully');
  } catch (error) {
    logger.error('Error setting up Redis:', error);
    throw error;
  }
}

async function main() {
  try {
    logger.info('Starting Event Analytics Platform setup...');
    
    // Setup database
    await setupDatabase();
    
    // Setup Redis
    await setupRedisConnection();
    
    logger.info('🎉 Event Analytics Platform setup completed successfully!');
    logger.info('You can now start the server with: npm run dev');
    
  } catch (error) {
    logger.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  main();
} 