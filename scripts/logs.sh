#!/bin/bash

# Trading Llama AI - Logs Viewer Script
# This script displays application logs

set -e

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Parse arguments
FOLLOW=false
TAIL=100

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--tail)
            TAIL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [-f|--follow] [-n|--tail NUMBER]"
            exit 1
            ;;
    esac
done

# Display logs
if [ "$FOLLOW" = true ]; then
    echo "📋 Following logs (Ctrl+C to exit)..."
    docker-compose logs -f --tail="$TAIL"
else
    echo "📋 Displaying last $TAIL lines of logs..."
    docker-compose logs --tail="$TAIL"
fi
