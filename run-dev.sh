#!/bin/bash

# Development run script for Tribes Game
echo "Starting Tribes Game server in development mode..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set development environment variables
export NODE_ENV=development
export PORT=8000

# Surface commit metadata in the UI when running locally.
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    export TRIBES_LAST_COMMIT_DATE="${TRIBES_LAST_COMMIT_DATE:-$(git log -1 --format=%cI 2>/dev/null || true)}"
    export TRIBES_LAST_COMMIT_DATE_SHORT="${TRIBES_LAST_COMMIT_DATE_SHORT:-$(git log -1 --format=%cs 2>/dev/null || true)}"
    export TRIBES_LAST_COMMIT_HASH="${TRIBES_LAST_COMMIT_HASH:-$(git rev-parse --short HEAD 2>/dev/null || true)}"
fi

echo "🚀 Starting Tribes server on port $PORT..."
echo ""
echo "🌐 Local access:"
echo "   Game interface: http://localhost:$PORT"
echo "   Health check: http://localhost:$PORT/health"
echo ""
echo "🌐 Network access (share with others):"
echo "   Game interface: http://$(ipconfig getifaddr en0 || hostname -s | awk '{print $1}'):$PORT"
echo "   Health check: http://$(ipconfig getifaddr en0 || hostname -s | awk '{print $1}'):$PORT/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the server
node websocket-server.js