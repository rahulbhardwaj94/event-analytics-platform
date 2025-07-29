#!/bin/bash

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
until mongosh --host mongodb --port 27017 --username admin --password password123 --authenticationDatabase admin --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "MongoDB is not ready yet. Waiting..."
  sleep 2
done
echo "MongoDB is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until redis-cli -h redis ping > /dev/null 2>&1; do
  echo "Redis is not ready yet. Waiting..."
  sleep 2
done
echo "Redis is ready!"

# Run database setup if needed
echo "Running database setup..."
node dist/scripts/setup.js || echo "Setup script not found, continuing..."

# Start the application
echo "Starting Event Analytics Platform..."
node dist/index.js 