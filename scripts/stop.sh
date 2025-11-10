#!/bin/bash

# Trading Llama AI - Stop Script
# This script stops the application gracefully

set -e

echo "🛑 Stopping Trading Llama AI..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Stop containers
docker-compose stop

echo "✅ Trading Llama AI has been stopped"
echo ""
echo "📝 To start again: ./scripts/start.sh"
echo "📝 To remove containers: docker-compose down"
