#!/bin/bash

# Trading Llama AI - Startup Script for RunPod
# This script starts the application using Docker Compose

set -e

echo "🚀 Starting Trading Llama AI..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️  Please edit .env file with your actual values"
        exit 1
    else
        echo "❌ Error: .env.example not found"
        exit 1
    fi
fi

# Pull latest changes (optional)
if [ "$1" == "--pull" ]; then
    echo "📥 Pulling latest changes from GitHub..."
    git pull origin main
fi

# Build and start containers
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to be ready..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Trading Llama AI is now running!"
    echo "📊 Access the application at: http://localhost:3000"
    echo ""
    echo "📝 Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop: docker-compose stop"
    echo "  - Restart: docker-compose restart"
    echo "  - Status: docker-compose ps"
else
    echo "❌ Error: Container failed to start"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi
