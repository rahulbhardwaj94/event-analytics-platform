# Event Analytics Platform

A robust, scalable event analytics platform with real-time and historical data processing capabilities.

## 🚀 Quick Start with Docker

The easiest way to run the entire application is using Docker Compose. This will start all services including the frontend, backend API, MongoDB database, and Redis cache.

### Prerequisites

- **Docker**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Docker Compose**: Usually included with Docker Desktop

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd event-analytics-platform
```

### Step 2: Start All Services

```bash
# Start all services in detached mode
docker compose up -d

# Or start with logs visible (for debugging)
docker compose up
```

### Step 3: Verify Services Are Running

```bash
# Check status of all containers
docker compose ps

# View logs from all services
docker compose logs

# View logs from specific service
docker compose logs event-analytics-api
docker compose logs event-analytics-frontend
docker compose logs mongodb
docker compose logs redis
```

## 🌐 Access Points

Once the application is running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend Application** | http://localhost | React dashboard |
| **Backend API** | http://localhost:3000 | REST API server |
| **API Documentation** | http://localhost:3000/api-docs | Swagger documentation |
| **Health Check** | http://localhost:3000/health | API health status |
| **MongoDB Express** | http://localhost:8081 | Database management (dev only) |
| **Redis Commander** | http://localhost:8082 | Redis management (dev only) |

## 🔑 Default Credentials

- **API Key**: `sample-api-key-789`
- **Organization ID**: `sample-org-123`
- **Project ID**: `sample-project-456`

## 🛠️ Development Mode

To run with development tools (MongoDB Express and Redis Commander):

```bash
docker compose --profile dev up -d
```

## 📊 Services Overview

The application consists of the following services:

| Service | Port | Description |
|---------|------|-------------|
| `event-analytics-api` | 3000 | Backend API server (Node.js/Express) |
| `event-analytics-frontend` | 80 | React frontend application |
| `mongodb` | 27017 | MongoDB database |
| `redis` | 6379 | Redis cache and queue |
| `mongo-express` | 8081 | MongoDB management interface (dev only) |
| `redis-commander` | 8082 | Redis management interface (dev only) |

## 🔧 Docker Commands Reference

### Basic Operations

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (deletes all data)
docker compose down -v

# Restart all services
docker compose restart

# Restart specific service
docker compose restart event-analytics-api
```

### Building and Rebuilding

```bash
# Build all images
docker compose build

# Build specific service
docker compose build event-analytics-api

# Rebuild without cache
docker compose build --no-cache

# Pull latest images
docker compose pull
```

### Logs and Monitoring

```bash
# View all logs
docker compose logs

# View logs from specific service
docker compose logs event-analytics-api

# Follow logs in real-time
docker compose logs -f

# Follow logs from specific service
docker compose logs -f event-analytics-api

# View last N lines
docker compose logs --tail=50 event-analytics-api
```

### Health Checks

```bash
# Check service status
docker compose ps

# Check health of specific service
docker compose ps event-analytics-api

# Test API health
curl http://localhost:3000/health

# Test frontend health
curl http://localhost/health
```

### Database Operations

```bash
# Connect to MongoDB
docker exec -it event-analytics-mongodb mongosh --username admin --password password123 --authenticationDatabase admin event_analytics

# View API keys in database
docker exec -it event-analytics-mongodb mongosh --username admin --password password123 --authenticationDatabase admin event_analytics --eval "db.api_keys.find().pretty()"

# Connect to Redis
docker exec -it event-analytics-redis redis-cli
```

## 🧪 Testing the Application

### Test API Endpoints

```bash
# Test health check
curl http://localhost:3000/health

# Test API authentication
curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/events/summary

# Test event creation
curl -X POST -H "X-API-Key: sample-api-key-789" -H "Content-Type: application/json" \
  -d '{"userId":"user123","eventName":"page_view","properties":{"pageUrl":"/home"}}' \
  http://localhost:3000/api/v1/events

# Test funnels endpoint
curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/funnels

# Test metrics endpoint
curl -H "X-API-Key: sample-api-key-789" http://localhost:3000/api/v1/metrics/summary
```

### Test Frontend

```bash
# Check if frontend is serving HTML
curl http://localhost

# Check frontend health
curl http://localhost/health
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Services Not Starting

```bash
# Check if ports are already in use
lsof -i :3000
lsof -i :80
lsof -i :27017
lsof -i :6379

# Kill processes using the ports
sudo kill -9 <PID>
```

#### 2. API Key Authentication Failing

```bash
# Check if API key exists in database
docker exec -it event-analytics-mongodb mongosh --username admin --password password123 --authenticationDatabase admin event_analytics --eval "db.api_keys.find().pretty()"

# If no API key exists, restart with fresh volumes
docker compose down -v
docker compose up -d
```

#### 3. Frontend Not Loading

```bash
# Check frontend logs
docker compose logs event-analytics-frontend

# Check if nginx is running
docker exec -it event-analytics-frontend nginx -t

# Restart frontend service
docker compose restart event-analytics-frontend
```

#### 4. Database Connection Issues

```bash
# Check MongoDB logs
docker compose logs mongodb

# Test MongoDB connection
docker exec -it event-analytics-mongodb mongosh --username admin --password password123 --authenticationDatabase admin --eval "db.adminCommand('ping')"

# Check if MongoDB is ready
docker compose ps mongodb
```

#### 5. Redis Connection Issues

```bash
# Check Redis logs
docker compose logs redis

# Test Redis connection
docker exec -it event-analytics-redis redis-cli ping

# Check if Redis is ready
docker compose ps redis
```

#### 6. Container Health Issues

```bash
# Check all container health status
docker compose ps

# If containers are unhealthy, check logs
docker compose logs --tail=50

# Restart unhealthy containers
docker compose restart
```

### Debugging Commands

```bash
# Enter a running container
docker exec -it event-analytics-api sh
docker exec -it event-analytics-frontend sh
docker exec -it event-analytics-mongodb mongosh
docker exec -it event-analytics-redis redis-cli

# Check container resource usage
docker stats

# Check container details
docker inspect event-analytics-api

# View container environment variables
docker exec event-analytics-api env
```

### Complete Reset

If you need to completely reset the application:

```bash
# Stop all containers and remove volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# Remove all containers and networks
docker system prune -a

# Rebuild and start fresh
docker compose build --no-cache
docker compose up -d
```

## 📚 API Endpoints

The API is available at `/api/v1` and includes:

- `/events` - Event tracking and retrieval
- `/funnels` - Funnel analysis
- `/retention` - User retention analysis
- `/metrics` - General metrics and analytics
- `/users` - User journey and analysis
- `/auth` - Authentication endpoints

### Example API Usage

```bash
# Send an event
curl -X POST -H "X-API-Key: sample-api-key-789" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "eventName": "page_view",
    "properties": {
      "pageUrl": "/home",
      "referrer": "google.com"
    }
  }' \
  http://localhost:3000/api/v1/events

# Get events summary
curl -H "X-API-Key: sample-api-key-789" \
  http://localhost:3000/api/v1/events/summary

# Create a funnel
curl -X POST -H "X-API-Key: sample-api-key-789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-commerce Funnel",
    "steps": [
      {"eventName": "page_view"},
      {"eventName": "add_to_cart"},
      {"eventName": "checkout_start"},
      {"eventName": "purchase"}
    ]
  }' \
  http://localhost:3000/api/v1/funnels
```

## 🏗️ Architecture

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache/Queue**: Redis with Bull queue
- **Reverse Proxy**: Nginx
- **Containerization**: Docker with Docker Compose

## ✨ Features

- Real-time event tracking
- Funnel analysis
- User retention analysis
- User journey tracking
- API rate limiting
- Authentication with API keys
- Real-time WebSocket updates
- Comprehensive logging
- Health monitoring
- Scalable architecture

## 🔄 Stopping the Application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (this will delete all data)
docker compose down -v

# Stop and remove images
docker compose down --rmi all
```

## 📝 Notes

- The application uses persistent volumes for MongoDB and Redis data
- All services include health checks for monitoring
- The frontend proxies API requests to the backend
- Default API key is automatically created during first startup
- Development tools (MongoDB Express, Redis Commander) are available with `--profile dev`

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs: `docker compose logs`
3. Verify all services are running: `docker compose ps`
4. Test the health endpoints
5. Check the API documentation at http://localhost:3000/api-docs 