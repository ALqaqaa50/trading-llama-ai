#!/bin/bash

# Trading Llama AI - Update Script
# This script updates the application to the latest version

set -e

echo "🔄 Updating Trading Llama AI..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Pull latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Rebuild Docker images
echo "🏗️  Rebuilding Docker images..."
docker-compose build

# Restart containers
echo "🔄 Restarting containers..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to be ready..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Trading Llama AI has been updated successfully!"
    echo "📊 Access the application at: http://localhost:3000"
else
    echo "❌ Error: Container failed to start after update"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi
