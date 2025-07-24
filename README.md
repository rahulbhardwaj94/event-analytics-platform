# Event Analytics Platform

A robust, scalable backend service for event analytics with real-time and historical data processing. Built with TypeScript, Node.js, Express, MongoDB, and Redis.

## 🚀 Features

### Core Analytics
- **Event Ingestion**: High-frequency event processing with batching and deduplication
- **Funnel Analysis**: Track user conversion paths with step-by-step drop-off analysis
- **Retention Analytics**: Cohort-based retention analysis with customizable time periods
- **User Journey Tracking**: Complete event timeline for individual users
- **Real-time Metrics**: Time-bucketed event counts and unique user analytics

### Technical Features
- **Multi-tenancy**: Organization and project-based data isolation
- **API Key Authentication**: Secure API key-based authentication system
- **Rate Limiting**: Configurable rate limiting per API key
- **Caching**: Redis-based caching for analytics queries
- **Background Processing**: Bull queue for async event processing
- **Real-time Updates**: WebSocket support for live event streaming
- **Comprehensive Logging**: Structured logging with Winston
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

## 🏗️ Architecture

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   WebSocket     │    │   API Gateway   │
│                 │    │   Connections   │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Express API   │
                    │   Server        │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Buffer  │    │   Bull Queue    │    │   Redis Cache   │
│   (In-Memory)   │    │   (Background)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MongoDB       │
                    │   (Primary DB)  │
                    └─────────────────┘
```

### Data Flow
1. **Event Ingestion**: Events are received via REST API, validated, and buffered
2. **Deduplication**: Events are deduplicated using Redis cache
3. **Background Processing**: Events are processed asynchronously via Bull queue
4. **Storage**: Events are stored in MongoDB with optimized indexes
5. **Analytics**: Analytics queries use MongoDB aggregation pipelines with Redis caching
6. **Real-time**: WebSocket connections provide live event updates

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- Redis 6.0+
- npm or yarn

## 🛠️ Installation

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-analytics-platform
   ```

2. **Start the entire stack with Docker Compose**
   ```bash
   # Start all services (API, MongoDB, Redis)
   docker-compose up -d
   
   # Start with development tools (MongoDB Express, Redis Commander)
   docker-compose --profile dev up -d
   ```

3. **Check if services are running**
   ```bash
   docker-compose ps
   ```

4. **View logs**
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View specific service logs
   docker-compose logs -f event-analytics-api
   ```

5. **Test the API**
   ```bash
   # Using the sample API key
   curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/events/summary
   ```

6. **Access development tools** (if using --profile dev):
   - MongoDB Express: http://localhost:8081 (admin/password123)
   - Redis Commander: http://localhost:8082

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-analytics-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   HOST=localhost

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/event_analytics

   # Redis Configuration
   REDIS_URL=redis://localhost:6379

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```

4. **Setup database and indexes**
   ```bash
   npm run setup
   ```

5. **Seed sample data (optional)**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## 📚 API Documentation

Once the server is running, visit `http://localhost:3000/api-docs` for interactive API documentation.

### Authentication

All API requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/events/summary
```

### Core Endpoints

#### Event Ingestion
```bash
# Single event
POST /api/v1/events
{
  "userId": "user123",
  "eventName": "page_view",
  "properties": {
    "pageUrl": "/home",
    "referrer": "google.com"
  }
}

# Batch events (up to 1,000)
POST /api/v1/events
[
  {
    "userId": "user123",
    "eventName": "page_view",
    "timestamp": "2024-01-01T10:00:00Z"
  },
  {
    "userId": "user123", 
    "eventName": "button_click",
    "timestamp": "2024-01-01T10:01:00Z"
  }
]
```

#### Funnel Analytics
```bash
# Create funnel
POST /api/v1/funnels
{
  "name": "E-commerce Funnel",
  "steps": [
    { "eventName": "page_view" },
    { "eventName": "add_to_cart" },
    { "eventName": "checkout_start" },
    { "eventName": "purchase" }
  ]
}

# Get funnel analytics
GET /api/v1/funnels/{funnelId}/analytics?startDate=2024-01-01&endDate=2024-01-31
```

#### Retention Analytics
```bash
# Get retention data
GET /api/v1/retention?cohort=signup&days=7&startDate=2024-01-01&endDate=2024-01-31
```

#### Event Metrics
```bash
# Get time-bucketed metrics
GET /api/v1/metrics?event=page_view&interval=daily&startDate=2024-01-01&endDate=2024-01-31
```

#### User Journey
```bash
# Get user journey
GET /api/v1/users/{userId}/journey?startDate=2024-01-01&endDate=2024-01-31
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### API Tests
```bash
# Using curl examples
curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/events/summary

curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/metrics?event=page_view&interval=daily

curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/retention?cohort=signup&days=7
```

## 📊 Database Schema

### Events Collection
```javascript
{
  _id: ObjectId,
  userId: String,           // Required, indexed
  eventName: String,        // Required, indexed
  timestamp: Date,          // Required, indexed
  orgId: String,           // Required, indexed
  projectId: String,       // Required, indexed
  properties: Object,      // Optional, flexible schema
  sessionId: String,       // Optional, indexed
  pageUrl: String,         // Optional, indexed
  userAgent: String,       // Optional
  ipAddress: String,       // Optional
  createdAt: Date,         // Auto-generated
  updatedAt: Date          // Auto-generated
}
```

### Funnels Collection
```javascript
{
  _id: ObjectId,
  name: String,            // Required
  steps: [                 // Required, min 2 steps
    {
      eventName: String,   // Required
      filters: Object,     // Optional
      timeWindow: Number   // Optional, seconds
    }
  ],
  orgId: String,          // Required, indexed
  projectId: String,      // Required, indexed
  createdAt: Date,        // Auto-generated
  updatedAt: Date         // Auto-generated
}
```

### API Keys Collection
```javascript
{
  _id: ObjectId,
  key: String,            // Required, unique, indexed
  name: String,           // Required
  orgId: String,          // Required, indexed
  projectId: String,      // Optional, indexed
  permissions: [String],  // Array of permissions
  isActive: Boolean,      // Default: true
  lastUsed: Date,         // Auto-updated
  createdAt: Date,        // Auto-generated
  updatedAt: Date         // Auto-generated
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/event_analytics` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT secret key | Required |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `EVENT_BATCH_SIZE` | Max events per batch | `1000` |
| `EVENT_BUFFER_TIMEOUT_MS` | Buffer flush timeout | `5000` |

### Performance Tuning

#### MongoDB Indexes
The application creates optimized indexes for:
- Time-series queries (`timestamp`, `orgId`, `projectId`)
- User analytics (`userId`, `orgId`, `projectId`)
- Event filtering (`eventName`, `orgId`, `projectId`)
- Session tracking (`sessionId`, `orgId`, `projectId`)

#### Redis Caching
- Query results cached with configurable TTL
- Event deduplication cache (24-hour TTL)
- Rate limiting storage
- Real-time counters

## 🚀 Deployment

### Docker Deployment

The project includes a complete Docker setup with multi-stage builds for optimal production images.

#### Using Docker Compose (Recommended)
```bash
# Production deployment
docker-compose up -d

# Scale the API service
docker-compose up -d --scale event-analytics-api=3
```

#### Manual Docker Build
```bash
# Build the image
docker build -t event-analytics-api .

# Run the container
docker run -d \
  --name event-analytics-api \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://your-mongodb:27017/event_analytics \
  -e REDIS_URL=redis://your-redis:6379 \
  event-analytics-api
```

#### Docker Image Features
- **Multi-stage build** for optimized image size
- **Alpine Linux** base for security and size
- **Non-root user** for security
- **Health checks** for monitoring
- **Latest Node.js 20** LTS version

### Production Considerations
1. **Environment Variables**: Set all required environment variables
2. **Database**: Use MongoDB Atlas or managed MongoDB service
3. **Redis**: Use Redis Cloud or managed Redis service
4. **Load Balancer**: Use nginx or cloud load balancer
5. **Monitoring**: Implement health checks and monitoring
6. **Backup**: Regular database backups
7. **SSL**: Use HTTPS in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the logs for debugging information

## 🔮 Roadmap

- [ ] Kafka integration for high-throughput event streaming
- [ ] Advanced segmentation and cohort analysis
- [ ] A/B testing framework
- [ ] Machine learning insights
- [ ] Real-time dashboard
- [ ] Data export capabilities
- [ ] Advanced user properties and traits
- [ ] Integration with popular analytics tools 