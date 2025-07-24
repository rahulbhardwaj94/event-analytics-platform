import { connectDatabase, disconnectDatabase } from '../config/database';
import { Event, Funnel, ApiKey } from '../models';
import { logger } from '../utils/logger';
import moment from 'moment';

// Sample data
const SAMPLE_ORG_ID = 'sample-org-123';
const SAMPLE_PROJECT_ID = 'sample-project-456';
const SAMPLE_API_KEY = 'sample-api-key-789';

const SAMPLE_EVENTS = [
  'page_view',
  'button_click',
  'form_submit',
  'signup',
  'login',
  'purchase',
  'add_to_cart',
  'checkout_start',
  'payment_complete',
  'download',
];

const SAMPLE_USERS = [
  'user-001',
  'user-002',
  'user-003',
  'user-004',
  'user-005',
  'user-006',
  'user-007',
  'user-008',
  'user-009',
  'user-010',
];

const SAMPLE_PAGES = [
  '/home',
  '/products',
  '/product/123',
  '/cart',
  '/checkout',
  '/login',
  '/signup',
  '/dashboard',
  '/profile',
  '/settings',
];

async function createSampleApiKey() {
  try {
    // Check if sample API key already exists
    const existingKey = await ApiKey.findOne({ key: SAMPLE_API_KEY });
    if (existingKey) {
      logger.info('Sample API key already exists');
      return existingKey;
    }

    const apiKey = new ApiKey({
      key: SAMPLE_API_KEY,
      name: 'Sample API Key',
      orgId: SAMPLE_ORG_ID,
      projectId: SAMPLE_PROJECT_ID,
      permissions: ['read', 'write', 'admin', 'analytics'],
      isActive: true,
    });

    await apiKey.save();
    logger.info('Sample API key created successfully');
    return apiKey;
  } catch (error) {
    logger.error('Error creating sample API key:', error);
    throw error;
  }
}

async function createSampleFunnels() {
  try {
    // Check if sample funnels already exist
    const existingFunnels = await Funnel.find({ orgId: SAMPLE_ORG_ID, projectId: SAMPLE_PROJECT_ID });
    if (existingFunnels.length > 0) {
      logger.info('Sample funnels already exist');
      return existingFunnels;
    }

    const funnels = [
      {
        name: 'E-commerce Conversion Funnel',
        steps: [
          { eventName: 'page_view', filters: { pageUrl: { $regex: '/products' } } },
          { eventName: 'add_to_cart' },
          { eventName: 'checkout_start' },
          { eventName: 'payment_complete' },
        ],
        orgId: SAMPLE_ORG_ID,
        projectId: SAMPLE_PROJECT_ID,
      },
      {
        name: 'User Registration Funnel',
        steps: [
          { eventName: 'page_view', filters: { pageUrl: { $regex: '/signup' } } },
          { eventName: 'form_submit', filters: { properties: { formType: 'signup' } } },
          { eventName: 'signup' },
        ],
        orgId: SAMPLE_ORG_ID,
        projectId: SAMPLE_PROJECT_ID,
      },
    ];

    const createdFunnels = await Funnel.insertMany(funnels);
    logger.info(`Created ${createdFunnels.length} sample funnels`);
    return createdFunnels;
  } catch (error) {
    logger.error('Error creating sample funnels:', error);
    throw error;
  }
}

async function createSampleEvents() {
  try {
    // Check if sample events already exist
    const existingEvents = await Event.countDocuments({ orgId: SAMPLE_ORG_ID, projectId: SAMPLE_PROJECT_ID });
    if (existingEvents > 0) {
      logger.info(`Sample events already exist (${existingEvents} events)`);
      return;
    }

    const events = [];
    const now = new Date();
    const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

    // Generate events for each user
    for (const userId of SAMPLE_USERS) {
      let currentTime = new Date(thirtyDaysAgo);
      
      // Generate 50-200 events per user
      const eventCount = Math.floor(Math.random() * 150) + 50;
      
      for (let i = 0; i < eventCount; i++) {
        const eventName = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
        const pageUrl = SAMPLE_PAGES[Math.floor(Math.random() * SAMPLE_PAGES.length)];
        
        // Add some time progression
        currentTime = moment(currentTime).add(Math.random() * 24, 'hours').toDate();
        
        const event = {
          userId,
          eventName,
          timestamp: currentTime,
          orgId: SAMPLE_ORG_ID,
          projectId: SAMPLE_PROJECT_ID,
          properties: {
            pageUrl,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            sessionId: `session-${userId}-${Math.floor(Math.random() * 1000)}`,
            ...(eventName === 'purchase' && {
              amount: Math.floor(Math.random() * 1000) + 10,
              currency: 'USD',
              productId: `product-${Math.floor(Math.random() * 100)}`,
            }),
            ...(eventName === 'form_submit' && {
              formType: Math.random() > 0.5 ? 'signup' : 'contact',
            }),
          },
          sessionId: `session-${userId}-${Math.floor(Math.random() * 1000)}`,
          pageUrl,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        };
        
        events.push(event);
      }
    }

    // Insert events in batches
    const batchSize = 1000;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await Event.insertMany(batch, { ordered: false });
      logger.info(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`);
    }

    logger.info(`Created ${events.length} sample events`);
  } catch (error) {
    logger.error('Error creating sample events:', error);
    throw error;
  }
}

async function main() {
  try {
    logger.info('Starting Event Analytics Platform seeding...');
    
    // Connect to database
    await connectDatabase();
    
    // Create sample data
    await createSampleApiKey();
    await createSampleFunnels();
    await createSampleEvents();
    
    logger.info('🎉 Event Analytics Platform seeding completed successfully!');
    logger.info('');
    logger.info('📋 Sample Data Summary:');
    logger.info(`   Organization ID: ${SAMPLE_ORG_ID}`);
    logger.info(`   Project ID: ${SAMPLE_PROJECT_ID}`);
    logger.info(`   API Key: ${SAMPLE_API_KEY}`);
    logger.info(`   Users: ${SAMPLE_USERS.length}`);
    logger.info(`   Event Types: ${SAMPLE_EVENTS.length}`);
    logger.info('');
    logger.info('🚀 You can now test the API with the sample data!');
    logger.info('   Example: curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/events/summary');
    
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  main();
} 